// API Configuration
// Automatically uses environment variables based on deployment

export const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.origin) ||
  'http://localhost:8000';

export const API_ENDPOINTS = {
  // Audio
  audio: `${API_BASE_URL}/api/audio`,
  renderLine: `${API_BASE_URL}/api/render-line`,
  assembleAudio: `${API_BASE_URL}/api/assemble-audio`,
  testVoice: `${API_BASE_URL}/api/test-voice`,
  
  // Video
  video: `${API_BASE_URL}/api/video`,
  
  // Script
  script: `${API_BASE_URL}/api/script`,
  
  // Assets
  assets: `${API_BASE_URL}/api/assets`,
  
  // Export
  export: `${API_BASE_URL}/api/export`,
  
  // Project
  project: `${API_BASE_URL}/api/project`,
  
  // FlowKit
  flowkit: `${API_BASE_URL}/api/flowkit`,
};
