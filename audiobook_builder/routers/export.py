import os
import re
import math
import asyncio
import subprocess
from typing import List
from urllib.parse import urlparse, parse_qs
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pydub import AudioSegment
from state import TEMP_DIR, OUTPUT_DIR

router = APIRouter()


class TimelineClipRequest(BaseModel):
    filename: str
    startTime: float
    track: int


class TimelineVideoClipRequest(BaseModel):
    videoUrl: str
    startTime: float
    duration: float
    trimStart: float = 0.0
    keepSound: bool = False
    volume: float = 100.0


class MixTimelineRequest(BaseModel):
    clips: List[TimelineClipRequest]


class MixVideoTimelineRequest(BaseModel):
    audio_clips: List[TimelineClipRequest]
    video_clips: List[TimelineVideoClipRequest]


def _resolve_clip_path(filename: str) -> str | None:
    for candidate in [filename, os.path.join(TEMP_DIR, os.path.basename(filename)),
                      os.path.join(OUTPUT_DIR, os.path.basename(filename))]:
        if os.path.exists(candidate):
            return candidate
    return None


def _parse_ffmpeg_time(time_str: str) -> float:
    parts = time_str.split(":")
    return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])


def _build_video_mix_assets(req: MixVideoTimelineRequest):
    """Download videos, build audio mix, return (audio_out, downloaded_videos, max_duration_sec, ffmpeg_cmd)."""
    import requests as _requests

    audio_objects = []
    max_duration = 0
    for clip in req.audio_clips:
        path = _resolve_clip_path(clip.filename)
        if not path:
            continue
        audio = AudioSegment.from_file(path)
        end_ms = int(clip.startTime * 1000) + len(audio)
        if end_ms > max_duration:
            max_duration = end_ms
        audio_objects.append((audio, int(clip.startTime * 1000)))

    temp_vid_dir = os.path.join(OUTPUT_DIR, "temp_videos")
    os.makedirs(temp_vid_dir, exist_ok=True)
    downloaded_videos = []
    for i, vc in enumerate(req.video_clips):
        parsed = urlparse(vc.videoUrl)
        qs = parse_qs(parsed.query)
        if "path" in qs and os.path.exists(qs["path"][0]):
            local_path = qs["path"][0]
        else:
            local_path = os.path.join(temp_vid_dir, f"video_{i}.mp4")
            try:
                r = _requests.get(vc.videoUrl, stream=True, timeout=15)
                if r.status_code == 200:
                    with open(local_path, "wb") as f:
                        for chunk in r.iter_content(8192):
                            f.write(chunk)
                else:
                    continue
            except Exception as e:
                print(f"Error downloading {vc.videoUrl}: {e}")
                continue

        video_end_ms = int((vc.startTime + vc.duration) * 1000)
        if video_end_ms > max_duration:
            max_duration = video_end_ms
        downloaded_videos.append({
            "path": local_path, "start": vc.startTime,
            "dur": vc.duration, "trimStart": vc.trimStart,
            "keepSound": vc.keepSound, "volume": vc.volume,
        })

    if not audio_objects and not downloaded_videos:
        raise Exception("No valid clips found.")

    final_audio = AudioSegment.silent(duration=math.ceil(max_duration))
    for audio, pos in audio_objects:
        final_audio = final_audio.overlay(audio, position=pos)
    for dv in downloaded_videos:
        if not dv["keepSound"]:
            continue
        try:
            vid_audio = AudioSegment.from_file(dv["path"])
            trim_ms = int(dv["trimStart"] * 1000)
            vid_audio = vid_audio[trim_ms: trim_ms + int(dv["dur"] * 1000)]
            vol = dv["volume"]
            if vol != 100.0:
                vid_audio = (vid_audio - 100) if vol <= 0 else (vid_audio + 20 * math.log10(vol / 100.0))
            final_audio = final_audio.overlay(vid_audio, position=int(dv["start"] * 1000))
        except Exception:
            pass

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    audio_out = os.path.join(OUTPUT_DIR, "assembled.mp3")
    final_audio.export(audio_out, format="mp3")

    if not downloaded_videos:
        raise Exception("No valid video clips were downloaded.")

    out_video = os.path.join(OUTPUT_DIR, "assembled.mp4")
    inputs = []
    filter_complex = f"color=c=black:s=1280x720:d={max_duration / 1000}[base];"
    for i, dv in enumerate(downloaded_videos):
        inputs.extend(["-i", dv["path"]])
        filter_complex += (
            f"[{i}:v]trim=start={dv['trimStart']}:duration={dv['dur']},"
            f"setpts=PTS-STARTPTS+{dv['start']}/TB,scale=1280:720[v{i}];"
        )
    prev = "[base]"
    for i, dv in enumerate(downloaded_videos):
        nxt = f"[ov{i}]" if i < len(downloaded_videos) - 1 else "[v_out]"
        filter_complex += f"{prev}[v{i}]overlay=enable='between(t,{dv['start']},{dv['start'] + dv['dur']})'{nxt};"
        prev = nxt
    inputs.extend(["-i", audio_out])

    cmd = ["ffmpeg", "-y"] + inputs + [
        "-filter_complex", filter_complex,
        "-map", "[v_out]",
        "-map", f"{len(downloaded_videos)}:a",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
        out_video,
    ]
    return audio_out, downloaded_videos, max_duration / 1000, cmd, out_video


@router.post("/api/mix-timeline")
async def api_mix_timeline(req: MixTimelineRequest):
    try:
        audio_objects = []
        max_duration = 0
        for clip in req.clips:
            path = _resolve_clip_path(clip.filename)
            if not path:
                continue
            audio = AudioSegment.from_file(path)
            end_ms = int(clip.startTime * 1000) + len(audio)
            if end_ms > max_duration:
                max_duration = end_ms
            audio_objects.append((audio, int(clip.startTime * 1000)))

        if not audio_objects:
            raise Exception("No valid audio clips found to mix.")

        final = AudioSegment.silent(duration=math.ceil(max_duration))
        for audio, pos in audio_objects:
            final = final.overlay(audio, position=pos)

        os.makedirs(OUTPUT_DIR, exist_ok=True)
        out = os.path.join(OUTPUT_DIR, "assembled.mp3")
        final.export(out, format="mp3")
        return FileResponse(out, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/mix-video-timeline")
async def api_mix_video_timeline(req: MixVideoTimelineRequest):
    try:
        _, _, _, cmd, out_video = _build_video_mix_assets(req)
        print("Running FFmpeg:", " ".join(cmd))
        subprocess.run(cmd, check=True)
        return FileResponse(out_video, media_type="video/mp4")
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(500, str(e))


@router.get("/api/output-file")
async def get_output_file():
    """Serve the most recently assembled output file (video or audio)."""
    out_video = os.path.join(OUTPUT_DIR, "assembled.mp4")
    if os.path.exists(out_video):
        return FileResponse(out_video, media_type="video/mp4", filename="final_audiobook_video.mp4")
    out_audio = os.path.join(OUTPUT_DIR, "assembled.mp3")
    if os.path.exists(out_audio):
        return FileResponse(out_audio, media_type="audio/mpeg", filename="final_audiobook_mix.mp3")
    raise HTTPException(404, "No output file found. Run a mix first.")


@router.websocket("/ws/mix-progress")
async def ws_mix_progress(websocket: WebSocket):
    """Mix video timeline with real-time FFmpeg progress streamed over WebSocket."""
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        req = MixVideoTimelineRequest(**data)

        await websocket.send_json({"type": "status", "message": "Đang tải video và ghép audio..."})
        loop = asyncio.get_event_loop()

        # Heavy setup (download + pydub) runs in a thread to avoid blocking the event loop
        _, _, total_seconds, cmd, out_video = await loop.run_in_executor(
            None, _build_video_mix_assets, req
        )

        await websocket.send_json({"type": "status", "message": "Đang chạy FFmpeg..."})

        # Run FFmpeg in a thread and stream stderr progress back via asyncio.Queue
        progress_queue: asyncio.Queue = asyncio.Queue()

        def ffmpeg_thread():
            proc = subprocess.Popen(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
            buf = b""
            while True:
                chunk = proc.stderr.read(512)
                if not chunk:
                    break
                buf += chunk
                while True:
                    idx_r = buf.find(b"\r")
                    idx_n = buf.find(b"\n")
                    candidates = [i for i in [idx_r, idx_n] if i >= 0]
                    if not candidates:
                        break
                    idx = min(candidates)
                    line = buf[:idx].decode("utf-8", errors="replace").strip()
                    buf = buf[idx + 1:]
                    if line:
                        loop.call_soon_threadsafe(progress_queue.put_nowait, ("line", line))
            proc.wait()
            loop.call_soon_threadsafe(progress_queue.put_nowait, ("done", proc.returncode))

        loop.run_in_executor(None, ffmpeg_thread)

        while True:
            msg_type, value = await progress_queue.get()
            if msg_type == "line":
                match = re.search(r"time=(\d+:\d+:\d+\.\d+)", value)
                if match and total_seconds > 0:
                    time_str = match.group(1)
                    elapsed = _parse_ffmpeg_time(time_str)
                    percent = min(99, int(elapsed / total_seconds * 100))
                    await websocket.send_json({
                        "type": "progress",
                        "message": time_str,
                        "percent": percent,
                    })
            elif msg_type == "done":
                returncode = value
                break

        if returncode == 0:
            await websocket.send_json({"type": "done"})
        else:
            await websocket.send_json({"type": "error", "message": "FFmpeg thất bại (returncode != 0)"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        import traceback; traceback.print_exc()
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
