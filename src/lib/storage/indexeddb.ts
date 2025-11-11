/**
 * IndexedDB utilities for storing Spotify export data
 * This allows storing large amounts of data client-side
 */

const DB_NAME = 'wrappedify';
const DB_VERSION = 1;
const STORE_NAME = 'spotifyData';

interface SpotifyDataStore {
  id: string;
  data: any;
  uploadedAt: Date;
}

/**
 * Initialize IndexedDB database
 */
export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
      }
    };
  });
}

/**
 * Store Spotify export data in IndexedDB
 */
export async function storeSpotifyData(data: any[]): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const storeData: SpotifyDataStore = {
      id: 'spotify-export',
      data: data,
      uploadedAt: new Date(),
    };

    const request = store.put(storeData);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to store data in IndexedDB'));
    };
  });
}

/**
 * Retrieve Spotify export data from IndexedDB
 */
export async function getSpotifyData(): Promise<any[] | null> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('spotify-export');

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.data : null);
    };

    request.onerror = () => {
      reject(new Error('Failed to retrieve data from IndexedDB'));
    };
  });
}

/**
 * Clear all Spotify data from IndexedDB
 */
export async function clearSpotifyData(): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete('spotify-export');

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to clear data from IndexedDB'));
    };
  });
}

