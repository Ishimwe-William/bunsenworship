import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import readline from 'node:readline';
import { WindowPositioner } from './WindowPositioner';
import { presentationWatcher } from '../../presentationWatcher';

// Protocol message types
interface RequestMessage {
  id: string;
  command: string;
  params?: Record<string, unknown>;
}

interface ResponseMessage {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

interface EventMessage {
  type: string;
  data?: unknown;
}

// Helper state
interface SlideState {
  slideIndex: number;
  slideCount: number;
  title?: string;
  isRunning: boolean;
}

interface SlideInfo {
  index: number;
  title: string;
  notes: string;
}

interface SlideInfoResult {
  title: string;
  slideCount: number;
  slides: SlideInfo[];
}

// Controller events
export interface PowerPointControllerEvents {
  'slideChanged': (state: SlideState) => void;
  'slideshowEnded': () => void;
  'presentationSaved': () => void;
  'presentationClosed': () => void;
  'powerpointCrashed': (error: Error) => void;
  'helperConnected': () => void;
  'helperDisconnected': () => void;
}

export declare interface PowerPointController {
  on<U extends keyof PowerPointControllerEvents>(
    event: U,
    listener: PowerPointControllerEvents[U]
  ): this;
  once<U extends keyof PowerPointControllerEvents>(
    event: U,
    listener: PowerPointControllerEvents[U]
  ): this;
  off<U extends keyof PowerPointControllerEvents>(
    event: U,
    listener: PowerPointControllerEvents[U]
  ): this;
  emit<U extends keyof PowerPointControllerEvents>(
    event: U,
    ...args: Parameters<PowerPointControllerEvents[U]>
  ): boolean;
}

/**
 * PowerPointController manages communication with the .NET helper process
 * that owns all PowerPoint COM automation. Provides a clean async API and
 * EventEmitter for PowerPoint state changes.
 */
export class PowerPointController extends EventEmitter {
  private helperProcess: ChildProcess | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: ResponseMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private requestIdCounter = 0;
  private isHelperReady = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private lastPongTime = 0;
  private currentFilePath: string | null = null;
  private currentSlideState: SlideState | null = null;

  private readonly PING_TIMEOUT = 5000; // 5 seconds
  private readonly WATCHDOG_TIMEOUT = 10000; // 10 seconds
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor() {
    super();
    this.setupWatchdog();
  }

  /**
   * Gets the path to the PowerPoint helper executable.
   */
  private getHelperPath(): string {
    // In development, look in the helper/build directory
    if (process.env.NODE_ENV === 'development') {
      return path.join(process.cwd(), 'helper', 'build', 'PowerPointHelper.exe');
    }

    // In production, look in the resources directory
    const resourcePath = process.resourcesPath;
    if (resourcePath) {
      return path.join(resourcePath, 'PowerPointHelper.exe');
    }

    // Fallback to app directory
    return path.join(process.cwd(), 'resources', 'PowerPointHelper.exe');
  }

  /**
   * Starts the helper process and establishes communication.
   */
  public async start(): Promise<void> {
    if (this.helperProcess && !this.helperProcess.killed) {
      return; // Already running
    }

    const helperPath = this.getHelperPath();

    return new Promise((resolve, reject) => {
      try {
        this.helperProcess = spawn(helperPath, [], {
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'ignore'],
        });

        this.helperProcess.on('error', (error) => {
          console.error('[PowerPointController] Helper process error:', error);
          this.emit('powerpointCrashed', error);
          this.cleanup();
          reject(error);
        });

        this.helperProcess.on('exit', (code, signal) => {
          console.warn(`[PowerPointController] Helper process exited (code: ${code}, signal: ${signal})`);
          this.emit('helperDisconnected');
          this.cleanup();
        });

        if (this.helperProcess.stdout) {
          const rl = readline.createInterface({
            input: this.helperProcess.stdout,
            crlfDelay: Infinity,
          });

          rl.on('line', (line: string) => {
            this.handleMessage(line);
          });
        }

        // Wait for helper to be ready
        this.ping()
          .then(() => {
            this.isHelperReady = true;
            this.startPingInterval();
            this.emit('helperConnected');
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stops the helper process and cleans up resources.
   */
  public async stop(): Promise<void> {
    try {
      await this.quit();
    } catch (error) {
      console.warn('[PowerPointController] Error during quit:', error);
    }

    this.cleanup();
  }

  /**
   * Cleans up resources and timers.
   */
  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    // Reject all pending requests
    for (const [, { reject, timeout }] of this.pendingRequests.entries()) {
      clearTimeout(timeout);
      reject(new Error('Helper process disconnected'));
    }
    this.pendingRequests.clear();

    if (this.helperProcess && !this.helperProcess.killed) {
      this.helperProcess.kill();
    }

    this.helperProcess = null;
    this.isHelperReady = false;
    this.currentFilePath = null;
    this.currentSlideState = null;
  }

  /**
   * Sets up the watchdog to detect unresponsive helper.
   */
  private setupWatchdog(): void {
    this.watchdogTimer = setInterval(() => {
      if (this.isHelperReady && Date.now() - this.lastPongTime > this.WATCHDOG_TIMEOUT) {
        console.error('[PowerPointController] Watchdog timeout - helper appears unresponsive');
        this.emit('powerpointCrashed', new Error('Helper process unresponsive'));
        this.restart();
      }
    }, this.WATCHDOG_TIMEOUT);
  }

  /**
   * Restarts the helper process after a crash.
   */
  private async restart(): Promise<void> {
    console.log('[PowerPointController] Restarting helper process...');
    this.cleanup();
    await this.start();
  }

  /**
   * Starts the periodic ping interval.
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.ping().catch((error) => {
        console.warn('[PowerPointController] Ping failed:', error);
      });
    }, this.PING_TIMEOUT);
  }

  /**
   * Handles incoming messages from the helper process.
   */
  private handleMessage(line: string): void {
    try {
      const message = JSON.parse(line) as ResponseMessage | EventMessage;

      // Check if this is a response to a pending request
      if ('id' in message && typeof message.id === 'string' && message.id) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.id);
          pending.resolve(message as ResponseMessage);
          return;
        }
      }

      // Check if this is an event
      if ('type' in message && typeof message.type === 'string') {
        this.handleEvent(message as EventMessage);
      }
    } catch (error) {
      console.error('[PowerPointController] Failed to parse message:', line, error);
    }
  }

  /**
   * Handles events from the helper process.
   */
  private handleEvent(event: EventMessage): void {
    switch (event.type) {
      case 'slideChanged':
        this.emit('slideChanged', event.data as SlideState);
        this.currentSlideState = event.data as SlideState;
        break;
      case 'slideshowEnded':
        this.emit('slideshowEnded');
        break;
      case 'presentationSaved':
        this.emit('presentationSaved');
        break;
      case 'presentationClosed':
        this.emit('presentationClosed');
        this.currentFilePath = null;
        this.currentSlideState = null;
        break;
      default:
        console.warn('[PowerPointController] Unknown event type:', event.type);
    }
  }

  /**
   * Sends a command to the helper process and waits for the response.
   */
  private async sendCommand(command: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.helperProcess || this.helperProcess.killed) {
      throw new Error('Helper process is not running');
    }

    const id = `req_${this.requestIdCounter++}`;
    const request: RequestMessage = { id, command, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${command}`));
      }, this.REQUEST_TIMEOUT);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        const message = JSON.stringify(request);
        this.helperProcess.stdin!.write(message + '\n');
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      }
    }).then((response) => {
      const resp = response as ResponseMessage;
      if (!resp.success) {
        throw new Error(resp.error || 'Command failed');
      }
      return resp.result;
    });
  }

  /**
   * Pings the helper process to check if it's responsive.
   */
  public async ping(): Promise<void> {
    const result = await this.sendCommand('ping') as { status: string; timestamp: number };
    if (result.status === 'ok') {
      this.lastPongTime = Date.now();
    }
  }

  /**
   * Opens a PowerPoint presentation.
   */
  public async open(filePath: string): Promise<{ title: string; slideCount: number; path: string }> {
    const result = await this.sendCommand('open', { path: filePath }) as {
      title: string;
      slideCount: number;
      path: string;
    };
    this.currentFilePath = filePath;
    return result;
  }

  /**
   * Starts a slideshow in windowed mode.
   */
  public async startSlideshow(options?: { windowed?: boolean; startSlide?: number; displayId?: number }): Promise<{
    isRunning: boolean;
    currentSlide: number;
  }> {
    const result = await this.sendCommand('startslideshow', {
      windowed: options?.windowed ?? true,
      startSlide: options?.startSlide,
    }) as { isRunning: boolean; currentSlide: number };

    // Update presentation watcher running state
    if (result.isRunning && this.currentFilePath) {
      presentationWatcher.setRunningState(this.currentFilePath, true, result.currentSlide);
    }

    // Position the slideshow window for optimal capture
    if (result.isRunning && options?.displayId !== undefined) {
      try {
        const bounds = WindowPositioner.positionForCapture(options.displayId, {
          offscreen: true, // Position off-screen initially
        });

        // Note: We can't directly position PowerPoint windows from Node.js
        // This would need to be done via the helper process or native modules
        // For now, this is a placeholder for future implementation
        console.log('[PowerPointController] Would position slideshow at:', bounds);
      } catch (error) {
        console.warn('[PowerPointController] Failed to position slideshow window:', error);
      }
    }

    return result;
  }

  /**
   * Advances to the next slide.
   */
  public async next(): Promise<{ currentSlide: number }> {
    const result = await this.sendCommand('next') as { currentSlide: number };
    return result;
  }

  /**
   * Goes to the previous slide.
   */
  public async prev(): Promise<{ currentSlide: number }> {
    const result = await this.sendCommand('prev') as { currentSlide: number };
    return result;
  }

  /**
   * Goes to a specific slide.
   */
  public async gotoSlide(slideNumber: number): Promise<{ currentSlide: number }> {
    const result = await this.sendCommand('gotoslide', { slideNumber }) as { currentSlide: number };
    return result;
  }

  /**
   * Gets the current state of the slideshow.
   */
  public async getState(): Promise<SlideState> {
    const result = await this.sendCommand('getstate') as SlideState;
    this.currentSlideState = result;
    return result;
  }

  /**
   * Gets information about all slides in the presentation.
   */
  public async getSlideInfo(): Promise<SlideInfoResult> {
    const result = await this.sendCommand('getslideinfo') as SlideInfoResult;
    return result;
  }

  /**
   * Ends the current slideshow.
   */
  public async endSlideshow(): Promise<{ isRunning: boolean }> {
    const result = await this.sendCommand('endslideshow') as { isRunning: boolean };
    if (this.currentSlideState) {
      this.currentSlideState.isRunning = false;
    }
    // Update presentation watcher running state
    if (this.currentFilePath) {
      presentationWatcher.setRunningState(this.currentFilePath, false, 0);
    }
    return result;
  }

  /**
   * Closes the current presentation.
   */
  public async close(): Promise<{ hasPresentation: boolean }> {
    const result = await this.sendCommand('close') as { hasPresentation: boolean };
    this.currentFilePath = null;
    this.currentSlideState = null;
    return result;
  }

  /**
   * Quits PowerPoint and the helper process.
   */
  public async quit(): Promise<{ status: string }> {
    const result = await this.sendCommand('quit') as { status: string };
    return result;
  }

  /**
   * Gets the currently open file path.
   */
  public getCurrentFilePath(): string | null {
    return this.currentFilePath;
  }

  /**
   * Gets the current slide state.
   */
  public getCurrentSlideState(): SlideState | null {
    return this.currentSlideState;
  }

  /**
   * Checks if the helper is ready.
   */
  public isReady(): boolean {
    return this.isHelperReady;
  }
}

// Singleton instance
let powerPointControllerInstance: PowerPointController | null = null;

export function getPowerPointController(): PowerPointController {
  if (!powerPointControllerInstance) {
    powerPointControllerInstance = new PowerPointController();
  }
  return powerPointControllerInstance;
}

export function isPowerPointAvailable(): boolean {
  if (process.platform !== 'win32') return false;

  // Check if PowerPoint is available via registry/ProgID
  try {
    // This is a basic check - for production, you might want to check the registry
    // HKEY_CLASSES_ROOT\PowerPoint.Application\CurVer
    return true; // Assume available on Windows for now
  } catch {
    return false;
  }
}
