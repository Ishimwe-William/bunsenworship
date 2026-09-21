const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 32, 64, 128, 256, 512];
const ASSETS_DIR = path.resolve(__dirname, '../src/assets');

function createIco(pngBuffersWithSizes) {
  const count = pngBuffersWithSizes.length;
  const headerSize = 6;
  const directorySize = 16 * count;
  let offset = headerSize + directorySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = 1 (icon)
  header.writeUInt16LE(count, 4); // count

  const directoryEntries = [];
  const imageBuffers = [];

  for (const item of pngBuffersWithSizes) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(item.buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    directoryEntries.push(entry);
    imageBuffers.push(item.buffer);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...imageBuffers]);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      offscreen: true,
    },
  });

  const icoBuffers = [];

  for (const size of SIZES) {
    const svgPath = path.join(ASSETS_DIR, `AppIcon-${size}.svg`);
    if (!fs.existsSync(svgPath)) continue;

    const svgContent = fs.readFileSync(svgPath, 'utf8');
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
            svg { width: ${size}px; height: ${size}px; display: block; }
          </style>
        </head>
        <body>${svgContent}</body>
      </html>
    `;

    win.setSize(size, size);
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await new Promise((r) => setTimeout(r, 120));

    const image = await win.capturePage({ x: 0, y: 0, width: size, height: size });
    const pngBuffer = image.toPNG();
    const pngPath = path.join(ASSETS_DIR, `AppIcon-${size}.png`);
    fs.writeFileSync(pngPath, pngBuffer);
    console.log(`Generated ${path.basename(pngPath)} (${size}x${size}, ${pngBuffer.length} bytes)`);

    if (size <= 256) {
      icoBuffers.push({ width: size, height: size, buffer: pngBuffer });
    }
  }

  // Generate SystemTray-32.png
  const traySvgPath = path.join(ASSETS_DIR, 'SystemTray-32.svg');
  if (fs.existsSync(traySvgPath)) {
    const traySvgContent = fs.readFileSync(traySvgPath, 'utf8');
    const trayHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { width: 32px; height: 32px; overflow: hidden; background: transparent; }
            svg { width: 32px; height: 32px; display: block; }
          </style>
        </head>
        <body>${traySvgContent}</body>
      </html>
    `;

    win.setSize(32, 32);
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(trayHtml));
    await new Promise((r) => setTimeout(r, 120));

    const trayImage = await win.capturePage({ x: 0, y: 0, width: 32, height: 32 });
    const trayPngBuffer = trayImage.toPNG();
    const trayPngPath = path.join(ASSETS_DIR, 'SystemTray-32.png');
    fs.writeFileSync(trayPngPath, trayPngBuffer);
    console.log(`Generated SystemTray-32.png (${trayPngBuffer.length} bytes)`);
  }

  // Generate icon.ico
  if (icoBuffers.length > 0) {
    const icoData = createIco(icoBuffers);
    const icoPath = path.join(ASSETS_DIR, 'icon.ico');
    fs.writeFileSync(icoPath, icoData);
    console.log(`Generated icon.ico (${icoData.length} bytes with ${icoBuffers.length} resolutions)`);
  }

  console.log('Icon asset generation complete.');
  app.exit(0);
});
