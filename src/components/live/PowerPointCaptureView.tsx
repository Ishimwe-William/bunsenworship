import React, { useEffect, useRef, useState } from 'react';

interface CaptureSource {
  id: string;
  name: string;
  thumbnail?: string;
}

interface PowerPointCaptureViewProps {
  isActive: boolean;
  onError?: (error: string) => void;
}

/**
 * PowerPointCaptureView captures and displays a PowerPoint slideshow window
 * using Electron's desktopCapturer API.
 */
export const PowerPointCaptureView: React.FC<PowerPointCaptureViewProps> = ({ isActive, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [captureSourceId, setCaptureSourceId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-discover PowerPoint windows
  useEffect(() => {
    if (!isActive) return;

    const discoverPowerPointWindow = async () => {
      try {
        if (!window.electronAPI?.getCaptureSources) {
          throw new Error('Capture API not available');
        }

        const result = await window.electronAPI.getCaptureSources();
        if (!result.success) {
          throw new Error(result.error || 'Failed to get capture sources');
        }

        const sources = result.sources || [];
        if (sources.length === 0) {
          console.log('[PowerPointCapture] No PowerPoint windows found');
          return;
        }

        // Use the first PowerPoint window found
        const pptSource = sources[0];
        console.log('[PowerPointCapture] Found PowerPoint window:', pptSource.name);
        setCaptureSourceId(pptSource.id);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[PowerPointCapture] Discovery error:', errorMessage);
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    // Initial discovery
    discoverPowerPointWindow();

    // Periodic refresh to detect new/changed windows
    refreshIntervalRef.current = setInterval(() => {
      discoverPowerPointWindow();
    }, 2000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isActive, onError]);

  // Setup video stream when capture source is available
  useEffect(() => {
    if (!captureSourceId || !isActive) return;

    const setupCapture = async () => {
      try {
        // Request media stream with chromeMediaSource
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: captureSourceId,
            },
          } as MediaStreamConstraints,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.error('[PowerPointCapture] Failed to play video:', err);
            setError('Failed to play capture stream');
          });
          setIsCapturing(true);
          setError(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[PowerPointCapture] Capture setup error:', errorMessage);
        setError(errorMessage);
        setIsCapturing(false);
        onError?.(errorMessage);
      }
    };

    setupCapture();

    return () => {
      // Cleanup stream
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCapturing(false);
    };
  }, [captureSourceId, isActive, onError]);

  if (!isActive) {
    return null;
  }

  if (error) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          color: '#fff',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>PowerPoint Capture Error</div>
        <div style={{ fontSize: '16px', opacity: 0.8 }}>{error}</div>
        <div style={{ fontSize: '14px', opacity: 0.6 }}>
          Make sure PowerPoint is running and a slideshow is active
        </div>
      </div>
    );
  }

  if (!isCapturing) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: '18px', opacity: 0.6 }}>
          Connecting to PowerPoint slideshow...
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        backgroundColor: '#000',
      }}
      onError={() => {
        console.error('[PowerPointCapture] Video element error');
        setError('Video playback error');
        setIsCapturing(false);
      }}
    />
  );
};
