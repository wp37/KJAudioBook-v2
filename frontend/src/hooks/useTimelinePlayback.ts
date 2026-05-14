// ==========================================================================
// hooks/useTimelinePlayback.ts
// Controls timeline play/pause, seek, and the rAF animation loop.
// Accepts audio/video refs from the parent so DOM elements stay in-tree.
// ==========================================================================
import { useEffect, useRef } from 'react';
import type { TimelineClip, TimelineVideoClip } from '../types';

interface UseTimelinePlaybackOptions {
  isPlayingTimeline: boolean;
  setIsPlayingTimeline: React.Dispatch<React.SetStateAction<boolean>>;
  timelineTime: number;
  setTimelineTime: React.Dispatch<React.SetStateAction<number>>;
  timelineClips: TimelineClip[];
  timelineVideoClips: TimelineVideoClip[];
  timelineAudioRefs: React.MutableRefObject<{ [id: string]: HTMLAudioElement }>;
  timelineVideoRefs: React.MutableRefObject<{ [id: string]: HTMLVideoElement }>;
}

export function useTimelinePlayback({
  isPlayingTimeline,
  setIsPlayingTimeline,
  timelineTime,
  setTimelineTime,
  timelineClips,
  timelineVideoClips,
  timelineAudioRefs,
  timelineVideoRefs,
}: UseTimelinePlaybackOptions) {

  const animationRef   = useRef<number | undefined>(undefined);
  const lastUpdateRef  = useRef<number | undefined>(undefined);

  /** Seek to an absolute time and sync all audio/video elements */
  const seekTimelineTo = (newTime: number) => {
    setTimelineTime(newTime);

    timelineClips.forEach(clip => {
      const audio = timelineAudioRefs.current[clip.id];
      if (!audio) return;
      if (newTime >= clip.startTime && newTime < clip.startTime + clip.duration) {
        audio.currentTime = newTime - clip.startTime;
        if (isPlayingTimeline) audio.play().catch(() => {});
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    timelineVideoClips.forEach(clip => {
      const video = timelineVideoRefs.current[clip.id];
      if (!video) return;
      if (newTime >= clip.startTime && newTime < clip.startTime + clip.duration) {
        video.currentTime = newTime - clip.startTime + (clip.trimStart || 0);
        if (isPlayingTimeline) video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  };

  /** Toggle play/pause — restarts from beginning if past the end */
  const toggleTimelinePlay = () => {
    if (!isPlayingTimeline) {
      let startFrom = timelineTime;
      const maxTime =
        timelineClips.length > 0
          ? Math.max(...timelineClips.map(c => c.startTime + c.duration))
          : 20;
      if (timelineTime > maxTime) {
        setTimelineTime(0);
        startFrom = 0;
      }

      // Activate clips already under the playhead
      timelineClips.forEach(clip => {
        const audio = timelineAudioRefs.current[clip.id];
        if (audio && startFrom >= clip.startTime && startFrom < clip.startTime + clip.duration) {
          audio.currentTime = startFrom - clip.startTime;
          audio.play().catch(() => {});
        }
      });
      timelineVideoClips.forEach(clip => {
        const video = timelineVideoRefs.current[clip.id];
        if (video && startFrom >= clip.startTime && startFrom < clip.startTime + clip.duration) {
          video.currentTime = startFrom - clip.startTime + (clip.trimStart || 0);
          video.play().catch(() => {});
        }
      });
    }
    setIsPlayingTimeline(prev => !prev);
  };

  // rAF animation loop
  useEffect(() => {
    if (isPlayingTimeline) {
      lastUpdateRef.current = performance.now();

      const tick = () => {
        const now = performance.now();
        const delta = (now - (lastUpdateRef.current ?? now)) / 1000;
        lastUpdateRef.current = now;

        setTimelineTime(prevTime => {
          const newTime = prevTime + delta;

          timelineClips.forEach(clip => {
            if (prevTime <= clip.startTime && newTime > clip.startTime) {
              const audio = timelineAudioRefs.current[clip.id];
              if (audio) {
                audio.currentTime = 0;
                audio.play().catch(() => {});
              }
            }
          });

          timelineVideoClips.forEach(clip => {
            if (prevTime <= clip.startTime && newTime > clip.startTime) {
              const video = timelineVideoRefs.current[clip.id];
              if (video) {
                video.currentTime = clip.trimStart || 0;
                video.play().catch(() => {});
              }
            }
          });

          return newTime;
        });

        animationRef.current = requestAnimationFrame(tick);
      };

      animationRef.current = requestAnimationFrame(tick);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      Object.values(timelineAudioRefs.current).forEach(a => a?.pause());
      Object.values(timelineVideoRefs.current).forEach(v => v?.pause());
    }

    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlayingTimeline, timelineClips]);

  return { seekTimelineTo, toggleTimelinePlay };
}
