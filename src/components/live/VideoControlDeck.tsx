import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  Slide,
  selectVideoPlayback,
  selectIsBlackout,
  selectIsLogoActive,
  selectIsProjectorActive,
  clearAllOverrides,
  toggleVideoPlay,
  setVideoCurrentTime,
  setVideoVolume,
  toggleVideoMute,
  setVideoPlaybackRate,
  toggleVideoLoop,
  restartVideo,
  relinkSlideVideo,
  clearVideoError,
} from '../../store/features/presentation';
import {
  PlayIcon,
  PauseIcon,
  VolumeIcon,
  VolumeXIcon,
  RepeatIcon,
  RotateCcwIcon,
  VideoIcon,
  YoutubeIcon,
  MonitorIcon,
} from '../common/Icons';
import { formatTime, extractYouTubeId } from '../../utils/videoHelpers';

interface VideoControlDeckProps {
  slide: Slide | null;
  isLive?: boolean;
}

export const VideoControlDeck: React.FC<VideoControlDeckProps> = ({ slide, isLive = true }) => {
  const dispatch = useAppDispatch();
  const videoPlayback = useAppSelector(selectVideoPlayback);
  const isBlackout = useAppSelector(selectIsBlackout);
  const isLogoActive = useAppSelector(selectIsLogoActive);
  const isProjectorActive = useAppSelector(selectIsProjectorActive);
  const relinkInputRef = React.useRef<HTMLInputElement>(null);

  if (!slide) return null;

  const youtubeVideoId = extractYouTubeId(slide);
  const isYouTube = Boolean(youtubeVideoId);
  const hasVideo = Boolean(
    (isYouTube ||
      slide.videoType === 'local' ||
      slide.videoUrl ||
      slide.videoPath) &&
      slide.videoType !== 'none'
  );

  if (!hasVideo) return null;

  const duration = videoPlayback.duration || 0;
  const currentTime = videoPlayback.currentTime || 0;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleTogglePlay = () => {
    if (!videoPlayback.isPlaying && (isBlackout || isLogoActive)) {
      dispatch(clearAllOverrides());
    }
    dispatch(toggleVideoPlay());
  };

  const handleRestart = () => {
    if (isBlackout || isLogoActive) {
      dispatch(clearAllOverrides());
    }
    dispatch(restartVideo());
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    dispatch(setVideoCurrentTime(newTime));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    dispatch(setVideoVolume(newVol));
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setVideoPlaybackRate(parseFloat(e.target.value)));
  };

  const videoTitle = slide.videoTitle || slide.section || (isYouTube ? 'YouTube Stream' : 'Video Slide');
  const isActivelyPlaying = videoPlayback.isPlaying && !isBlackout && !isLogoActive;

  const handleRelinkVideo = async () => {
    if (window.electronAPI?.openVideoDialog) {
      try {
        const chosen = await window.electronAPI.openVideoDialog();
        if (chosen) {
          dispatch(
            relinkSlideVideo({
              slideId: slide.id,
              filePath: chosen,
            })
          );
          dispatch(clearVideoError());
        }
      } catch (err) {
        console.error('Failed to open video dialog:', err);
      }
    } else {
      relinkInputRef.current?.click();
    }
  };

  return (
    <div
      style={{
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        padding: '10px 12px',
        marginTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <input
        type="file"
        ref={relinkInputRef}
        accept="video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && slide) {
            const fullPath = window.electronAPI?.getPathForFile?.(file) || URL.createObjectURL(file);
            dispatch(
              relinkSlideVideo({
                slideId: slide.id,
                filePath: fullPath,
              })
            );
            dispatch(clearVideoError());
          }
        }}
      />
      {/* Header Row: Badge, Title, Status, Time readout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              background: isYouTube ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: isYouTube ? '#ef4444' : '#3b82f6',
            }}
          >
            {isYouTube ? <YoutubeIcon size={12} /> : <VideoIcon size={12} />}
            <span>{isYouTube ? 'YOUTUBE' : 'VIDEO DECK'}</span>
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={videoTitle}
          >
            {videoTitle}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {videoPlayback.videoError ? (
            <span
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.625rem',
                fontWeight: 700,
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#ef4444',
                }}
              />
              {isYouTube ? 'STREAM ERROR' : 'FILE NOT FOUND'}
            </span>
          ) : (
            <span
              style={{
                padding: '1px 5px',
                borderRadius: '4px',
                fontSize: '0.625rem',
                fontWeight: 700,
                background: isActivelyPlaying ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                color: isActivelyPlaying ? '#22c55e' : '#eab308',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: isActivelyPlaying ? '#22c55e' : '#eab308',
                }}
              />
              {isActivelyPlaying ? 'PLAYING' : 'PAUSED'}
            </span>
          )}

          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '0.725rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Seekbar timeline slider */}
      {duration > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            disabled={!isLive}
            style={{
              flex: 1,
              height: '4px',
              accentColor: 'var(--color-primary)',
              cursor: isLive ? 'pointer' : 'default',
              background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${progressPercent}%, var(--border-subtle) ${progressPercent}%, var(--border-subtle) 100%)`,
            }}
            title={`Seek to ${formatTime(currentTime)}`}
          />
        </div>
      )}

      {/* Control Buttons Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Play / Pause Toggle */}
          <button
            type="button"
            className="console-mini-btn"
            onClick={handleTogglePlay}
            title={videoPlayback.isPlaying ? 'Pause video' : 'Play video (clears blackout if active)'}
            style={{
              padding: '4px 10px',
              fontSize: '0.7rem',
              borderColor: isActivelyPlaying ? 'var(--color-primary)' : undefined,
              color: isActivelyPlaying ? 'var(--color-primary)' : undefined,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            {isActivelyPlaying ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
            <span>{isActivelyPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Restart Button */}
          <button
            type="button"
            className="console-mini-btn"
            onClick={handleRestart}
            title="Restart video from beginning"
            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
          >
            <RotateCcwIcon size={12} />
            <span>Restart</span>
          </button>

          {/* Loop Toggle */}
          <button
            type="button"
            className={`console-mini-btn ${videoPlayback.isLooping ? 'active' : ''}`}
            onClick={() => dispatch(toggleVideoLoop())}
            title="Toggle video looping"
            style={{
              padding: '4px 8px',
              fontSize: '0.7rem',
              borderColor: videoPlayback.isLooping ? 'var(--color-primary)' : undefined,
              color: videoPlayback.isLooping ? 'var(--color-primary)' : undefined,
            }}
          >
            <RepeatIcon size={12} />
            <span>Loop</span>
          </button>

          {videoPlayback.videoError && !isYouTube && (
            <button
              type="button"
              className="console-mini-btn"
              onClick={handleRelinkVideo}
              title="Locate and relink this video file"
              style={{
                padding: '4px 10px',
                fontSize: '0.7rem',
                background: 'rgba(239, 68, 68, 0.15)',
                borderColor: '#ef4444',
                color: '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 700,
              }}
            >
              <VideoIcon size={12} />
              <span>Relink Video</span>
            </button>
          )}
        </div>

        {/* Volume & Speed controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isProjectorActive && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.625rem',
                fontWeight: 600,
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
              title="Projector window is active. Audio output is routed exclusively to the Projector/Sanctuary display to prevent console echo."
            >
              <MonitorIcon size={11} />
              <span>Sanctuary Audio</span>
            </span>
          )}
          {/* Mute button */}
          <button
            type="button"
            className="console-mini-btn"
            onClick={() => dispatch(toggleVideoMute())}
            title={videoPlayback.isMuted ? 'Unmute' : 'Mute'}
            style={{
              padding: '4px 6px',
              color: videoPlayback.isMuted ? '#ef4444' : undefined,
            }}
          >
            {videoPlayback.isMuted ? <VolumeXIcon size={13} /> : <VolumeIcon size={13} />}
          </button>

          {/* Volume slider */}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={videoPlayback.isMuted ? 0 : videoPlayback.volume}
            onChange={handleVolumeChange}
            style={{
              width: '60px',
              height: '4px',
              accentColor: 'var(--color-primary)',
              cursor: 'pointer',
            }}
            title={`Volume: ${Math.round((videoPlayback.isMuted ? 0 : videoPlayback.volume) * 100)}%`}
          />

          {/* Speed dropdown */}
          <select
            value={videoPlayback.playbackRate}
            onChange={handleRateChange}
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              padding: '2px 4px',
              fontSize: '0.675rem',
              cursor: 'pointer',
            }}
            title="Playback Speed"
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </div>
      </div>
    </div>
  );
};
