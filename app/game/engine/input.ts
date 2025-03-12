/**
 * Input Handler Module
 * Manages keyboard and touch inputs for the game
 */

export enum KeyState {
  PRESSED,
  HELD,
  RELEASED,
  IDLE
}

export interface InputState {
  left: KeyState;
  right: KeyState;
  up: KeyState;
  down: KeyState;
  fire: KeyState;
  start: KeyState;
  pause: KeyState;
}

export class InputHandler {
  private keyStates: Record<string, KeyState> = {};
  private mappings: Record<string, keyof InputState> = {
    'ArrowLeft': 'left',
    'a': 'left',
    'A': 'left',
    'ArrowRight': 'right',
    'd': 'right',
    'D': 'right',
    'ArrowUp': 'up',
    'w': 'up',
    'W': 'up',
    'ArrowDown': 'down',
    's': 'down',
    'S': 'down',
    ' ': 'fire',        // Space bar - only space for firing
    'Enter': 'start',
    'p': 'pause',
    'P': 'pause',
    'Escape': 'pause'
  };
  
  private touchStartX: number = 0;
  private touchThreshold: number = 30;
  private isTouching: boolean = false;
  private isFiring: boolean = false;
  
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;
  
  constructor() {
    // Initialize all keys to IDLE
    Object.values(this.mappings).forEach(action => {
      this.keyStates[action] = KeyState.IDLE;
    });
    
    // Bind event handlers to keep 'this' context
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);
  }
  
  /**
   * Initialize event listeners
   */
  public init(): void {
    // Keyboard events
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    
    // Touch events
    window.addEventListener('touchstart', this.boundTouchStart);
    window.addEventListener('touchmove', this.boundTouchMove);
    window.addEventListener('touchend', this.boundTouchEnd);
  }
  
  /**
   * Clean up event listeners
   */
  public cleanup(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('touchstart', this.boundTouchStart);
    window.removeEventListener('touchmove', this.boundTouchMove);
    window.removeEventListener('touchend', this.boundTouchEnd);
  }
  
  /**
   * Get the current input state
   */
  public getInputState(): InputState {
    return {
      left: this.keyStates['left'] || KeyState.IDLE,
      right: this.keyStates['right'] || KeyState.IDLE,
      up: this.keyStates['up'] || KeyState.IDLE,
      down: this.keyStates['down'] || KeyState.IDLE,
      fire: this.keyStates['fire'] || KeyState.IDLE,
      start: this.keyStates['start'] || KeyState.IDLE,
      pause: this.keyStates['pause'] || KeyState.IDLE
    };
  }
  
  /**
   * Check if space key is pressed or held (for high score entry)
   */
  public isSpacePressed(): boolean {
    // For debugging
    console.log('Space key state:', this.keyStates['fire']);
    return this.keyStates['fire'] === KeyState.PRESSED || this.keyStates['fire'] === KeyState.HELD;
  }
  
  /**
   * Set a virtual key state (for mobile controls)
   */
  public setVirtualKey(key: keyof InputState, state: KeyState): void {
    this.keyStates[key] = state;
  }
  
  /**
   * Update the input state (should be called once per frame)
   * Converts PRESSED to HELD, and RELEASED to IDLE
   */
  public update(): void {
    Object.keys(this.keyStates).forEach(key => {
      if (this.keyStates[key] === KeyState.PRESSED) {
        this.keyStates[key] = KeyState.HELD;
      } else if (this.keyStates[key] === KeyState.RELEASED) {
        this.keyStates[key] = KeyState.IDLE;
      }
    });
  }
  
  /**
   * Handle keydown events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    const action = this.mappings[e.key];
    if (action && this.keyStates[action] !== KeyState.HELD) {
      this.keyStates[action] = KeyState.PRESSED;
    }
    
    // Prevent default actions for game keys
    if (action) {
      e.preventDefault();
    }
  }
  
  /**
   * Handle keyup events
   */
  private handleKeyUp(e: KeyboardEvent): void {
    const action = this.mappings[e.key];
    if (action) {
      this.keyStates[action] = KeyState.RELEASED;
      e.preventDefault();
    }
  }
  
  /**
   * Handle touch start events
   */
  private handleTouchStart(e: TouchEvent): void {
    this.isTouching = true;
    
    if (e.touches.length > 0) {
      this.touchStartX = e.touches[0].clientX;
      
      // Check if touch is in the fire button zone (top half of screen)
      const screenHeight = window.innerHeight;
      if (e.touches[0].clientY < screenHeight / 2) {
        this.isFiring = true;
        this.keyStates['fire'] = KeyState.PRESSED;
      } else {
        // Touch is in the movement zone
        this.isFiring = false;
      }
    }
    
    e.preventDefault();
  }
  
  /**
   * Handle touch move events
   */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.isTouching || e.touches.length === 0) return;
    
    const touchX = e.touches[0].clientX;
    const diffX = touchX - this.touchStartX;
    
    // Only register movement in the bottom half of the screen
    const screenHeight = window.innerHeight;
    if (e.touches[0].clientY >= screenHeight / 2 && !this.isFiring) {
      // Reset previous movement states
      this.keyStates['left'] = KeyState.IDLE;
      this.keyStates['right'] = KeyState.IDLE;
      
      // Apply new movement based on touch position
      if (diffX < -this.touchThreshold) {
        this.keyStates['left'] = KeyState.PRESSED;
      } else if (diffX > this.touchThreshold) {
        this.keyStates['right'] = KeyState.PRESSED;
      }
    }
    
    e.preventDefault();
  }
  
  /**
   * Handle touch end events
   */
  private handleTouchEnd(e: TouchEvent): void {
    this.isTouching = false;
    
    // Reset movement states
    if (this.keyStates['left'] !== KeyState.IDLE) {
      this.keyStates['left'] = KeyState.RELEASED;
    }
    
    if (this.keyStates['right'] !== KeyState.IDLE) {
      this.keyStates['right'] = KeyState.RELEASED;
    }
    
    // Reset fire state if we were firing
    if (this.isFiring) {
      this.keyStates['fire'] = KeyState.RELEASED;
      this.isFiring = false;
    }
    
    e.preventDefault();
  }
}