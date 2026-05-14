# 🏗️ Refactoring Plan: AudioBook Studio

This document outlines the strategy for breaking down the massive `App.tsx`, `VideoStudio.tsx`, and `server.py` into a modular, maintainable, and scalable architecture.

---

## 📋 Pre-Work: Backend Cleanup

> **Must do before any refactoring.** The `audiobook_builder/` directory has 20+ leftover patch/fix/recover scripts from previous debug sessions.

- **Delete all `patch_*.py`, `fix_*.py`, `recover_*.py` files** — these are dead weight and can cause confusion when navigating the new modular structure.
- **Note:** `main.py` is the *original CLI batch processor* (not a web server entry point). It will be kept as-is or renamed to `cli_batch.py` to avoid confusion with the new `main.py` entry point post-refactor.

---

## Phase 0: Foundation (Do First — Everything Else Depends On This)

### 0.1. Centralized Types (`src/types/index.ts`)
Move all shared interfaces into a single file before splitting any component.
- `ScriptLine`, `TimelineClip`, `TimelineVideoClip`
- `SpeakerVoiceParams`, `CharacterMetadata`
- Doing this first prevents each split component from re-declaring its own local types.

### 0.2. Centralized Config (`src/config.ts`)
Remove all hardcoded `http://localhost:8000/api/...` strings across `App.tsx` **and** `VideoStudio.tsx`.
```ts
// src/config.ts
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
```
Use `.env` for deployment flexibility. Both files reference the same constant from now on.

---

## Phase 1: Frontend Refactoring (`App.tsx`)

Currently **~2200 lines**, handling state, API calls, event listeners, and complex DAW rendering simultaneously.

### 1.1. Custom Hooks (Extract Logic First)
Before splitting UI, extract the heavy logic functions:
- **`hooks/useKeyboardShortcuts.ts`** — Space/Arrow key global event listener.
- **`hooks/useTimelinePlayback.ts`** — `toggleTimelinePlay`, `seekTimelineTo`, animation loop, audio/video sync.
- **`hooks/useAudioMixer.ts`** — `/api/mix-timeline` and `/api/mix-video-timeline` calls + download logic.
- **`hooks/useScriptManager.ts`** — `toggleScriptLine`, `addLine`, `deleteLines`, import/export JSON.

### 1.2. State Extraction (Zustand)
Move all project-level states out to prevent the entire app re-rendering on every state change:
- **`store/useProjectStore.ts`** — `script`, `timelineClips`, `timelineVideoClips`, `activeTab`, `lockedVoices`, `speakerVoiceParams`.
- **`store/usePlaybackStore.ts`** — `isPlayingTimeline`, `timelineTime`, `zoomLevel`, drag/drop IDs, `selectedTimelineVideoClipId`, `selectedTimelineAudioClipId`.

### 1.3. Component Splitting
Break `App.tsx` UI rendering into focused components:
- **`components/layout/Header.tsx`** — Top nav, tab switcher, Export/Save buttons.
- **`components/script/ScriptSidebar.tsx`** — Left column: voice selection, line list, `toggleScriptLine`.
- **`components/timeline/Timeline.tsx`** — DAW ruler + track container.
- **`components/timeline/AudioClip.tsx`** — Individual audio clip renderer with drag logic.
- **`components/timeline/VideoClip.tsx`** — Individual video clip renderer with resize handles.
- **`components/inspector/PropertiesInspector.tsx`** — Right sidebar: volume, offset, keep-sound toggles.

---

## Phase 2: Frontend Refactoring (`VideoStudio.tsx`)

Currently **~52KB** — equally large as App.tsx but completely missing from the original plan.

### 2.1. Custom Hooks
- **`hooks/useNodeGraph.ts`** — ReactFlow node/edge state management, `onNodesChange`, `onEdgesChange`.
- **`hooks/useAIDirector.ts`** — Storyboard generation, visual prompt logic.

### 2.2. Component Splitting
- **`components/videostudio/SceneNodeCard.tsx`** — The custom ReactFlow node component.
- **`components/videostudio/VideoSidebar.tsx`** — Left panel: script line list with active highlighting.
- **`components/videostudio/VideoInspector.tsx`** — Right panel: video node properties when a node is selected.

---

## Phase 3: Backend Refactoring (`server.py`)

Currently **953 lines, 33 endpoints** acting as a monolithic router.

### 3.1. Router Modularity
Split into domain-specific routers under `routers/`:
- **`routers/audio.py`** — `/api/audio`, `/api/generate-tts`, `/api/test-voice`, `/api/create-synthetic-voice`, `/api/render-line`, `/api/assemble-audio`
- **`routers/video.py`** — `/api/generate-scene-video`, `/api/check-video-status`, `/api/video`, `/api/debug-veo`, `/api/generate-storyboard`, `/api/generate-scene-frame`
- **`routers/script.py`** — `/api/generate-script`, `/api/regen-visual-prompt`, `/api/extract-entities`, `/api/enhance-prompt`, `/api/enhance-motion`
- **`routers/assets.py`** — `/api/upload-character-image`, `/api/generate-asset-image`, `/api/download-asset-image`, `/api/delete-variation`, `/api/update-asset`, `/api/set-official-variation`, `/api/toggle-reference-variation`, `/api/image`
- **`routers/export.py`** — `/api/mix-timeline`, `/api/mix-video-timeline`
- **`routers/project.py`** — `/api/characters-metadata`, `/api/project-profile`
- **`routers/flowkit.py`** — `/ws/flowkit`, `/api/ext/callback`

### 3.2. Services Extraction
Move heavy processing out of route handlers:
- **`services/ffmpeg_service.py`** — All `subprocess.run(["ffmpeg", ...])` filter-graph logic for mixing audio and video.
- **`services/ai_service.py`** — MiniMax TTS HTTP requests and Gemini CLI subprocess calls.
- **`services/file_manager.py`** — Save/check/cleanup of disk assets and temp files.

### 3.3. New `server.py` Entry Point
The new `server.py` will be lightweight — only CORS config, lifespan, and router registration:
```python
app = FastAPI(lifespan=lifespan)
app.include_router(audio.router)
app.include_router(video.router)
# ...etc
```

### 3.4. Backend Testing Strategy
After each router is split, run a quick smoke test before proceeding:
```powershell
# test that all endpoints still respond
python -m pytest tests/ -v
```
A lightweight `tests/` directory with one request per endpoint group to catch any broken imports or missing dependencies.

---

## Phase 4: Core Infrastructure

### 4.1. Storage: `localStorage` → `localForage` (IndexedDB)
Replace all `localStorage.setItem/getItem` calls in both `App.tsx` and `VideoStudio.tsx` with `localForage`. Handles projects with hundreds of script lines without hitting the 5MB browser limit.

### 4.2. Real-time Render Progress (FastAPI WebSockets)
The `/api/mix-video-timeline` ffmpeg render can take minutes. Implement a WebSocket endpoint (`/ws/render-progress`) that streams `ffmpeg` stderr frame-by-frame to the frontend for a live progress bar. FastAPI natively supports this without extra dependencies.

### 4.3. API State Management (React Query / TanStack Query)
Replace manual `axios` + `useState(isLoading)` patterns with **TanStack Query**. Provides automatic caching, background refetch, retry on failure, and loading/error states — eliminating ~200 lines of boilerplate across both frontend files.

### 4.4. Unified Notifications (`react-hot-toast`)
Replace all `alert()` calls with `react-hot-toast` toasts. Success, error, and loading states unified in a single non-blocking UI system.

---

## 🚀 Execution Order (Correct Dependency Sequence)

| Step | Task | Why This Order |
|------|------|---------------|
| **0** | 🧹 Delete patch/fix/recover files from `audiobook_builder/` | Clean slate before moving anything |
| **1** | 📐 Create `src/types/index.ts` | All components and hooks need shared types |
| **2** | ⚙️ Create `src/config.ts` + `.env` | Eliminate hardcoded URLs in both frontend files |
| **3** | 🪝 Extract custom hooks from `App.tsx` | Logic out before UI split |
| **4** | 🧩 Split `App.tsx` into components | Hooks exist, types exist — safe to split |
| **5** | 🪝 Extract custom hooks from `VideoStudio.tsx` | Mirror same approach |
| **6** | 🧩 Split `VideoStudio.tsx` into components | Hooks exist, types exist — safe to split |
| **7** | 🗄️ Extract Zustand stores | Components exist — wire them to shared state |
| **8** | 💾 Migrate `localStorage` → `localForage` | All state code is finalized before touching persistence |
| **9** | 🛣️ Split `server.py` routers (one at a time, test each) | Backend is independent from frontend refactor |
| **10** | ⚙️ Extract `services/` from routers | Routers exist and work before extracting their internals |
| **11** | 📡 Add WebSocket render progress | Backend services exist — add streaming on top |
| **12** | 🔔 Add `react-hot-toast` notifications | Final polish once everything else is stable |
| **13** | 🔄 Add TanStack Query | Replace axios patterns after app is stable |
