// ==========================================================================
// components/layout/Header.tsx
// Top navigation bar: logo, tab switcher, action buttons.
// State (activeTab, renderProgress) from Zustand.
// Callbacks passed as props (handleRenderAll, handleMixAndExport, etc.)
// because they rely on business logic still in App.tsx.
// ==========================================================================
import React, { useRef } from 'react';
import {
  Mic, Video, Settings, Play, Pause, Download,
  Upload, Save, FolderOpen, Loader2,
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';

interface HeaderProps {
  // File ops
  handleImportProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportProject: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Actions
  handleRenderAll: () => void;
  handleMixAndExport: () => void;
  handleSyncToTimeline: () => void;
  // Loading states
  isGenerating: boolean;
}

export function Header({
  handleImportProject,
  exportProject,
  handleFileUpload,
  handleRenderAll,
  handleMixAndExport,
  handleSyncToTimeline,
  isGenerating,
}: HeaderProps) {
  const activeTab        = useProjectStore(s => s.activeTab);
  const setActiveTab     = useProjectStore(s => s.setActiveTab);
  const renderProgress   = useProjectStore(s => s.renderProgress);
  const script           = useProjectStore(s => s.script);
  const timelineVideoClips = useProjectStore(s => s.timelineVideoClips);

  const importInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  const isRendering = renderProgress.status === 'rendering' || renderProgress.status === 'assembling';
  const selectedCount = script.filter(l => l.selected).length;

  const renderButtonLabel = renderProgress.status === 'rendering'
    ? `Đang Render (${renderProgress.currentLine}/${renderProgress.totalLines})`
    : renderProgress.status === 'assembling'
    ? 'Đang Ghép Nối...'
    : selectedCount > 0
    ? `Render Selected (${selectedCount})`
    : 'Render All';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AudioBook Studio
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-1 rounded-xl bg-slate-900/80 p-1 border border-slate-800 w-fit">
          <button
            id="tab-audio"
            onClick={() => setActiveTab('audio')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'audio'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Mic className="w-4 h-4" /> Audio Studio
          </button>
          <button
            id="tab-video"
            onClick={() => setActiveTab('video')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'video'
                ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Video className="w-4 h-4" /> Video Studio
          </button>
          <button
            id="tab-post-production"
            onClick={() => setActiveTab('post-production')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'post-production'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-4 h-4" /> Post-Production
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">

          {/* Audio Studio Actions */}
          {activeTab === 'audio' && (
            <>
              {/* Hidden file inputs */}
              <input
                type="file" accept=".json" className="hidden"
                ref={importInputRef}
                onChange={handleImportProject}
              />
              <input
                type="file" accept=".md,.txt" className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />

              <button
                id="btn-load-json"
                onClick={() => importInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Load kịch bản (JSON)"
              >
                <FolderOpen className="w-4 h-4" /> Load JSON
              </button>

              <button
                id="btn-save-json"
                onClick={exportProject}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-r border-slate-700 pr-4 mr-1"
                title="Lưu kịch bản (JSON)"
              >
                <Save className="w-4 h-4" /> Save JSON
              </button>

              <button
                id="btn-upload-md"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isGenerating ? 'Đang nhờ AI...' : 'Upload .md'}
              </button>

              <button
                id="btn-render-all"
                onClick={handleRenderAll}
                disabled={isRendering || isGenerating}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                {renderButtonLabel}
              </button>
            </>
          )}

          {/* Post-Production Actions */}
          {activeTab === 'post-production' && (
            <>
              {renderProgress.status === 'done' && renderProgress.finalAudioUrl && (
                <a
                  href={renderProgress.finalAudioUrl}
                  download={timelineVideoClips.length > 0 ? 'Final_Audiobook_Video.mp4' : 'Final_Audiobook.mp3'}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition-colors animate-pulse"
                >
                  <Download className="w-4 h-4" />
                  {timelineVideoClips.length > 0 ? 'Tải Video Về' : 'Tải Audio Về'}
                </a>
              )}
              <button
                id="btn-mix-export"
                onClick={handleMixAndExport}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                Mix & Export
              </button>
            </>
          )}

          {/* Video Studio Actions */}
          {activeTab === 'video' && (
            <button
              id="btn-sync-timeline"
              onClick={() => { handleSyncToTimeline(); setActiveTab('post-production'); }}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Video className="w-4 h-4 fill-current" />
              Sync To Timeline
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
