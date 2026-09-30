import { execSync } from 'node:child_process';
import process from 'node:process';

console.log(`[build:all] Host platform: ${process.platform}`);

if (process.platform === 'win32') {
  console.log('[build:all] Windows detected: building PowerPoint COM Helper...');
  try {
    execSync('powershell -ExecutionPolicy Bypass -File helper/install-dotnet-sdk.ps1', { stdio: 'inherit' });
    execSync('powershell -ExecutionPolicy Bypass -File helper/build-helper.ps1', { stdio: 'inherit' });
  } catch (err) {
    console.warn('[build:all] Warning: PowerPoint COM helper build step encountered an error. Proceeding with bundle build...', err);
  }
} else {
  console.log('[build:all] Non-Windows platform (macOS/Linux): skipping Windows-only PowerPoint COM helper.');
}

console.log('[build:all] Building renderer, preload, and main process bundles...');
execSync('npm run build', { stdio: 'inherit' });
console.log('[build:all] Build completed successfully.');
