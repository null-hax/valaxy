/**
 * Renderer Module
 * Handles drawing game elements to the canvas
 */

// Define types for drawing operations
export type DrawImageOptions = {
  x: number;
  y: number;
  width?: number;
  height?: number;
  sourceX?: number;
  sourceY?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  rotation?: number;
  alpha?: number;
  flipX?: boolean;
  flipY?: boolean;
};

export type DrawTextOptions = {
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  alpha?: number;
  pixelated?: boolean;
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private pixelRatio: number;
  private crtEffect: boolean = true;
  private loadedImages: Map<string, HTMLImageElement> = new Map();

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.width = width;
    this.height = height;
    this.pixelRatio = window.devicePixelRatio || 1;
    
    // Initialize canvas with correct size
    this.resize();
    
    // Set default rendering options
    this.ctx.imageSmoothingEnabled = false; // Disable anti-aliasing for pixel art
  }

  /**
   * Resize the canvas to match the container while maintaining aspect ratio
   */
  public resize(): void {
    // Set the canvas size accounting for device pixel ratio
    this.canvas.width = this.width * this.pixelRatio;
    this.canvas.height = this.height * this.pixelRatio;
    
    // Set display size
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    // Scale the context to account for the pixel ratio
    this.ctx.scale(this.pixelRatio, this.pixelRatio);
    
    // Disable image smoothing again after resize
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * Clear the canvas
   */
  public clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Fill the canvas with a color
   */
  public fill(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Draw a filled rectangle
   */
  public fillRect(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  /**
   * Draw a stroked rectangle
   */
  public strokeRect(x: number, y: number, width: number, height: number, color: string, lineWidth: number = 1): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, width, height);
  }

  /**
   * Draw a filled circle
   */
  public fillCircle(x: number, y: number, radius: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw text with pixelated option for arcade style text
   */
  public drawText(text: string, options: DrawTextOptions): void {
    const {
      x,
      y,
      color = '#FFFFFF',
      fontSize = 16,
      fontFamily = 'Press Start 2P, monospace',
      align = 'left',
      baseline = 'top',
      alpha = 1,
      pixelated = true
    } = options;

    // Use a more reasonable scaling factor based on the canvas size
    // This ensures text is properly sized relative to the canvas
    const scaleFactor = Math.min(this.width / 800, this.height / 600);
    const scaledFontSize = fontSize * scaleFactor;

    this.ctx.save();
    
    // Apply alpha if needed
    if (alpha !== 1) {
      this.ctx.globalAlpha = alpha;
    }
    
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;
    
    // Add text shadow for better readability
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    this.ctx.shadowBlur = 4 * scaleFactor;
    this.ctx.shadowOffsetX = 2 * scaleFactor;
    this.ctx.shadowOffsetY = 2 * scaleFactor;
    
    if (pixelated) {
      // For pixelated text, use a simpler approach that works better with scaling
      this.ctx.font = `${scaledFontSize}px ${fontFamily}`;
      this.ctx.imageSmoothingEnabled = false;
      
      // Draw text directly - the pixelated rendering style is handled by the canvas
      this.ctx.fillText(text, x, y);
    } else {
      // Standard text rendering
      this.ctx.font = `${scaledFontSize}px ${fontFamily}`;
      this.ctx.fillText(text, x, y);
    }
    
    this.ctx.restore();
  }

  /**
   * Load an image from a URL
   */
  public async loadImage(key: string, url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (this.loadedImages.has(key)) {
        resolve(this.loadedImages.get(key) as HTMLImageElement);
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(key, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Draw an image with various options
   */
  public drawImage(key: string, options: DrawImageOptions): void {
    const img = this.loadedImages.get(key);
    if (!img) return;
    
    const {
      x,
      y,
      width = img.width,
      height = img.height,
      sourceX = 0,
      sourceY = 0,
      sourceWidth = img.width,
      sourceHeight = img.height,
      rotation = 0,
      alpha = 1,
      flipX = false,
      flipY = false
    } = options;

    this.ctx.save();
    
    // Apply alpha if needed
    if (alpha !== 1) {
      this.ctx.globalAlpha = alpha;
    }
    
    // Apply transformations
    if (rotation !== 0 || flipX || flipY) {
      // Translate to the center of where the image will be drawn
      this.ctx.translate(x + width / 2, y + height / 2);
      
      // Apply rotation
      if (rotation !== 0) {
        this.ctx.rotate(rotation);
      }
      
      // Apply flips by scaling
      this.ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      
      // Draw image (centered at origin after translation)
      this.ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        -width / 2, -height / 2, width, height
      );
    } else {
      // Simple draw without transformations
      this.ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        x, y, width, height
      );
    }
    
    this.ctx.restore();
  }

  /**
   * Apply CRT screen effect to the entire canvas
   * Simplified for better performance
   */
  public applyCrtEffect(): void {
    if (!this.crtEffect) return;
    
    // Simplified CRT effect - just adds scan lines and a subtle vignette
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Add scan lines (only every 6th line for better performance)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let y = 0; y < height; y += 6) {
      this.ctx.fillRect(0, y, width, 1);
    }
    
    // Add vignette effect using a gradient
    const gradient = this.ctx.createRadialGradient(
      width / 2, height / 2, height / 3,
      width / 2, height / 2, height
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  /**
   * Toggle CRT effect on/off
   */
  public toggleCrtEffect(enabled: boolean): void {
    this.crtEffect = enabled;
  }

  /**
   * Get the canvas width
   */
  public getWidth(): number {
    return this.width;
  }

  /**
   * Get the canvas height
   */
  public getHeight(): number {
    return this.height;
  }
}