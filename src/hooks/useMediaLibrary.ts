import { useState, useEffect, useCallback } from 'react';
import { bunsenDb, SongRecord, ExternalPresentationRecord, ImageMediaRecord } from '../db';
import { SEED_SONGS, SEED_IMAGES, SEED_EXTERNAL_PRESENTATIONS } from '../db/seedData';
import { ProMediaAsset } from '../components/screens/mediaLibraryData';

export interface UseMediaLibraryReturn {
  songs: SongRecord[];
  images: ImageMediaRecord[];
  externalDecks: ExternalPresentationRecord[];
  customAssets: ProMediaAsset[];
  deletedAssetIds: string[];
  isLoading: boolean;
  error: string | null;
  loadDatabaseRecords: () => Promise<void>;
  addCustomAsset: (asset: ProMediaAsset) => Promise<void>;
  deleteAsset: (assetId: string) => Promise<void>;
  addSong: (song: SongRecord) => Promise<void>;
  addImage: (image: ImageMediaRecord) => Promise<void>;
  addExternalPresentation: (deck: ExternalPresentationRecord) => Promise<void>;
  restoreSeedData: () => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<{ importedCount: number }>;
}

export const useMediaLibrary = (): UseMediaLibraryReturn => {
  const [songs, setSongs] = useState<SongRecord[]>([]);
  const [images, setImages] = useState<ImageMediaRecord[]>([]);
  const [externalDecks, setExternalDecks] = useState<ExternalPresentationRecord[]>([]);
  const [customAssets, setCustomAssets] = useState<ProMediaAsset[]>([]);
  const [deletedAssetIds, setDeletedAssetIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDatabaseRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [allSongs, allImages, allDecks, savedCustom, savedDeleted] = await Promise.all([
        bunsenDb.getAllSongs(),
        bunsenDb.getAllImages(),
        bunsenDb.getAllExternalPresentations(),
        bunsenDb.getSetting<ProMediaAsset[]>('pro_media_custom_assets', []),
        bunsenDb.getSetting<string[]>('pro_media_deleted_assets', []),
      ]);
      setSongs(allSongs);
      setImages(allImages);
      setExternalDecks(allDecks);

      if (savedCustom) {
        setCustomAssets(savedCustom);
      }
      if (savedDeleted) {
        setDeletedAssetIds(savedDeleted);
      }
    } catch (err) {
      setError('Failed to load records from database');
      console.error('Failed to load records from BunsenWorshipDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addCustomAsset = useCallback(async (asset: ProMediaAsset) => {
    try {
      const updated = [asset, ...customAssets];
      setCustomAssets(updated);
      await bunsenDb.setSetting('pro_media_custom_assets', updated);
    } catch (err) {
      setError('Failed to add custom asset');
      console.error('Failed to add custom asset:', err);
      throw err;
    }
  }, [customAssets]);

  const deleteAsset = useCallback(async (assetId: string) => {
    try {
      const updatedDeleted = [...deletedAssetIds, assetId];
      setDeletedAssetIds(updatedDeleted);
      await bunsenDb.setSetting('pro_media_deleted_assets', updatedDeleted);
    } catch (err) {
      setError('Failed to delete asset');
      console.error('Failed to delete asset:', err);
      throw err;
    }
  }, [deletedAssetIds]);

  const addSong = useCallback(async (song: SongRecord) => {
    try {
      await bunsenDb.saveSong(song);
      await loadDatabaseRecords();
    } catch (err) {
      setError('Failed to add song');
      console.error('Failed to add song:', err);
      throw err;
    }
  }, [loadDatabaseRecords]);

  const addImage = useCallback(async (image: ImageMediaRecord) => {
    try {
      await bunsenDb.saveImage(image);
      await loadDatabaseRecords();
    } catch (err) {
      setError('Failed to add image');
      console.error('Failed to add image:', err);
      throw err;
    }
  }, [loadDatabaseRecords]);

  const addExternalPresentation = useCallback(async (deck: ExternalPresentationRecord) => {
    try {
      await bunsenDb.saveExternalPresentation(deck);
      await loadDatabaseRecords();
    } catch (err) {
      setError('Failed to add presentation');
      console.error('Failed to add presentation:', err);
      throw err;
    }
  }, [loadDatabaseRecords]);

  const restoreSeedData = useCallback(async () => {
    try {
      for (const song of SEED_SONGS) {
        await bunsenDb.saveSong(song);
      }
      for (const img of SEED_IMAGES) {
        await bunsenDb.saveImage(img);
      }
      for (const deck of SEED_EXTERNAL_PRESENTATIONS) {
        await bunsenDb.saveExternalPresentation(deck);
      }
      await bunsenDb.setSetting('pro_media_deleted_assets', []);
      setDeletedAssetIds([]);
      await loadDatabaseRecords();
    } catch (err) {
      setError('Failed to restore seed data');
      console.error('Failed to restore seed data:', err);
      throw err;
    }
  }, [loadDatabaseRecords]);

  const exportBackup = useCallback(async () => {
    try {
      const jsonDump = await bunsenDb.exportDatabase();
      const blob = new Blob([jsonDump], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `bunsenworship-database-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export database');
      console.error('Export backup failed:', err);
      throw err;
    }
  }, []);

  const importBackup = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const result = await bunsenDb.importDatabase(text);
      await loadDatabaseRecords();
      return result;
    } catch (err) {
      setError('Failed to import database');
      console.error('Import database failed:', err);
      throw err;
    }
  }, [loadDatabaseRecords]);

  useEffect(() => {
    loadDatabaseRecords();
  }, [loadDatabaseRecords]);

  return {
    songs,
    images,
    externalDecks,
    customAssets,
    deletedAssetIds,
    isLoading,
    error,
    loadDatabaseRecords,
    addCustomAsset,
    deleteAsset,
    addSong,
    addImage,
    addExternalPresentation,
    restoreSeedData,
    exportBackup,
    importBackup,
  };
};