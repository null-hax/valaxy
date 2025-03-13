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
    ' ': 'fire',        // Space bar for firing
    'Enter': 'start',
    'p': 'pause',
    'P': 'pause',
    'Escape': 'pause'
  };
  
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  
  constructor() {
    // Initialize all keys to IDLE
    Object.values(this.mappings).forEach(action => {
      this.keyStates[action] = KeyState.IDLE;
    });
    
    // Bind event handlers to keep 'this' context
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
  }
  
  /**
   * Initialize event listeners
   */
  public init(): void {
    // Keyboard events
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }
  
  /**
   * Clean up event listeners
   */
  public cleanup(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
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
}