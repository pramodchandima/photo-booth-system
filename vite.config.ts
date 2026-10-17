import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.GOOGLE_SCRIPT_URL': JSON.stringify(env.GOOGLE_SCRIPT_URL || ''),
      'import.meta.env.GOOGLE_DRIVE_FOLDER': JSON.stringify(env.GOOGLE_DRIVE_FOLDER || env.GOOGLE_DRIVE_FOLDER_ID || ''),
    },
    envPrefix: ['VITE_', 'GOOGLE_'],
  };
});
