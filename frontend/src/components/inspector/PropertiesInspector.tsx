// ==========================================================================
// components/inspector/PropertiesInspector.tsx
// Right sidebar for the Post-Production tab.
// Shows properties of the currently selected audio or video clip.
// Reads/writes state via Zustand stores — zero prop drilling for state.
// ==========================================================================
import React from 'react';
import { Settings, Play, Mic, Video } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';

export function PropertiesInspector() {
  const script                     = useProjectStore(s => s.script);
  const timelineClips              = useProjectStore(s => s.timelineClips);
  const timelineVideoClips         = useProjectStore(s => s.timelineVideoClips);
  const setTimelineClips           = useProjectStore(s => s.setTimelineClips);
  const setTimelineVideoClips      = useProjectStore(s => s.setTimelineVideoClips);
  const selectedTimelineVideoClipId = usePlaybackStore(s => s.selectedTimelineVideoClipId);
  const selectedTimelineAudioClipId = usePlaybackStore(s => s.selectedTimelineAudioClipId);

  // Derived selections
  const selectedLine = script.find(l => l.selected);
  const selectedVideoClip = selectedTimelineVideoClipId
    ? timelineVideoClips.find(c => c.id === selectedTimelineVideoClipId)
    : timelineVideoClips.find(c => c.lineId === selectedLine?.id);
  const selectedAudioClip = selectedTimelineAudioClipId
    ? timelineClips.find(c => c.id === selectedTimelineAudioClipId)
    : timelineClips.find(c => c.lineId === selectedLine?.id);

  return (
    <div className="w-[340px] bg-slate-900 border-l border-slate-800 p-5 overflow-y-auto flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.2)] z-10">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-700 pb-3 mb-5">
        <Settings className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Properties Inspector</h3>
      </div>

      {/* Empty state */}
      {!selectedLine ? (
        <div className="text-xs text-slate-500 text-center py-12 border border-dashed border-slate-700 rounded-xl bg-slate-900/50 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
            <Play className="w-5 h-5 text-slate-600" />
          </div>
          <span>Click a clip on the timeline<br/>to inspect and edit properties</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* General Info */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Line Info</h4>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-500">Speaker</span>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">{selectedLine.speaker}</span>
              </div>
              <p className="text-xs text-slate-300 italic line-clamp-3">"{selectedLine.text}"</p>
            </div>
          </div>

          {/* Video Properties */}
          {selectedVideoClip ? (
            <div>
              <h4 className="text-xs font-semibold text-amber-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                <Video className="w-3 h-3" /> Video Properties
              </h4>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col gap-3">
                {/* Keep Sound toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300">Keep Original Sound</label>
                  <button
                    onClick={() => {
                      setTimelineVideoClips(prev =>
                        prev.map(c => c.id === selectedVideoClip.id ? { ...c, keepSound: !c.keepSound } : c)
                      );
                    }}
                    className={`text-[10px] px-2 py-1 rounded transition-colors font-semibold ${selectedVideoClip.keepSound ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                  >
                    {selectedVideoClip.keepSound ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Volume slider */}
                {selectedVideoClip.keepSound && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-300">Volume</label>
                      <span className="text-[10px] text-emerald-400 font-mono">{selectedVideoClip.volume ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={selectedVideoClip.volume ?? 100}
                      onChange={(e) => {
                        setTimelineVideoClips(prev =>
                          prev.map(c => c.id === selectedVideoClip.id ? { ...c, volume: parseInt(e.target.value) } : c)
                        );
                      }}
                      className="w-full accent-emerald-500 bg-slate-700 h-1.5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                    />
                  </div>
                )}

                {/* Offset time */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-xs text-slate-300">Offset Time (s)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={selectedVideoClip.startTime.toFixed(1)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setTimelineVideoClips(prev =>
                            prev.map(c => c.id === selectedVideoClip.id ? { ...c, startTime: val } : c)
                          );
                        }
                      }}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 w-full font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-900/10 border border-amber-500/20 rounded-lg p-3 text-center">
              <span className="text-xs text-amber-500/70">No video clip linked to this line.</span>
            </div>
          )}

          {/* Audio Properties */}
          {selectedAudioClip && (
            <div>
              <h4 className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                <Mic className="w-3 h-3" /> Audio Properties
              </h4>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-xs text-slate-300">Offset Time (s)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={selectedAudioClip.startTime.toFixed(1)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setTimelineClips(prev =>
                            prev.map(c => c.id === selectedAudioClip.id ? { ...c, startTime: val } : c)
                          );
                        }
                      }}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 w-full font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
