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

  // Find all JSON files in the ZIP (including nested folders)
  // Filter for streaming history files - Spotify exports can have different naming:
  // - streaming_history_audio_*.json (new format)
  // - StreamingHistory_music_*.json (old format)
  // - streaming_history_*.json (variations)
  const jsonFiles = Object.keys(zipFile.files).filter((filename) => {
    const file = zipFile.files[filename];
    const lowerFilename = filename.toLowerCase();
    
    // Process audio streaming history files, ignore video history
    return (
      !file.dir &&
      lowerFilename.endsWith('.json') &&
      (lowerFilename.includes('streaming_history_audio') ||
       lowerFilename.includes('streaminghistory_music') ||
       lowerFilename.includes('streaming_history') ||
       lowerFilename.includes('streaminghistory'))
    );
  });

  console.log(`Found ${jsonFiles.length} audio history JSON files in ZIP`);
  
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

  // Extract and parse each JSON file
  for (const filename of jsonFiles) {
    try {
      const file = zipFile.files[filename];
      const content = await file.async('string');
      const jsonData = JSON.parse(content);

      // Check if it's a Spotify export file (contains streaming history)
      if (Array.isArray(jsonData) || (jsonData && typeof jsonData === 'object')) {
        const tracks = parseSpotifyExport(jsonData);
        console.log(`Processed ${filename}: ${tracks.length} tracks`);
        allTracks.push(...tracks);
      } else {
        console.warn(`Skipping ${filename}: Invalid format`);
      }
    } catch (error) {
      console.error(`Error processing file ${filename}:`, error);
      // Continue with other files even if one fails
    }
  }

  console.log(`Total tracks extracted from ZIP: ${allTracks.length}`);

  if (allTracks.length === 0) {
    throw new Error('No valid Spotify audio history data found in ZIP file. Please check the file format.');
  }

  // Sort tracks by endTime (most recent first) to ensure consistent ordering
  // This helps when combining data from multiple files
  allTracks.sort((a, b) => {
    const dateA = new Date(a.endTime).getTime();
    const dateB = new Date(b.endTime).getTime();
    return dateB - dateA; // Most recent first
  });

  return allTracks;
}

