import { defineConfig } from 'vite';
import path from 'node:path';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    target: 'node18',
    outDir: 'dist/main',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: [
        'electron',
        'electron-updater',
        'electron-log',
        'chokidar',
        'adm-zip',
        'fast-xml-parser',
        'node:fs',
        'node:path',
        'node:os',
        'node:child_process',
        'node:url',
        'node:events',
        'node:stream',
        'node:crypto',
        'fs',
        'path',
        'os',
        'child_process',
        'url',
        'events',
        'stream',
        'crypto',
      ],
    },
  },
});
