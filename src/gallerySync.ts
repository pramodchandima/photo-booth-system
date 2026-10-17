export interface BoothPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  timestamp: number;
}

const DB_NAME = 'PhotoBoothDB';
const STORE_NAME = 'photos';
const BROADCAST_CHANNEL_NAME = 'photo_booth_channel';

let memoryPhotos: BoothPhoto[] = [];

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 1. Fetch live photos directly from Google Drive Folder via Apps Script
export async function fetchDrivePhotos(): Promise<BoothPhoto[]> {
  const SCRIPT_URL = import.meta.env.GOOGLE_SCRIPT_URL || import.meta.env.VITE_GOOGLE_SCRIPT_URL;
  if (!SCRIPT_URL) return [];

  const folderId = import.meta.env.GOOGLE_DRIVE_FOLDER_ID || import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
  const fetchUrl = folderId ? `${SCRIPT_URL}?folderId=${encodeURIComponent(folderId)}` : SCRIPT_URL;

  try {
    const res = await fetch(fetchUrl, {
      method: 'GET',
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.photos)) {
      const photos: BoothPhoto[] = data.photos.map((item: any) => ({
        id: item.id,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl || item.url,
        timestamp: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
      }));

      // Cache into memory & IndexedDB
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        photos.forEach((p) => store.put(p));
      } catch (e) {
        // Ignore cache failure
      }

      memoryPhotos = photos;
      return photos;
    }
  } catch (err) {
    console.warn('Could not fetch photos from Google Drive directly:', err);
  }
  return [];
}

// 2. Get stored photos (IndexedDB + Memory + Fallback)
export async function getStoredPhotos(): Promise<BoothPhoto[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const result: BoothPhoto[] = request.result || [];
        result.sort((a, b) => b.timestamp - a.timestamp);
        memoryPhotos = result;
        resolve(result);
      };
      request.onerror = () => {
        resolve(memoryPhotos);
      };
    });
  } catch (err) {
    return memoryPhotos;
  }
}

// 3. Shared BroadcastChannel instance
let broadcastChannel: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
  return broadcastChannel;
}

// 4. Save and broadcast a newly captured photo
export async function saveAndBroadcastPhoto(url: string): Promise<BoothPhoto> {
  const photo: BoothPhoto = {
    id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    url,
    timestamp: Date.now(),
  };

  memoryPhotos = [photo, ...memoryPhotos];

  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(photo);
  } catch (err) {
    console.warn('Could not save photo to IndexedDB:', err);
  }

  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ type: 'NEW_PHOTO', photo });
    }
  } catch (err) {
    console.error('BroadcastChannel error:', err);
  }

  return photo;
}

// 5. Subscribe to new photo broadcasts
export function subscribeToNewPhotos(onNewPhoto: (photo: BoothPhoto) => void) {
  let channel: BroadcastChannel | null = null;

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === 'NEW_PHOTO' && event.data.photo) {
          onNewPhoto(event.data.photo);
        }
      };
    }
  } catch (e) {
    console.error('Failed to initialize BroadcastChannel listener:', e);
  }

  return () => {
    if (channel) channel.close();
  };
}
