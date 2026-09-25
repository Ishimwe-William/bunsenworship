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
    dispatch(setVideoCurrentTime(parseFloat(e.target.value)));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setVideoVolume(parseFloat(e.target.value)));
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setVideoPlaybackRate(parseFloat(e.target.value)));
  };

  const videoTitle = slide.videoTitle || slide.section || (isYouTube ? 'YouTube stream' : 'Video');
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
    <div className="video-control-deck">
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

      <div className="video-control-header">
        <div className={`video-control-source ${isYouTube ? 'is-youtube' : 'is-local'}`}>
          {isYouTube ? <YoutubeIcon size={15} /> : <VideoIcon size={15} />}
          <span className="video-control-title" title={videoTitle}>
            {videoTitle}
          </span>
          <span className={`video-deck-target-badge ${isLive ? 'is-live' : 'is-preview'}`}>
            {isLive ? 'Live Audio' : 'Preview Audio'}
          </span>
        </div>
        <div className="video-control-status-group">
          <span
            className={`video-control-state ${
              videoPlayback.videoError ? 'is-error' : isActivelyPlaying ? 'is-playing' : 'is-paused'
            }`}
            title={
              videoPlayback.videoError
                ? isYouTube
                  ? 'Stream error'
                  : 'Video file not found'
                : isActivelyPlaying
                ? 'Video is playing'
                : 'Video is paused'
            }
          >
            <span />
            {videoPlayback.videoError ? 'Error' : isActivelyPlaying ? 'Playing' : 'Paused'}
          </span>
          <span className="video-control-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {duration > 0 && (
        <input
          type="range"
          className="video-progress-bar video-control-seek"
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          disabled={!isLive}
          style={{
            background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${progressPercent}%, var(--border-subtle) ${progressPercent}%, var(--border-subtle) 100%)`,
          }}
          title={`Seek to ${formatTime(currentTime)}`}
          aria-label="Video position"
        />
      )}

      <div className="video-control-actions">
        <div className="video-control-primary-actions">
          <button
            type="button"
            className={`console-mini-btn ${isActivelyPlaying ? 'active' : ''}`}
            onClick={handleTogglePlay}
            title={isActivelyPlaying ? 'Pause video' : 'Play video'}
            aria-label={isActivelyPlaying ? 'Pause video' : 'Play video'}
            aria-pressed={isActivelyPlaying}
          >
            {isActivelyPlaying ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
          </button>
          <button
            type="button"
            className="console-mini-btn"
            onClick={handleRestart}
            title="Restart video"
            aria-label="Restart video"
          >
            <RotateCcwIcon size={15} />
          </button>
          <button
            type="button"
            className={`console-mini-btn ${videoPlayback.isLooping ? 'active' : ''}`}
            onClick={() => dispatch(toggleVideoLoop())}
            title={videoPlayback.isLooping ? 'Disable video loop' : 'Enable video loop'}
            aria-label={videoPlayback.isLooping ? 'Disable video loop' : 'Enable video loop'}
            aria-pressed={videoPlayback.isLooping}
          >
            <RepeatIcon size={15} />
          </button>
          {videoPlayback.videoError && !isYouTube && (
            <button
              type="button"
              className="console-mini-btn is-danger"
              onClick={handleRelinkVideo}
              title="Locate and relink this video file"
              aria-label="Locate and relink this video file"
            >
              <VideoIcon size={15} />
            </button>
          )}
        </div>

        <div className="video-control-secondary-actions">
          {isProjectorActive && (
            <span
              className="video-projector-audio"
              title="Projector window is active. Audio output is routed exclusively to the Projector/Sanctuary display to prevent console echo."
            >
              <MonitorIcon size={12} />
              <span>Sanctuary Audio</span>
            </span>
          )}
          <button
            type="button"
            className={`console-mini-btn video-mute-btn ${
              videoPlayback.isMuted ? 'is-danger' : ''
            }`}
            onClick={() => dispatch(toggleVideoMute())}
            title={videoPlayback.isMuted ? 'Unmute' : 'Mute'}
            aria-label={videoPlayback.isMuted ? 'Unmute' : 'Mute'}
            aria-pressed={videoPlayback.isMuted}
          >
            {videoPlayback.isMuted ? <VolumeXIcon size={14} /> : <VolumeIcon size={14} />}
          </button>
          <input
            type="range"
            className="video-volume-slider"
            min={0}
            max={1}
            step={0.05}
            value={videoPlayback.isMuted ? 0 : videoPlayback.volume}
            onChange={handleVolumeChange}
            title={`Volume: ${Math.round((videoPlayback.isMuted ? 0 : videoPlayback.volume) * 100)}%`}
            aria-label="Volume"
          />
          <select
            className="video-speed-select"
            value={videoPlayback.playbackRate}
            onChange={handleRateChange}
            title="Playback speed"
            aria-label="Playback speed"
          >
            <option value={0.5}>0.5×</option>
            <option value={0.75}>0.75×</option>
            <option value={1}>1×</option>
            <option value={1.25}>1.25×</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
          </select>
        </div>
      </div>
    </div>
  );
};
