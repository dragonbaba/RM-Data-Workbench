import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'
import fs from 'fs'

const resolveMonacoPlugin = () => {
  const plugin = monacoEditorPlugin as unknown as { default?: typeof monacoEditorPlugin };
  return plugin.default ?? monacoEditorPlugin;
};

const patchFsRecursiveRemove = () => {
  if (!fs.rmSync) return;
  const original = fs.rmdirSync;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fs as any).rmdirSync = (path: string, options?: { recursive?: boolean; force?: boolean }) => {
    if (options?.recursive) {
      return fs.rmSync(path, options);
    }
    return original(path, options as any);
  };
};

patchFsRecursiveRemove();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    resolveMonacoPlugin()({
      languageWorkers: ['editorWorkerService', 'typescript'],
      globalAPI: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('/monaco-editor/') || id.includes('/@monaco-editor/')) {
            return 'vendor-monaco';
          }

          if (id.includes('/pixi.js/') || id.includes('/@pixi/')) {
            return 'vendor-pixi';
          }

          return undefined;
        },
      },
    },
  },
})
