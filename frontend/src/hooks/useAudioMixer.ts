// ==========================================================================
// hooks/useAudioMixer.ts
// Handles mixing and downloading the final audiobook output.
// Calls /api/mix-timeline (audio only) or /api/mix-video-timeline (with video).
// ==========================================================================
import { useState } from 'react';
import axios from 'axios';
import type { TimelineClip, TimelineVideoClip, RenderProgress } from '../types';
import { API } from '../config';

interface UseAudioMixerOptions {
  timelineClips: TimelineClip[];
  timelineVideoClips: TimelineVideoClip[];
  setRenderProgress: React.Dispatch<React.SetStateAction<RenderProgress>>;
}

export function useAudioMixer({
  timelineClips,
  timelineVideoClips,
  setRenderProgress,
}: UseAudioMixerOptions) {

  const mixAndExport = async () => {
    if (timelineClips.length === 0) {
      alert('Không có clip nào trên Timeline!');
      return;
    }

    setRenderProgress({ status: 'assembling', currentLine: 0, totalLines: 0, finalAudioUrl: null });

    try {
      const audioPayload = timelineClips.map(c => ({
        filename: c.filename,
        startTime: c.startTime,
        track: c.track,
      }));

      const hasVideo = timelineVideoClips.length > 0;
      let downloadName = 'final_audiobook_mix.mp3';
      let res;

      if (hasVideo) {
        downloadName = 'final_audiobook_video.mp4';
        res = await axios.post(
          API.mixVideoTimeline,
          {
            audio_clips: audioPayload,
            video_clips: timelineVideoClips.map(c => ({
              videoUrl: c.videoUrl,
              startTime: c.startTime,
              duration: c.duration,
              keepSound: c.keepSound || false,
              volume: c.volume ?? 100,
            })),
          },
          { responseType: 'blob' }
        );
      } else {
        res = await axios.post(
          API.mixTimeline,
          { clips: audioPayload },
          { responseType: 'blob' }
        );
      }

      const outUrl = URL.createObjectURL(new Blob([res.data]));
      const anchor = document.createElement('a');
      anchor.href = outUrl;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setRenderProgress({ status: 'done', currentLine: 0, totalLines: 0, finalAudioUrl: outUrl });
    } catch (e) {
      console.error('Lỗi Mix:', e);
      alert('Lỗi khi Mix Timeline!');
      setRenderProgress({ status: 'error', currentLine: 0, totalLines: 0, finalAudioUrl: null });
    }
  };

  return { mixAndExport };
}
