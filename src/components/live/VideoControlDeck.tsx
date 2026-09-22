import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  Slide,
  selectVideoPlayback,
  toggleVideoPlay,
  setVideoCurrentTime,
  setVideoVolume,
  toggleVideoMute,
  setVideoPlaybackRate,
  toggleVideoLoop,
  restartVideo,
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
} from '../common/Icons';
import { formatTime } from '../../utils/videoHelpers';

interface VideoControlDeckProps {
  slide: Slide | null;
  isLive?: boolean;
}

export const VideoControlDeck: React.FC<VideoControlDeckProps> = ({ slide, isLive = true }) => {
  const dispatch = useAppDispatch();
  const videoPlayback = useAppSelector(selectVideoPlayback);

  if (!slide) return null;

  const hasVideo = Boolean(
    (slide.videoType === 'local' ||
      slide.videoType === 'youtube' ||
      slide.videoUrl ||
      slide.videoPath ||
      slide.youtubeUrl) &&
      slide.videoType !== 'none'
  );

  if (!hasVideo) return null;

  const isYouTube = Boolean(
    slide.videoType === 'youtube' ||
      (slide.youtubeUrl && !slide.videoPath && !slide.videoUrl)
  );

  const duration = videoPlayback.duration || 0;
  const currentTime = videoPlayback.currentTime || 0;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

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
      {/* Header Row: Badge, Title, Time readout */}
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

        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '0.725rem',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Seekbar timeline slider */}
      {!isYouTube && duration > 0 && (
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
            onClick={() => dispatch(toggleVideoPlay())}
            title={videoPlayback.isPlaying ? 'Pause video' : 'Play video'}
            style={{
              padding: '4px 10px',
              fontSize: '0.7rem',
              borderColor: videoPlayback.isPlaying ? 'var(--color-primary)' : undefined,
              color: videoPlayback.isPlaying ? 'var(--color-primary)' : undefined,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            {videoPlayback.isPlaying ? <PauseIcon size={12} /> : <PlayIcon size={12} />}
            <span>{videoPlayback.isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Restart Button */}
          <button
            type="button"
            className="console-mini-btn"
            onClick={() => dispatch(restartVideo())}
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
        </div>

        {/* Volume & Speed controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
