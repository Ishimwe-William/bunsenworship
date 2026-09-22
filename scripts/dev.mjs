import { createServer, build } from 'vite';
import { spawn } from 'node:child_process';
import electronPath from 'electron';

async function start() {
  console.log('[Dev] Compiling preload and main process...');
  await build({ configFile: 'vite.preload.config.ts' });
  await build({ configFile: 'vite.main.config.ts' });

  console.log('[Dev] Starting Vite dev server for renderer...');
  const server = await createServer({
    configFile: 'vite.renderer.config.ts',
  });
  await server.listen();

  const address = server.httpServer.address();
  const port = typeof address === 'object' && address !== null ? address.port : 5173;
  const devUrl = `http://localhost:${port}`;
  console.log(`[Dev] Renderer dev server live at ${devUrl}`);

  console.log('[Dev] Launching Electron...');
  const electronProcess = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devUrl,
      NODE_ENV: 'development',
    },
  });

  electronProcess.on('close', (code) => {
    server.close();
    process.exit(code || 0);
  });
}

start().catch((err) => {
  console.error('[Dev] Error starting application:', err);
  process.exit(1);
});
