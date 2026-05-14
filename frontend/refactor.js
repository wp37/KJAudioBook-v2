const fs = require('fs');
const file = 'f:/AntiGravity/AudioBook-KJ/frontend/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace Header
const headerRegex = /<header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950\/80 backdrop-blur-md">[\s\S]*?<\/header>/;
const headerReplacement = \      <Header 
        handleImportProject={handleImportProject}
        exportProject={exportProject}
        handleFileUpload={handleFileUpload}
        handleRenderAll={handleRenderAll}
        handleMixAndExport={handleMixAndExport}
        handleSyncToTimeline={handleSyncToTimeline}
        isGenerating={isGenerating}
      />\;
content = content.replace(headerRegex, headerReplacement);

// Replace ScriptSidebar
const mainRegex = /{activeTab === 'audio' && \([\s\S]*?<main [\s\S]*?<\/main>\s*\)}/;
const mainReplacement = \{activeTab === 'audio' && (
      <ScriptSidebar
        addLine={addLine}
        deleteLine={deleteLine}
        playSample={playSample}
        handleDragOverContainer={handleDragOverContainer}
        handleSort={handleSort}
        createSyntheticVoice={createSyntheticVoice}
        togglePlayVoiceRef={togglePlayVoiceRef}
        handleSaveProfile={handleSaveProfile}
        isSortingMode={isSortingMode}
        setIsSortingMode={setIsSortingMode}
        playingId={playingId}
        isCreatingSynthetic={isCreatingSynthetic}
        playingVoiceRef={playingVoiceRef}
        expandedScriptLines={expandedScriptLines}
        toggleScriptLine={toggleScriptLine}
        expandedVoices={expandedVoices}
        toggleVoice={toggleVoice}
        timelineScrollRef={timelineScrollRef}
        dragItem={dragItem}
        dragOverItem={dragOverItem}
      />
      )}\;
content = content.replace(mainRegex, mainReplacement);

// Replace Timeline
// The timeline block starts with: {(activeTab === 'audio' || activeTab === 'post-production') && (
// And ends before: {activeTab === 'video' && (
const timelineRegex = /{\(activeTab === 'audio' \|\| activeTab === 'post-production'\) && \([\s\S]*?className={activeTab === 'post-production'[\s\S]*?{\/\* Timeline Tracks Container \*\/}[\s\S]*?Timeline Tracks Container[\s\S]*?<\/div>\s*<\/div>\s*\)}/;
// Wait, regex might fail if it doesn't match properly. Let's do it using indexOf and substring.
