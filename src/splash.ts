import { app, BrowserWindow } from 'electron';

export const createSplashScreen = (): BrowserWindow => {
  const splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      sandbox: true,
    },
  });

  const splashHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      user-select: none;
    }
    body {
      width: 480px;
      height: 320px;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .splash-card {
      width: 100%;
      height: 100%;
      background: #0d121d;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 34px 32px 24px;
      box-shadow: 0 24px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
      position: relative;
      overflow: hidden;
    }
    .splash-glow {
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      width: 280px;
      height: 180px;
      background: radial-gradient(circle, rgba(0, 229, 255, 0.15) 0%, rgba(99, 102, 241, 0.08) 50%, transparent 80%);
      pointer-events: none;
    }
    .splash-main {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      z-index: 1;
    }
    .logo-container {
      position: relative;
      width: 82px;
      height: 82px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: logoFloat 3s ease-in-out infinite;
    }
    @keyframes logoFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .logo-svg {
      width: 82px;
      height: 82px;
      filter: drop-shadow(0 6px 18px rgba(255, 61, 0, 0.35));
    }
    .splash-title-group {
      text-align: center;
    }
    .splash-title {
      font-size: 1.625rem;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    .splash-title span {
      background: linear-gradient(135deg, #00E5FF 0%, #6366f1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .splash-subtitle {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      margin-top: 5px;
    }
    .splash-footer {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 1;
    }
    .progress-bar-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #00e5ff, #6366f1, #ff3d00);
      border-radius: 4px;
      animation: progressAnim 1.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes progressAnim {
      0% { width: 5%; }
      35% { width: 45%; }
      75% { width: 85%; }
      100% { width: 100%; }
    }
    .splash-status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.6875rem;
      color: #64748b;
    }
    .status-text {
      color: #94a3b8;
      font-weight: 500;
    }
    .version-text {
      color: #475569;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="splash-card">
    <div class="splash-glow"></div>
    <div class="splash-main">
      <div class="logo-container">
        <svg class="logo-svg" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="128" height="128" rx="26" fill="#141922" stroke="#1F2633" stroke-width="2" />
          <path d="M-18 23L-53.507 -28L17.507 -28L-18 23Z" fill="url(#ambient)" />
          <circle cx="64" cy="82" r="26.5" fill="#141922" stroke="#00E5FF" stroke-width="2.5" />
          <ellipse cx="64" cy="61.5" rx="22.5" ry="34" fill="url(#flameOuter)" />
          <ellipse cx="64" cy="68" rx="11.5" ry="20.5" fill="url(#flameInner)" />
          <defs>
            <linearGradient id="ambient" x1="-18" y1="23" x2="-18" y2="-45" gradientUnits="userSpaceOnUse">
              <stop stop-color="#00E5FF" stop-opacity="0.15" />
              <stop offset="0.85" stop-color="#00E5FF" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="flameOuter" x1="64" y1="95.5" x2="64" y2="27.5" gradientUnits="userSpaceOnUse">
              <stop stop-color="#FF3D00" />
              <stop offset="1" stop-color="#FF9100" />
            </linearGradient>
            <linearGradient id="flameInner" x1="64" y1="88.5" x2="64" y2="47.5" gradientUnits="userSpaceOnUse">
              <stop offset="0.1" stop-color="#FFEA00" />
              <stop offset="0.9" stop-color="#FFEA00" stop-opacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="splash-title-group">
        <h1 class="splash-title">Bunsen<span>Worship</span></h1>
        <p class="splash-subtitle">PRO CONSOLE &bull; WORSHIP PRESENTATION</p>
      </div>
    </div>

    <div class="splash-footer">
      <div class="progress-bar-track">
        <div class="progress-bar-fill"></div>
      </div>
      <div class="splash-status-row">
        <span class="status-text" id="statusLabel">Initializing presentation engine...</span>
        <span class="version-text">v${app.getVersion()}</span>
      </div>
    </div>
  </div>

  <script>
    const messages = [
      'Initializing presentation engine...',
      'Loading worship workspace...',
      'Connecting projection outputs...',
      'Ready'
    ];
    let step = 0;
    const label = document.getElementById('statusLabel');
    const interval = setInterval(() => {
      step++;
      if (step < messages.length) {
        label.textContent = messages[step];
      } else {
        clearInterval(interval);
      }
    }, 380);
  </script>
</body>
</html>`;

  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHtml));

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });

  return splashWindow;
};
