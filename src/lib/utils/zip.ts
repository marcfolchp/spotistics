import JSZip from 'jszip';
import { parseSpotifyExport } from '@/lib/data-processing/export';
import type { SpotifyExportTrack } from '@/types';

/**
 * Extract and parse JSON files from a ZIP archive
 * Handles nested folders and filters for audio streaming history files
 */
export async function extractJsonFromZip(zipBuffer: ArrayBuffer): Promise<SpotifyExportTrack[]> {
  const zip = new JSZip();
  const zipFile = await zip.loadAsync(zipBuffer);

  const allTracks: SpotifyExportTrack[] = [];

  // JSZip automatically includes all files regardless of folder structure
  // Filenames include full paths like "Spotify Extended Streaming History/Streaming_History_Audio_2017-2018_0.json"
  // So we can search through all files and filter by name patterns
  
  // First, log all files found in ZIP for debugging
  const allFiles = Object.keys(zipFile.files);
  console.log(`Total files in ZIP: ${allFiles.length}`);
  console.log(`Sample files: ${allFiles.slice(0, 5).join(', ')}`);
  
  // Find all JSON files in the ZIP (including nested folders)
  // Handle "Spotify Extended Streaming History" folder structure
  // Filter for audio streaming history files - Spotify exports can have different naming:
  // - Streaming_History_Audio_*.json (Extended Streaming History format)
  // - streaming_history_audio_*.json (new format)
  // - StreamingHistory_music_*.json (old format)
  // - streaming_history_*.json (variations)
  const jsonFiles = Object.keys(zipFile.files).filter((filename) => {
    const file = zipFile.files[filename];
    const lowerFilename = filename.toLowerCase();
    
    // Skip directories
    if (file.dir) return false;
    
    // Must be a JSON file
    if (!lowerFilename.endsWith('.json')) return false;
    
    // Process audio streaming history files, ignore video history
    // Look for files in "Spotify Extended Streaming History" folder or root
    // The filename includes the full path, so we check the entire path
    const isAudioHistory = (
      lowerFilename.includes('streaming_history_audio') ||
      lowerFilename.includes('streaminghistory_music') ||
      lowerFilename.includes('streaming_history') ||
      lowerFilename.includes('streaminghistory')
    );
    
    // Explicitly exclude video history
    const isVideo = lowerFilename.includes('video');
    
    return isAudioHistory && !isVideo;
  });

  console.log(`Found ${jsonFiles.length} audio history JSON files in ZIP`);
  if (jsonFiles.length > 0) {
    console.log(`Sample JSON files: ${jsonFiles.slice(0, 3).map(f => f.split('/').pop()).join(', ')}`);
  }
  
  // If no files found with expected patterns, try to find any JSON files
  if (jsonFiles.length === 0) {
    console.warn('No files found with expected patterns, searching for any JSON files...');
    const allJsonFiles = Object.keys(zipFile.files).filter((filename) => {
      const file = zipFile.files[filename];
      return !file.dir && filename.toLowerCase().endsWith('.json');
    });
    console.log(`Found ${allJsonFiles.length} total JSON files in ZIP`);
    
    // Use all JSON files if no specific pattern matches
    if (allJsonFiles.length > 0) {
      jsonFiles.push(...allJsonFiles);
    }
  }

  // Extract and parse JSON files in parallel for much better performance
  const filePromises = jsonFiles.map(async (filename) => {
    try {
      const file = zipFile.files[filename];
      const content = await file.async('string');
      const jsonData = JSON.parse(content);

      // Check if it's a Spotify export file (contains streaming history)
      if (Array.isArray(jsonData) || (jsonData && typeof jsonData === 'object')) {
        const tracks = parseSpotifyExport(jsonData);
        console.log(`Processed ${filename}: ${tracks.length} tracks`);
        return tracks;
      } else {
        console.warn(`Skipping ${filename}: Invalid format`);
        return [];
      }
    } catch (error) {
      console.error(`Error processing file ${filename}:`, error);
      // Continue with other files even if one fails
      return [];
    }
  });

  // Wait for all files to be processed in parallel
  const fileResults = await Promise.all(filePromises);
  
  // Flatten all tracks from all files
  for (const tracks of fileResults) {
    allTracks.push(...tracks);
  }

  console.log(`Total tracks extracted from ZIP: ${allTracks.length}`);

  if (allTracks.length === 0) {
    throw new Error('No valid Spotify audio history data found in ZIP file. Please check the file format.');
  }

  // Note: Sorting removed for performance - not needed for database insertion
  // Database will handle ordering when querying if needed

  return allTracks;
}

