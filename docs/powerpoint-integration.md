# PowerPoint Live Integration Architecture

## Overview

This document describes the architecture for live PowerPoint playback in bunsenWorship, enabling real-time PowerPoint presentations with full animations, transitions, and embedded media through COM automation on Windows.

## Architecture

### Components

1. **.NET Helper Process** (`helper/PowerPointHelper/`)
   - Console application that owns all PowerPoint COM automation
   - Communicates with Electron main process via JSON-lines protocol over stdin/stdout
   - Handles PowerPoint Application object lifecycle
   - Manages presentation state and slideshow control

2. **PowerPoint Controller** (`src/main/powerpoint/PowerPointController.ts`)
   - Electron main process module that manages the helper process
   - Provides clean async API for PowerPoint operations
   - EventEmitter for PowerPoint state changes
   - Watchdog for helper process health

3. **IPC Layer** (`src/main/powerpoint/PowerPointIpc.ts`)
   - Registers IPC handlers for renderer communication
   - Bridges PowerPoint controller events to renderer processes
   - Handles request/response routing

4. **Window Capture** (`src/main/powerpoint/WindowCapture.ts`)
   - Provides desktopCapturer integration for capturing PowerPoint windows
   - Discovers PowerPoint slideshow windows
   - Manages capture source enumeration

5. **Renderer Components** (`src/components/live/PowerPointCaptureView.tsx`)
   - React component for displaying captured PowerPoint window
   - Manages video stream from desktopCapturer
   - Handles capture errors and reconnection

## Protocol

### JSON-Lines Communication

The helper process communicates via JSON messages over stdin/stdout, one message per line.

#### Request Format

```json
{
  "id": "req_1",
  "command": "open",
  "params": {
    "path": "C:\\path\\to\\presentation.pptx"
  }
}
```

#### Response Format

```json
{
  "id": "req_1",
  "success": true,
  "result": {
    "title": "Presentation Title",
    "slideCount": 12,
    "path": "C:\\path\\to\\presentation.pptx"
  }
}
```

#### Event Format

```json
{
  "type": "slideChanged",
  "data": {
    "currentSlide": 3,
    "slideCount": 12,
    "isRunning": true
  }
}
```

### Commands

| Command | Parameters | Response | Description |
|---------|-----------|----------|-------------|
| `ping` | - | `{ status: "ok", timestamp: number }` | Health check |
| `open` | `{ path: string }` | `{ title, slideCount, path }` | Open presentation |
| `startSlideshow` | `{ windowed?: boolean, startSlide?: number }` | `{ isRunning, currentSlide }` | Start slideshow |
| `next` | - | `{ currentSlide }` | Next slide |
| `prev` | - | `{ currentSlide }` | Previous slide |
| `gotoSlide` | `{ slideNumber: number }` | `{ currentSlide }` | Go to specific slide |
| `getState` | - | `{ isRunning, currentSlide, slideCount, title, hasPresentation }` | Get current state |
| `getSlideInfo` | - | `{ title, slideCount, slides: [{ index, title, notes }] }` | Get slide information |
| `endSlideshow` | - | `{ isRunning }` | End slideshow |
| `close` | - | `{ hasPresentation }` | Close presentation |
| `quit` | - | `{ status: "quit" }` | Quit PowerPoint |

### Events

| Event | Data | Description |
|-------|------|-------------|
| `slideChanged` | `{ currentSlide, slideCount, isRunning }` | Slide changed in slideshow |
| `slideshowEnded` | - | Slideshow ended |
| `presentationSaved` | - | Presentation saved |
| `presentationClosed` | - | Presentation closed |
| `powerpointCrashed` | `{ error: string }` | PowerPoint crashed |
| `helperConnected` | - | Helper process connected |
| `helperDisconnected` | - | Helper process disconnected |

## Integration Points

### Main Process

```typescript
import { getPowerPointController } from './main/powerpoint/PowerPointController';

const controller = getPowerPointController();
await controller.start();
await controller.open('C:\\path\\to\\presentation.pptx');
await controller.startSlideshow({ windowed: true });
```

### Renderer Process

```typescript
const isAvailable = await window.electronAPI.isPowerPointAvailable();
if (isAvailable) {
  await window.electronAPI.pptOpen('C:\\path\\to\\presentation.pptx');
  await window.electronAPI.pptStartSlideshow({ windowed: true });
}

window.electronAPI.onPowerPointEvent((event) => {
  console.log('PowerPoint event:', event.type, event.data);
});
```

## Window Capture

### Capture Flow

1. PowerPoint slideshow started in windowed mode
2. `desktopCapturer.getSources()` discovers PowerPoint window
3. `navigator.mediaDevices.getUserMedia()` with `chromeMediaSource` captures window
4. Video stream displayed in `<video>` element in projector window

### Capture Challenges

- **Minimized windows**: PowerPoint stops rendering when minimized, must keep window visible
- **Window positioning**: Position off-screen or behind projector window to avoid operator interference
- **Capture source ID**: Changes between runs, requires re-discovery
- **Stream drops**: Auto re-acquire on stream loss

### Future Enhancement: SetParent Reparenting

The current architecture uses desktopCapturer for window capture. An alternative approach would be to use native Windows API `SetParent` to reparent the PowerPoint window into the Electron window. This would provide:

- Better performance (no encoding/decoding overhead)
- Native integration
- No capture source management

This could be added behind the same interface without changing the renderer components.

## Auto-Sync

### File Watching

The existing `presentationWatcher` uses chokidar to watch PPTX files:

- Debounces changes by 500-1000ms
- Handles PowerPoint's temp file/rename pattern
- Ignores lock files (`~$name.pptx`)
- Retries with backoff if file is locked

### Running vs Idle State

When a PPTX file changes:

**If slideshow is NOT running:**
- Re-read slide count, titles, thumbnails
- Update operator UI and slide list
- Show "Updated" indicator

**If slideshow IS running:**
- Mark item as "changes pending" in operator UI
- Apply update at safe moment (slideshow ended or operator clicks "Apply update")
- Reopen file, restart slideshow, jump back to same slide index
- Clamp slide index if slides were deleted

### Event Sources

- File watcher (chokidar) detects disk changes
- Helper's `presentationSaved` event catches saves made inside PowerPoint
- Dual detection ensures no changes are missed

## Fallback

### PowerPoint Availability

```typescript
import { isPowerPointAvailable } from './main/powerpoint/PowerPointController';

if (!isPowerPointAvailable()) {
  // Fall back to image conversion (LibreOffice headless)
  // Use existing presentationNativeEngine.ts
}
```

### Fallback Behavior

- Detect PowerPoint availability via registry/ProgID `PowerPoint.Application`
- If unavailable, use existing image-conversion path
- Show user notice about reduced fidelity
- Keep fallback behind same interface

## Robustness

### Watchdog

- Ping helper every 5 seconds
- Watchdog timeout: 10 seconds
- Auto-restart on unresponsive helper
- Restore state (file and slide index) after restart

### Error Handling

- Suppress PowerPoint alerts (`DisplayAlerts = ppAlertsNone`)
- Open files with `WithWindow = false` where possible
- Handle modal dialogs (Protected View, repair prompt, password)
- Handle read-only files
- Handle very large files
- Handle files on network drives
- Handle .ppt vs .pptx formats

### Process Cleanup

- On app quit, send `quit` command to helper
- Release COM objects
- Kill orphan POWERPNT.EXE processes
- Clean up file watchers

## Build and Distribution

### Helper Build

```bash
npm run build:helper
```

Builds the .NET console app to `helper/build/PowerPointHelper.exe`.

### Electron Builder Integration

The helper is bundled via `extraResources` in `package.json`:

```json
"extraResources": [
  {
    "from": "helper/build/PowerPointHelper.exe",
    "to": "PowerPointHelper.exe"
  }
]
```

### Development vs Production

- **Development**: Helper at `helper/build/PowerPointHelper.exe`
- **Production**: Helper at `resources/PowerPointHelper.exe` (via `process.resourcesPath`)

## Known Limitations

### Platform Support

- **Windows only**: COM automation requires Windows
- **PowerPoint required**: Microsoft PowerPoint must be installed
- **.NET 8.0 required**: Helper process requires .NET 8.0 runtime

### Capture Limitations

- **Performance**: desktopCapturer adds encoding/decoding overhead
- **Latency**: Small delay between PowerPoint change and capture update
- **Window positioning**: Limited control over PowerPoint window positioning from Node.js
- **Multiple displays**: Capture works best with known display configuration

### COM Limitations

- **Modal dialogs**: PowerPoint modal dialogs can block operations
- **Protected View**: Protected View documents require user interaction
- **Network drives**: Slow or unreliable on network drives
- **Large files**: Very large presentations may timeout
- **Concurrent instances**: Single PowerPoint instance shared across applications

### Auto-Sync Limitations

- **Lock files**: PowerPoint's lock file handling can cause false positives
- **Temp files**: Complex temp file/rename pattern can miss some changes
- **Live interruption**: Cannot safely apply updates during live slideshow
- **Content hash**: Hash calculation can be slow for large files

## Testing

### Manual Test Checklist

1. **Open and Play**
   - [ ] Open PPTX file
   - [ ] Start slideshow
   - [ ] Navigate next/prev
   - [ ] Go to specific slide
   - [ ] End slideshow
   - [ ] Close presentation

2. **Auto-Sync - Idle**
   - [ ] Open PPTX file (not running)
   - [ ] Edit and save in PowerPoint
   - [ ] Verify slide list updates
   - [ ] Verify "Updated" indicator shows

3. **Auto-Sync - Live**
   - [ ] Open PPTX file and start slideshow
   - [ ] Edit and save in PowerPoint
   - [ ] Verify "changes pending" indicator
   - [ ] Apply update after slideshow ends
   - [ ] Verify slideshow restarts at correct slide

4. **Error Handling**
   - [ ] Kill PowerPoint mid-show
   - [ ] Delete file while watching
   - [ ] Open corrupt file
   - [ ] Test without PowerPoint installed

5. **Capture**
   - [ ] Verify capture discovers PowerPoint window
   - [ ] Verify video stream displays correctly
   - [ ] Test capture on multiple displays
   - [ ] Test capture after PowerPoint restart

## Future Enhancements

1. **SetParent Reparenting**: Native window embedding for better performance
2. **Thumbnail Generation**: Generate thumbnails from helper for slide list
3. **Animation Detection**: Detect and preserve animation state
4. **Presenter View**: Support for PowerPoint presenter view
5. **Multiple Presentations**: Support for multiple concurrent presentations
6. **Mac Support**: Mac automation via AppleScript (limited)
7. **Linux Support**: LibreOffice automation (limited)

## References

- [PowerPoint COM Documentation](https://docs.microsoft.com/en-us/office/vba/api/overview/powerpoint)
- [Electron desktopCapturer](https://www.electronjs.org/docs/latest/api/desktop-capturer)
- [COM Automation in .NET](https://docs.microsoft.com/en-us/dotnet/framework/interop/com-interop-overview)
