/**
 * Client-side IndexedDB persistence for lecture audio recordings.
 * Ensures recordings survive laptop sleep, lid closing, tab discarding, and page reloads.
 */

const DB_NAME = "unitracker_recordings_db";
const DB_VERSION = 1;
const STORE_NAME = "recordings";
const RECORDING_KEY = "latest_recording";

export interface StoredRecording {
    blob: Blob;
    duration: number;
    source: 'mic' | 'system';
    timestamp: number;
    mimeType: string;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !("indexedDB" in window)) {
            return reject(new Error("IndexedDB is not available in this environment"));
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveStoredRecording(rec: StoredRecording): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(rec, RECORDING_KEY);

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.warn("saveStoredRecording failed:", err);
    }
}

export async function getStoredRecording(): Promise<StoredRecording | null> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(RECORDING_KEY);

            req.onsuccess = () => {
                const result = req.result as StoredRecording | undefined;
                resolve(result || null);
            };
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.warn("getStoredRecording failed:", err);
        return null;
    }
}

export async function deleteStoredRecording(): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(RECORDING_KEY);

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.warn("deleteStoredRecording failed:", err);
    }
}
