import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectRundown, syncPptxUpdate, Slide } from '../store/features/presentation';
import { PresentationSyncPayload } from '../types/presentation';
import { bunsenDb } from '../db';

/**
 * Hook to manage real-time PowerPoint hot-reloads and slide auto-synchronization.
 * Catches IPC sync payloads from the main process file watcher and updates
 * component state instantly without refreshing or interrupting active presentation flow.
 */
export function usePresentationAutoSync(): void {
  const dispatch = useAppDispatch();
  const rundown = useAppSelector(selectRundown);
  const watchedPathsRef = useRef(new Set<string>());

  // 1. Listen for background re-parsed presentation updates from Electron main process
  useEffect(() => {
    if (!window.electronAPI?.onPresentationSync) {
      return;
    }

    const unsubscribe = window.electronAPI.onPresentationSync((payload: PresentationSyncPayload) => {
      console.log(
        `[Auto-Sync] Received live slide payload for "${payload.title}" (${payload.slideCount} slides). Hot-reloading...`
      );

      // Instantly update Redux state while preserving active slide selection
      dispatch(syncPptxUpdate(payload));

      // Update persisted presentation record in IndexedDB
      bunsenDb
        .getAllExternalPresentations()
        .then(async (allPresentations) => {
          const normalizedTarget = payload.filePath.replace(/\\/g, '/').toLowerCase();
          const baseName = payload.filePath.split(/[/\\]/).pop()?.toLowerCase() || '';

          const matchingDeck = allPresentations.find((deck) => {
            if (deck.type !== 'PPT') return false;
            const deckPath = deck.filePath?.replace(/\\/g, '/').toLowerCase();
            const deckBaseName = deckPath?.split(/[/\\]/).pop()?.toLowerCase();
            return (
              (deckPath && (deckPath === normalizedTarget || deckBaseName === baseName)) ||
              (deck.title && deck.title.trim().toLowerCase() === payload.title.trim().toLowerCase())
            );
          });

          if (matchingDeck) {
            const updatedSlides: Slide[] = payload.slides.map((s, idx) => ({
              id: `s-${matchingDeck.id}-${idx + 1}`,
              section: s.title || `Slide ${idx + 1}`,
              lines: s.lines,
              imageUrl: s.thumbnailDataUrl,
              imageFit: 'contain',
              externalType: 'PPT',
              slideData: s,
              slideHtml: s.html,
            }));

            await bunsenDb.saveExternalPresentation({
              ...matchingDeck,
              slideCount: payload.slideCount,
              slides: updatedSlides,
              updatedAt: Date.now(),
            });
          }
        })
        .catch((err) => {
          console.warn('[Auto-Sync] Failed to update presentation in DB:', err);
        });

      // Notify open Projector output windows via BroadcastChannel
      try {
        const channel = new BroadcastChannel('bunsenworship_projector_channel');
        channel.postMessage({
          type: 'PPTX_AUTO_SYNC',
          payload,
        });
        channel.close();
      } catch (err) {
        console.warn('[Auto-Sync] BroadcastChannel postMessage failed:', err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  // 2. Ensure all loaded PPT items in the active rundown are watched by the main process
  useEffect(() => {
    if (!window.electronAPI?.watchPresentation) return;

    const watchFiles = async () => {
      for (const item of rundown) {
        if (item.type === 'PPT' && item.externalMeta?.filePath) {
          const filePath = item.externalMeta.filePath;
          if (!watchedPathsRef.current.has(filePath)) {
            watchedPathsRef.current.add(filePath);
            try {
              await window.electronAPI.watchPresentation(filePath);
            } catch (err) {
              console.warn(`[Auto-Sync] Could not watch presentation: ${filePath}`, err);
            }
          }
        }
      }
    };

    watchFiles().catch((err) => {
      console.error('[Auto-Sync] Error watching presentation files:', err);
    });
  }, [rundown]);
}

export default usePresentationAutoSync;
