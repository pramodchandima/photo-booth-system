import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Allows loading environment variables with or without VITE_ prefix
  envPrefix: ['VITE_', 'GOOGLE_'],
});
