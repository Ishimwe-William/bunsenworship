import {
  ServiceRecord,
  SongRecord,
  ExternalPresentationRecord,
  ImageMediaRecord,
  SettingRecord,
  DatabaseBackup,
} from './types';
import {
  SEED_SONGS,
  SEED_EXTERNAL_PRESENTATIONS,
  SEED_SERVICE,
  SEED_IMAGES,
} from './seedData';

const DB_NAME = 'BunsenWorshipDB';
const DB_VERSION = 2;

class BunsenDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Opens or returns the active IndexedDB connection
   */
  private getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion;

        // Store: services (Services & Rundowns)
        if (!db.objectStoreNames.contains('services')) {
          const serviceStore = db.createObjectStore('services', { keyPath: 'id' });
          serviceStore.createIndex('title', 'title', { unique: false });
          serviceStore.createIndex('date', 'date', { unique: false });
          serviceStore.createIndex('isCurrent', 'isCurrent', { unique: false });
          serviceStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Store: songs (Worship Songs Library)
        if (!db.objectStoreNames.contains('songs')) {
          const songStore = db.createObjectStore('songs', { keyPath: 'id' });
          songStore.createIndex('title', 'title', { unique: false });
          songStore.createIndex('artist', 'artist', { unique: false });
          songStore.createIndex('key', 'key', { unique: false });
          songStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Store: external_presentations (PowerPoint files & Canva links)
        if (!db.objectStoreNames.contains('external_presentations')) {
          const extStore = db.createObjectStore('external_presentations', { keyPath: 'id' });
          extStore.createIndex('title', 'title', { unique: false });
          extStore.createIndex('type', 'type', { unique: false });
          extStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Store: images (Sacred Backgrounds, Announcements, Sermon Graphics, Photos)
        if (!db.objectStoreNames.contains('images')) {
          const imgStore = db.createObjectStore('images', { keyPath: 'id' });
          imgStore.createIndex('title', 'title', { unique: false });
          imgStore.createIndex('category', 'category', { unique: false });
          imgStore.createIndex('createdAt', 'createdAt', { unique: false });
          imgStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Store: settings (Preferences, active themes, etc.)
        if (!db.objectStoreNames.contains('settings')) {
          const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
          settingsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Seed initial data
        const tx = request.transaction;
        if (tx) {
          if (oldVersion === 0) {
            const serviceStore = tx.objectStore('services');
            serviceStore.put(SEED_SERVICE);

            const songStore = tx.objectStore('songs');
            SEED_SONGS.forEach((song) => songStore.put(song));

            const extStore = tx.objectStore('external_presentations');
            SEED_EXTERNAL_PRESENTATIONS.forEach((ext) => extStore.put(ext));
          }

          if (oldVersion < 2) {
            const imgStore = tx.objectStore('images');
            SEED_IMAGES.forEach((img) => imgStore.put(img));
          }
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // =========================================================================
  // Services & Rundown Methods
  // =========================================================================

  async getAllServices(): Promise<ServiceRecord[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readonly');
      const store = tx.objectStore('services');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getCurrentService(): Promise<ServiceRecord | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readonly');
      const store = tx.objectStore('services');
      const index = store.index('isCurrent');
      const req = index.get(IDBKeyRange.only(true));
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result);
        } else {
          // Fallback to first available or seed service
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const list = allReq.result || [];
            resolve(list[0] || SEED_SERVICE);
          };
          allReq.onerror = () => reject(allReq.error);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveService(service: ServiceRecord): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readwrite');
      const store = tx.objectStore('services');
      const toSave = { ...service, updatedAt: Date.now() };
      const req = store.put(toSave);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async setCurrentService(serviceId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readwrite');
      const store = tx.objectStore('services');
      const req = store.getAll();

      req.onsuccess = () => {
        const services = req.result || [];
        services.forEach((s) => {
          s.isCurrent = s.id === serviceId;
          s.updatedAt = Date.now();
          store.put(s);
        });
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteService(serviceId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readwrite');
      const store = tx.objectStore('services');
      const req = store.delete(serviceId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // =========================================================================
  // Worship Songs Library Methods
  // =========================================================================

  async getAllSongs(): Promise<SongRecord[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('songs', 'readonly');
      const store = tx.objectStore('songs');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getSongById(id: string): Promise<SongRecord | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('songs', 'readonly');
      const store = tx.objectStore('songs');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveSong(song: SongRecord): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('songs', 'readwrite');
      const store = tx.objectStore('songs');
      const toSave = { ...song, updatedAt: Date.now() };
      const req = store.put(toSave);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteSong(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('songs', 'readwrite');
      const store = tx.objectStore('songs');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // =========================================================================
  // External Presentations (PowerPoint & Canva Links)
  // =========================================================================

  async getAllExternalPresentations(): Promise<ExternalPresentationRecord[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('external_presentations', 'readonly');
      const store = tx.objectStore('external_presentations');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async saveExternalPresentation(presentation: ExternalPresentationRecord): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('external_presentations', 'readwrite');
      const store = tx.objectStore('external_presentations');
      const toSave = { ...presentation, updatedAt: Date.now() };
      const req = store.put(toSave);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteExternalPresentation(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('external_presentations', 'readwrite');
      const store = tx.objectStore('external_presentations');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // =========================================================================
  // Images & Visual Assets Store
  // =========================================================================

  async getAllImages(): Promise<ImageMediaRecord[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readonly');
      const store = tx.objectStore('images');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getImageById(id: string): Promise<ImageMediaRecord | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readonly');
      const store = tx.objectStore('images');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveImage(image: ImageMediaRecord): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      const toSave = { ...image, updatedAt: Date.now() };
      const req = store.put(toSave);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteImage(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      const store = tx.objectStore('images');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // =========================================================================
  // Settings & Configuration Store
  // =========================================================================

  async getSetting<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const record: SettingRecord = {
        key,
        value,
        updatedAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // =========================================================================
  // Full Database Backup Export & Import (JSON)
  // =========================================================================

  async exportDatabase(): Promise<string> {
    const [services, songs, externalPresentations, images] = await Promise.all([
      this.getAllServices(),
      this.getAllSongs(),
      this.getAllExternalPresentations(),
      this.getAllImages(),
    ]);

    const backup: DatabaseBackup = {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      services,
      songs,
      externalPresentations,
      images,
      settings: [],
    };

    return JSON.stringify(backup, null, 2);
  }

  async importDatabase(jsonString: string): Promise<{ importedCount: number }> {
    const backup: DatabaseBackup = JSON.parse(jsonString);
    if (!backup || !backup.version) {
      throw new Error('Invalid BunsenWorship backup format');
    }

    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        ['services', 'songs', 'external_presentations', 'images'],
        'readwrite'
      );

      let count = 0;

      if (backup.services && Array.isArray(backup.services)) {
        const sStore = tx.objectStore('services');
        backup.services.forEach((s) => {
          sStore.put(s);
          count++;
        });
      }

      if (backup.songs && Array.isArray(backup.songs)) {
        const songStore = tx.objectStore('songs');
        backup.songs.forEach((s) => {
          songStore.put(s);
          count++;
        });
      }

      if (backup.externalPresentations && Array.isArray(backup.externalPresentations)) {
        const extStore = tx.objectStore('external_presentations');
        backup.externalPresentations.forEach((p) => {
          extStore.put(p);
          count++;
        });
      }

      if (backup.images && Array.isArray(backup.images)) {
        const imgStore = tx.objectStore('images');
        backup.images.forEach((img) => {
          imgStore.put(img);
          count++;
        });
      }

      tx.oncomplete = () => resolve({ importedCount: count });
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const bunsenDb = new BunsenDatabase();
export default bunsenDb;
