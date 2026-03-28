import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const windowsPatchPath = fileURLToPath(
  new URL('./scripts/windows/vite-vitest-netuse-patch.cjs', import.meta.url),
);

const windowsWorkerExecArgv = process.platform === 'win32'
  ? [
      '--preserve-symlinks',
      '--preserve-symlinks-main',
      '--require',
      windowsPatchPath,
    ]
  : [];

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.mjs',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    testTimeout: 20000,
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 1,
    poolOptions: {
      threads: {
        singleThread: true,
        execArgv: windowsWorkerExecArgv,
      },
    },
  },
});
