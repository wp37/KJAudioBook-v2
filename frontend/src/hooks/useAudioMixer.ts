// ==========================================================================
// hooks/useAudioMixer.ts
// Handles mixing and downloading the final audiobook output.
// Audio-only mixes use HTTP (fast pydub). Video mixes use WebSocket so
// FFmpeg progress can be streamed back in real time.
// ==========================================================================
import axios from 'axios';
import toast from 'react-hot-toast';
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
      toast.error('Không có clip nào trên Timeline!');
      return;
    }

    setRenderProgress({ status: 'assembling', currentLine: 0, totalLines: 0, finalAudioUrl: null });

    const audioPayload = timelineClips.map(c => ({
      filename: c.filename,
      startTime: c.startTime,
      track: c.track,
    }));

    const hasVideo = timelineVideoClips.length > 0;

    // ── Audio-only mix (fast, use HTTP) ───────────────────────────────────
    if (!hasVideo) {
      try {
        const res = await axios.post(API.mixTimeline, { clips: audioPayload }, { responseType: 'blob' });
        const outUrl = URL.createObjectURL(new Blob([res.data]));
        const anchor = document.createElement('a');
        anchor.href = outUrl;
        anchor.download = 'final_audiobook_mix.mp3';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setRenderProgress({ status: 'done', currentLine: 0, totalLines: 0, finalAudioUrl: outUrl });
      } catch {
        toast.error('Lỗi khi Mix Timeline!');
        setRenderProgress({ status: 'error', currentLine: 0, totalLines: 0, finalAudioUrl: null });
      }
      return;
    }

    // ── Video mix (slow FFmpeg — stream progress over WebSocket) ──────────
    const toastId = toast.loading('Đang kết nối...');

    return new Promise<void>((resolve) => {
      const ws = new WebSocket(API.mixProgressWs);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          audio_clips: audioPayload,
          video_clips: timelineVideoClips.map(c => ({
            videoUrl: c.videoUrl,
            startTime: c.startTime,
            duration: c.duration,
            keepSound: c.keepSound || false,
            volume: c.volume ?? 100,
          })),
        }));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data as string);

        if (msg.type === 'status') {
          toast.loading(msg.message, { id: toastId });

        } else if (msg.type === 'progress') {
          const label = msg.percent != null
            ? `FFmpeg: ${msg.message} (${msg.percent}%)`
            : `FFmpeg: ${msg.message}`;
          toast.loading(label, { id: toastId });

        } else if (msg.type === 'done') {
          toast.loading('Mix xong! Đang tải file về...', { id: toastId });
          ws.close();
          try {
            const res = await axios.get(API.outputFile, { responseType: 'blob' });
            const outUrl = URL.createObjectURL(new Blob([res.data]));
            const anchor = document.createElement('a');
            anchor.href = outUrl;
            anchor.download = 'final_audiobook_video.mp4';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            toast.success('Mix video hoàn tất!', { id: toastId });
            setRenderProgress({ status: 'done', currentLine: 0, totalLines: 0, finalAudioUrl: outUrl });
          } catch {
            toast.error('Mix xong nhưng tải file thất bại!', { id: toastId });
            setRenderProgress({ status: 'error', currentLine: 0, totalLines: 0, finalAudioUrl: null });
          }
          resolve();

        } else if (msg.type === 'error') {
          toast.error(`Lỗi Mix: ${msg.message}`, { id: toastId });
          setRenderProgress({ status: 'error', currentLine: 0, totalLines: 0, finalAudioUrl: null });
          ws.close();
          resolve();
        }
      };

      ws.onerror = () => {
        toast.error('Lỗi kết nối WebSocket với backend!', { id: toastId });
        setRenderProgress({ status: 'error', currentLine: 0, totalLines: 0, finalAudioUrl: null });
        resolve();
      };

      ws.onclose = (e) => {
        // Abnormal close (not triggered by our own ws.close() calls above)
        if (e.code !== 1000 && e.code !== 1005) {
          toast.error('Kết nối WebSocket bị ngắt!', { id: toastId });
          setRenderProgress({ status: 'error', currentLine: 0, totalLines: 0, finalAudioUrl: null });
          resolve();
        }
      };
    });
  };

  return { mixAndExport };
}
