/**
 * Game Loop Module
 * Handles the main game timing and update cycles
 */

export type GameLoopCallback = (deltaTime: number) => void;

export class GameLoop {
  private lastTimestamp: number = 0;
  private isRunning: boolean = false;
  private animationFrameId: number = 0;
  private updateCallback: GameLoopCallback | null = null;
  private fps: number = 60;
  private frameInterval: number = 1000 / 60; // 60 FPS by default
  private accumulator: number = 0;

  constructor(fps: number = 30) { // Reduced FPS for better performance
    this.fps = fps;
    this.frameInterval = 1000 / fps;
  }

  /**
   * Set the callback function to be called on each update
   */
  public setUpdateCallback(callback: GameLoopCallback): void {
    this.updateCallback = callback;
  }

  /**
   * Start the game loop
   */
  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  /**
   * Set the target frames per second
   */
  public setFps(fps: number): void {
    this.fps = fps;
    this.frameInterval = 1000 / fps;
  }

  /**
   * The main loop function called by requestAnimationFrame
   */
  private loop(timestamp: number): void {
    if (!this.isRunning) return;

    // Calculate delta time in milliseconds
    const deltaTime = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    
    // Use fixed time step with accumulator for consistent physics
    this.accumulator += deltaTime;
    
    // Update game logic at fixed intervals
    while (this.accumulator >= this.frameInterval) {
      if (this.updateCallback) {
        this.updateCallback(this.frameInterval / 1000); // Convert to seconds for physics calculations
      }
      this.accumulator -= this.frameInterval;
    }
    
    // Request next frame
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
  }
}