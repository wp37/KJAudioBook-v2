// ==========================================================================
// src/types/index.ts
// Central type definitions for the entire AudioBook Studio frontend.
// Import from here instead of re-declaring in each component.
// ==========================================================================

// ── Script & Characters ───────────────────────────────────────────────────

export interface ScriptLine {
  id: number;
  speaker: string;
  text: string;
  visual_references?: string[];  // IDs of entities used as visual references
  image_prompt?: string;
  motion_prompt?: string;        // Motion prompt for AI Video generation
  video_url?: string;            // URL of generated video after render
  is_image_generated?: boolean;
  selected?: boolean;
}

export interface CharacterMetadata {
  type: string;
  name: string;
  description: string;
  image_prompt: string;
  local_image_path: string;
  media_id: string | null;
  last_uploaded_at: number;
  references?: string[];
  variations?: any[];
  variation_context?: string;
}

// ── Timeline: Audio ───────────────────────────────────────────────────────

export interface TimelineClip {
  id: string;         // e.g. `clip_1_1234567`
  lineId: number;
  speaker: string;
  audioUrl: string;
  filename: string;
  track: number;
  startTime: number;
  duration: number;
}

// ── Timeline: Video ───────────────────────────────────────────────────────

export interface TimelineVideoClip {
  id: string;
  lineId: number;
  videoUrl: string;
  startTime: number;
  duration: number;
  trimStart?: number;
  keepSound?: boolean;
  volume?: number;
}

// ── Voice & Rendering ─────────────────────────────────────────────────────

export interface VoiceParams {
  gender: string;
  age: string;
  pitch: string;
}

export interface RenderProgress {
  status: 'idle' | 'rendering' | 'assembling' | 'done' | 'error';
  currentLine: number;
  totalLines: number;
  finalAudioUrl: string | null;
}
