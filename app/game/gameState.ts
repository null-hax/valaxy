/**
 * Game State Manager
 * Handles the overall game state, progression, and game logic
 */

import { GameLoop } from './engine/gameLoop';
import { InputHandler, InputState, KeyState } from './engine/input';
import { Renderer } from './engine/renderer';
import { CollisionSystem } from './engine/collision';
import { SoundEngine, SoundEffect } from './sounds/soundEngine';
import { Player } from './entities/player';
import { FormationManager } from './entities/formation';
import { Enemy, EnemyState } from './entities/enemies';
import { Projectile } from './entities/projectiles';
import { PowerUpManager, PowerUpType, PowerUp } from './entities/powerups';

// Game states
export enum GameState {
  BOOT,            // Boot screen
  TITLE,           // Title screen
  GAME_START,      // Starting game (intro animation)
  PLAYING,         // Active gameplay
  LEVEL_COMPLETE,  // Level completion
  GAME_OVER,       // Game over screen
  HIGH_SCORE       // High score entry
}

// Local storage key for high scores
const HIGH_SCORES_KEY = 'valaxy_high_scores';

// High score entry
interface HighScore {
  name: string;
  score: number;
  date: string;
  wave: number;
}

export class Game {
  // Core game components
  private gameLoop: GameLoop;
  private inputHandler: InputHandler;
  private renderer: Renderer;
  private soundEngine: SoundEngine;
  
  // Game entities
  private player: Player;
  private formationManager: FormationManager;
  private powerUpManager: PowerUpManager;
  private stars: Star[] = [];
  
  // Game state
  private state: GameState = GameState.BOOT;
  private score: number = 0;
  private highScores: HighScore[] = [];
  private level: number = 1;
  private lives: number = 3;
  private stateTime: number = 0;
  private gameStarted: boolean = false;
  
  // Canvas dimensions
  private width: number;
  private height: number;
  
  // Boot screen
  private bootProgress: number = 0;
  private bootComplete: boolean = false;
  private bootMessages: string[] = []; // Removed text messages
  private currentBootMessage: number = 0;
  
  constructor(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ) {
    // Initialize core components
    this.width = width;
    this.height = height;
    this.renderer = new Renderer(canvas, width, height);
    this.inputHandler = new InputHandler();
    this.gameLoop = new GameLoop(30); // Reduced to 30fps for better performance
    this.soundEngine = new SoundEngine();
    
    // Initialize game entities - only create what's needed for boot screen initially
    this.player = new Player(this.soundEngine, width, height);
    this.formationManager = new FormationManager(this.soundEngine, width, height);
    this.powerUpManager = new PowerUpManager(this.soundEngine, width, height);
    
    // Create a smaller number of stars for better performance
    this.createStars(40);
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Initialize direct keyboard handler for high score entry
    this.boundKeyDownHandler = this.handleHighScoreKeyDown.bind(this);
    
    // Set the game loop update callback
    this.gameLoop.setUpdateCallback(this.update.bind(this));
    
    // Load high scores (async, but we don't need to await here)
    this.loadHighScores().catch(err => console.error('Failed to load high scores:', err));
  }
  
  /**
   * Initialize the game
   */
  public async init(): Promise<void> {
    // Initialize input handler
    this.inputHandler.init();
    
    // Initialize sound engine (must be called after a user interaction)
    await this.soundEngine.init();
    
    // Disable sound effects but keep background music enabled
    this.soundEngine.setSoundEffectsEnabled(false);
    
    // Play coin insert sound to simulate arcade start
    this.soundEngine.playSound(SoundEffect.COIN_INSERT);
    
    // Skip boot screen and go directly to title screen
    this.state = GameState.TITLE;
    
    // Start the game loop
    this.gameLoop.start();
    
    // Start background music
    await this.soundEngine.startMusic();
    console.log("Background music started in Game.init()");
  }
  
  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  /**
   * Handle window resize
   */
  private handleResize(): void {
    // Update renderer
    this.renderer.resize();
  }
  
  /**
   * Main update function called by the game loop
   */
  private update(deltaTime: number): void {
    // Get current input state
    const inputState = this.inputHandler.getInputState();
    
    // Update input handler
    this.inputHandler.update();
    
    // Update stars
    this.updateStars(deltaTime);
    
    // Update game state
    switch (this.state) {
      case GameState.BOOT:
        this.updateBootScreen(deltaTime, inputState);
        break;
        
      case GameState.TITLE:
        this.updateTitleScreen(deltaTime, inputState);
        break;
        
      case GameState.GAME_START:
        this.updateGameStart(deltaTime, inputState);
        break;
        
      case GameState.PLAYING:
        this.updatePlaying(deltaTime, inputState);
        break;
        
      case GameState.LEVEL_COMPLETE:
        this.updateLevelComplete(deltaTime, inputState);
        break;
        
      case GameState.GAME_OVER:
        this.updateGameOver(deltaTime, inputState);
        break;
        
      case GameState.HIGH_SCORE:
        this.updateHighScore(deltaTime, inputState);
        break;
    }
    
    // Render the current frame
    this.render();
  }
  
  /**
   * Update boot screen
   */
  private updateBootScreen(deltaTime: number, inputState: InputState): void {
    // Update boot progress
    this.stateTime += deltaTime;
    this.bootProgress = Math.min(1, this.stateTime / 5); // 5 seconds boot sequence
    
    // Update boot messages
    const messageInterval = 5 / this.bootMessages.length;
    this.currentBootMessage = Math.min(
      this.bootMessages.length - 1,
      Math.floor(this.stateTime / messageInterval)
    );
    
    // Check if boot is complete
    if (this.bootProgress >= 1 && !this.bootComplete) {
      this.bootComplete = true;
      setTimeout(() => {
        this.soundEngine.playSound(SoundEffect.GAME_START);
        this.state = GameState.TITLE;
        this.stateTime = 0;
      }, 1000);
    }
    
    // Skip boot with start button
    if (inputState.start === 1) {
      this.bootComplete = true;
      this.soundEngine.playSound(SoundEffect.MENU_SELECT);
      this.state = GameState.TITLE;
      this.stateTime = 0;
    }
  }
  
  /**
   * Update title screen
   */
  private updateTitleScreen(deltaTime: number, inputState: InputState): void {
    this.stateTime += deltaTime;
    
    // Reload high scores when first entering title screen
    if (this.stateTime < deltaTime * 2) {
      this.loadHighScores().then(() => {
        console.log('High scores loaded for title screen:', this.highScores);
      }).catch(err => {
        console.error('Failed to load high scores for title screen:', err);
      });
    }
    
    // Start game on fire or start button
    if (inputState.fire === 1 || inputState.start === 1) {
      this.soundEngine.playSound(SoundEffect.MENU_SELECT);
      this.startGame();
    }
  }
  
  /**
   * Update game start sequence
   */
  private updateGameStart(deltaTime: number, inputState: InputState): void {
    this.stateTime += deltaTime;
    
    // Transition to playing after intro animation and countdown
    if (this.stateTime >= 3) {
      this.state = GameState.PLAYING;
      this.stateTime = 0;
      
      // Start background music
      this.soundEngine.startMusic().catch(err => {
        console.error("Failed to start background music:", err);
      });
    }
  }
  
  /**
   * Update playing state
   */
  private updatePlaying(deltaTime: number, inputState: InputState): void {
    // Update player
    this.player.update(deltaTime, inputState);
    
    // Update formation
    this.formationManager.update(deltaTime, this.player.getPosition());
    
    // Update power-ups
    this.powerUpManager.update(deltaTime);
    
    // Collision detection
    this.handleCollisions();
    
    // Check if wave is cleared
    if (this.formationManager.isWaveCleared()) {
      this.state = GameState.LEVEL_COMPLETE;
      this.stateTime = 0;
      this.soundEngine.playSound(SoundEffect.LEVEL_COMPLETE);
    }
    
    // Check if player is dead
    if (this.player.isDead()) {
      this.state = GameState.GAME_OVER;
      this.stateTime = 0;
      this.soundEngine.stopMusic();
      this.soundEngine.playSound(SoundEffect.GAME_OVER);
    }
  }
  
  /**
   * Handle all game collisions
   */
  private handleCollisions(): void {
    const enemies = this.formationManager.getEnemies();
    const playerProjectiles = this.player.getProjectiles();
    const powerUps = this.powerUpManager.getPowerUps();
    
    // Player projectiles vs enemies
    const projectileEnemyCollisions = CollisionSystem.detectGroupCollisions(
      playerProjectiles,
      enemies
    );
    
    // Handle projectile hits
    for (const [projectile, hitEnemies] of projectileEnemyCollisions.entries()) {
      projectile.deactivate();
      
      for (const enemy of hitEnemies) {
        if (enemy.hit()) {
          // Enemy was destroyed
          const points = enemy.getPoints();
          this.score += points;
          this.player.addScore(points);
          
          // Chance to spawn a power-up at enemy position
          const enemyPos = enemy.getPosition();
          this.powerUpManager.spawnPowerUpAtPosition(enemyPos.x, enemyPos.y, points);
        }
      }
    }
    
    // Player vs power-ups
    const playerPowerUpCollisions = CollisionSystem.detectCollisions(
      this.player,
      powerUps
    );
    
    // Handle power-up collection
    for (const powerUp of playerPowerUpCollisions) {
      const powerUpType = powerUp.getType();
      this.player.activatePowerUp(powerUpType);
      
      powerUp.activate(); // This will deactivate the power-up
    }
    
    // Enemy projectiles vs player
    const enemyProjectiles: Projectile[] = [];
    for (const enemy of enemies) {
      enemyProjectiles.push(...enemy.getProjectiles());
    }
    
    const playerCollisions = CollisionSystem.detectCollisions(
      this.player,
      enemyProjectiles
    );
    
    // Handle player hits
    if (playerCollisions.length > 0) {
      // Deactivate all projectiles that hit the player
      for (const projectile of playerCollisions) {
        projectile.deactivate();
      }
      
      // Player takes damage
      this.player.hit();
    }
    
    // Direct collisions between enemies and player
    const enemyPlayerCollisions = CollisionSystem.detectCollisions(
      this.player,
      enemies
    );
    
    if (enemyPlayerCollisions.length > 0) {
      // Player collided directly with an enemy
      this.player.hit();
    }
    
    // Special handling for capture by Blood Lord enemies
    for (const enemy of enemies) {
      if (enemy.getState() === EnemyState.CAPTURING) {
        // Add special capture logic here
      }
    }
  }
  
  // Garlic area attack removed
  
  /**
   * Update level complete state
   */
  private updateLevelComplete(deltaTime: number, inputState: InputState): void {
    this.stateTime += deltaTime;
    
    // Transition to next level after delay
    if (this.stateTime >= 3) {
      this.level++;
      this.formationManager.createWave();
      this.powerUpManager.clearPowerUps(); // Reset powerups between rounds
      
      // Reset player projectiles between waves
      this.player.resetProjectiles();
      
      // Reset enemy projectiles by clearing them from all enemies
      const enemies = this.formationManager.getEnemies();
      for (const enemy of enemies) {
        enemy.clearProjectiles();
      }
      
      this.state = GameState.GAME_START;
      this.stateTime = 0;
    }
  }
  
  /**
   * Update game over state
   */
  private updateGameOver(deltaTime: number, inputState: InputState): void {
    this.stateTime += deltaTime;
    
    // Check if score qualifies for high score
    if (this.stateTime >= 3) {
      // Reset player name and position for high score entry
      this.playerName = '';
      this.nameEntryPosition = 0;
      this.nameEntryDebounce = 0;
      this.confirmDebounce = 0;
      
      // For debugging: Always go to high score screen
      console.log('Game over - Always transitioning to HIGH_SCORE state for debugging');
      this.state = GameState.HIGH_SCORE;
      this.stateTime = 0;
      
      // Add direct keyboard event listener for high score entry
      window.addEventListener('keydown', this.boundKeyDownHandler);
      console.log('Added high score keyboard handler');
    }
  }
  
  /**
   * Handle keydown events specifically for high score entry
   */
  private handleHighScoreKeyDown(e: KeyboardEvent): void {
    console.log('High score key down:', e.key, 'State:', this.state);
    
    // Only process if we're in the high score state
    if (this.state !== GameState.HIGH_SCORE) return;
    
    // Prevent default to avoid browser scrolling etc.
    e.preventDefault();
    
    // Don't process if we've already entered all characters
    if (this.nameEntryPosition >= this.MAX_NAME_LENGTH) return;
    
    // Don't process if we're still in debounce period
    if (this.nameEntryDebounce > 0) return;
    
    // Handle letter/number keys for direct input
    if (/^[a-zA-Z0-9]$/.test(e.key)) {
      // Convert to uppercase
      const char = e.key.toUpperCase();
      
      // Update the current character
      if (this.playerName.length <= this.nameEntryPosition) {
        this.playerName += char;
      } else {
        this.playerName = this.playerName.substring(0, this.nameEntryPosition) +
                          char +
                          this.playerName.substring(this.nameEntryPosition + 1);
      }
      
      // Advance to next position
      this.nameEntryPosition++;
      console.log('Direct input:', char, 'Updated name to:', this.playerName);
      this.soundEngine.playSound(SoundEffect.MENU_NAVIGATE);
      this.nameEntryDebounce = this.DEBOUNCE_TIME;
      
      // If we've entered all characters, submit the high score
      if (this.nameEntryPosition >= this.MAX_NAME_LENGTH) {
        this.confirmHighScore();
      }
    }
    // Handle backspace to delete characters
    else if (e.key === 'Backspace') {
      if (this.nameEntryPosition > 0) {
        // Move back one position
        this.nameEntryPosition--;
        
        // Remove the character at the current position by rebuilding the string
        // This is a more reliable approach that avoids potential string manipulation issues
        let newName = '';
        for (let i = 0; i < this.playerName.length; i++) {
          if (i !== this.nameEntryPosition) {
            newName += this.playerName[i];
          }
        }
        this.playerName = newName;
        
        console.log('Backspace pressed, updated name to:', this.playerName);
        this.soundEngine.playSound(SoundEffect.MENU_NAVIGATE);
        this.nameEntryDebounce = this.DEBOUNCE_TIME;
      }
    }
    // Handle arrow keys
    else if (e.key === 'ArrowUp') {
      const currentChar = this.playerName.charAt(this.nameEntryPosition) || 'A';
      const currentIndex = this.ALLOWED_CHARS.indexOf(currentChar);
      const newIndex = (currentIndex + 1) % this.ALLOWED_CHARS.length;
      this.playerName = this.playerName.substring(0, this.nameEntryPosition) +
                        this.ALLOWED_CHARS.charAt(newIndex) +
                        this.playerName.substring(this.nameEntryPosition + 1);
      console.log('Changed character to:', this.playerName);
      this.soundEngine.playSound(SoundEffect.MENU_NAVIGATE);
      this.nameEntryDebounce = this.DEBOUNCE_TIME;
    }
    else if (e.key === 'ArrowDown') {
      const currentChar = this.playerName.charAt(this.nameEntryPosition) || 'A';
      const currentIndex = this.ALLOWED_CHARS.indexOf(currentChar);
      const newIndex = (currentIndex - 1 + this.ALLOWED_CHARS.length) % this.ALLOWED_CHARS.length;
      this.playerName = this.playerName.substring(0, this.nameEntryPosition) +
                        this.ALLOWED_CHARS.charAt(newIndex) +
                        this.playerName.substring(this.nameEntryPosition + 1);
      console.log('Changed character to:', this.playerName);
      this.soundEngine.playSound(SoundEffect.MENU_NAVIGATE);
      this.nameEntryDebounce = this.DEBOUNCE_TIME;
    }
    // Handle Enter/Space to confirm character
    else if (e.key === 'Enter' || e.key === ' ') {
      // If no character is selected, default to 'A'
      if (this.nameEntryPosition >= this.playerName.length) {
        this.playerName += 'A';
      }
      
      this.nameEntryPosition++;
      console.log('Advanced to position:', this.nameEntryPosition);
      this.soundEngine.playSound(SoundEffect.MENU_SELECT);
      this.confirmDebounce = this.CONFIRM_DEBOUNCE_TIME;
      
      // If we've entered all characters, submit the high score
      if (this.nameEntryPosition >= this.MAX_NAME_LENGTH) {
        this.confirmHighScore();
      }
    }
  }
  
  // Flag to track if we're transitioning from high score to title
  private transitioningFromHighScore: boolean = false;

  /**
   * Confirm high score and transition back to title screen
   */
  private confirmHighScore(): void {
    console.log('Name entry complete, submitting high score');
    
    // Immediately remove keyboard handler to prevent any further input
    window.removeEventListener('keydown', this.boundKeyDownHandler);
    console.log('Removed high score keyboard handler');
    
    // Add the high score first
    this.addHighScore();
    
    // Set the transitioning flag to true
    this.transitioningFromHighScore = true;
    
    // Simplify the transition process to avoid race conditions
    // First stop the music
    this.soundEngine.stopMusic();
    
    // Use a single timeout for the transition
    setTimeout(() => {
      // Change state first
      this.state = GameState.TITLE;
      this.stateTime = 0;
      
      // Then restart music with a direct approach using restartMusic
      this.soundEngine.restartMusic().catch(err => {
        console.error("Failed to restart background music:", err);
      });
      
      // Reset the transitioning flag after a short delay
      setTimeout(() => {
        this.transitioningFromHighScore = false;
      }, 100);
    }, 300);
  }
  
  // Player name for high score
  private playerName: string = '';
  private nameEntryPosition: number = 0;
  private readonly MAX_NAME_LENGTH: number = 3;
  private readonly ALLOWED_CHARS: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  private nameEntryDebounce: number = 0;
  private readonly DEBOUNCE_TIME: number = 0.2; // 200ms debounce for name entry
  private confirmDebounce: number = 0;
  private readonly CONFIRM_DEBOUNCE_TIME: number = 0.5; // 500ms debounce for confirmation
  
  // Direct keyboard handling for high score entry
  private boundKeyDownHandler: (e: KeyboardEvent) => void;
  
  /**
   * Update high score entry state
   */
  private updateHighScore(deltaTime: number, inputState: InputState): void {
    this.stateTime += deltaTime;
    
    console.log('In HIGH_SCORE state, nameEntryPosition:', this.nameEntryPosition,
                'playerName:', this.playerName,
                'inputState:', JSON.stringify(inputState));
    
    // Update debounce timers
    if (this.nameEntryDebounce > 0) {
      this.nameEntryDebounce -= deltaTime;
    }
    
    if (this.confirmDebounce > 0) {
      this.confirmDebounce -= deltaTime;
    }
    
    // Handle name entry
    if (this.nameEntryPosition < this.MAX_NAME_LENGTH) {
      // Initialize first character if empty
      if (this.playerName.length === 0) {
        this.playerName = 'A';
        console.log('Initialized playerName to:', this.playerName);
      }
      
      // Ensure the current position has a character
      if (this.nameEntryPosition >= this.playerName.length) {
        this.playerName += 'A';
      }
      
      // Move selection up/down through characters with debounce
      if (inputState.up === KeyState.PRESSED || (inputState.up === KeyState.HELD && this.nameEntryDebounce <= 0)) {
        console.log('UP pressed/held');
        const currentChar = this.playerName.charAt(this.nameEntryPosition) || 'A';
        const currentIndex = this.ALLOWED_CHARS.indexOf(currentChar);
        const newIndex = (currentIndex + 1) % this.ALLOWED_CHARS.length;
        this.playerName = this.playerName.substring(0, this.nameEntryPosition) +
                          this.ALLOWED_CHARS.charAt(newIndex) +
                          this.playerName.substring(this.nameEntryPosition + 1);
        console.log('Changed character to:', this.playerName);
        this.soundEngine.playSound(SoundEffect.MENU_NAVIGATE);
        // Reset state time to prevent auto-advancing
        this.stateTime = 0;
        // Set debounce timer
        this.nameEntryDebounce = this.DEBOUNCE_TIME;
      }
      
      if (inputState.down === KeyState.PRESSED || (inputState.down === KeyState.HELD && this.nameEntryDebounce <= 0)) {
        console.log('DOWN pressed/held');
        const currentChar = this.playerName.charAt(this.nameEntryPosition) || 'A';
        const currentIndex = this.ALLOWED_CHARS.indexOf(currentChar);
        const newIndex = (currentIndex - 1 + this.ALLOWED_CHARS.length) % this.ALLOWED_CHARS.length;
        this.playerName = this.playerName.substring(0, this.nameEntryPosition) +
                          this.ALLOWED_CHARS.charAt(newIndex) +
                          this.playerName.substring(this.nameEntryPosition + 1);
        console.log('Changed character to:', this.playerName);
        this.soundEngine.playSound(SoundEffect.MENU_NAVIGATE);
        // Reset state time to prevent auto-advancing
        this.stateTime = 0;
        // Set debounce timer
        this.nameEntryDebounce = this.DEBOUNCE_TIME;
      }
      
      // Confirm character and move to next position - with strong debounce
      const confirmPressed =
          inputState.fire === KeyState.PRESSED ||
          inputState.start === KeyState.PRESSED;
      
      // Log space key state
      console.log('Space pressed:', this.inputHandler.isSpacePressed(), 'confirmDebounce:', this.confirmDebounce);
          
      // Special check for space key since it's important for confirmation
      if (this.inputHandler.isSpacePressed() && this.confirmDebounce <= 0) {
        console.log('SPACE pressed, confirming character');
        this.nameEntryPosition++;
        console.log('Advanced to position:', this.nameEntryPosition);
        this.soundEngine.playSound(SoundEffect.MENU_SELECT);
        // Reset state time to prevent auto-advancing
        this.stateTime = 0;
        // Set confirm debounce timer to prevent multiple confirmations
        this.confirmDebounce = this.CONFIRM_DEBOUNCE_TIME;
        
        // If we've entered all characters, submit the high score
        if (this.nameEntryPosition >= this.MAX_NAME_LENGTH) {
          this.confirmHighScore();
        }
        
        return; // Skip the regular check below
      }
          
      if (confirmPressed && this.confirmDebounce <= 0) {
        console.log('FIRE/START pressed, confirming character');
        this.nameEntryPosition++;
        console.log('Advanced to position:', this.nameEntryPosition);
        this.soundEngine.playSound(SoundEffect.MENU_SELECT);
        // Reset state time to prevent auto-advancing
        this.stateTime = 0;
        // Set confirm debounce timer to prevent multiple confirmations
        this.confirmDebounce = this.CONFIRM_DEBOUNCE_TIME;
        
        // If we've entered all characters, submit the high score
        if (this.nameEntryPosition >= this.MAX_NAME_LENGTH) {
          this.confirmHighScore();
        }
      }
    } else {
      console.log('Name entry complete:', this.playerName);
      // Name entry complete, add high score after a short delay
      if (this.stateTime >= 1) {
        console.log('Adding high score and returning to title screen');
        
        // Immediately remove keyboard handler to prevent any further input
        window.removeEventListener('keydown', this.boundKeyDownHandler);
        console.log('Removed high score keyboard handler from updateHighScore');
        
        // Add the high score first
        this.addHighScore();
        
        // Reset player name and entry state
        this.playerName = '';
        this.nameEntryPosition = 0;
        this.nameEntryDebounce = 0;
        this.confirmDebounce = 0;
        
        // Set the transitioning flag to true
        this.transitioningFromHighScore = true;
        
        // Simplify the transition process to avoid race conditions
        // First stop the music
        this.soundEngine.stopMusic();
        
        // Use a single timeout for the transition
        setTimeout(() => {
          // Change state first
          this.state = GameState.TITLE;
          this.stateTime = 0;
          
          // Then restart music with a direct approach using restartMusic
          this.soundEngine.restartMusic().catch(err => {
            console.error("Failed to restart background music:", err);
          });
          
          // Reload high scores after transition
          this.loadHighScores().then(() => {
            console.log('High scores reloaded for title screen:', this.highScores);
          }).catch(err => {
            console.error('Failed to reload high scores:', err);
          });
          
          // Reset the transitioning flag after a short delay
          setTimeout(() => {
            this.transitioningFromHighScore = false;
          }, 100);
        }, 300);
      }
    }
  }
  
  /**
   * Render the current frame
   */
  private render(): void {
    // Clear the canvas
    this.renderer.clear();
    this.renderer.fill('#000000'); // Black background
    
    // Draw stars
    this.drawStars();
    
    // If we're transitioning from HIGH_SCORE to TITLE, render the title screen
    // This prevents the flash of the game screen during transition
    if (this.transitioningFromHighScore && this.state === GameState.TITLE) {
      this.renderTitleScreen();
    } else {
      // Normal rendering based on game state
      switch (this.state) {
        case GameState.BOOT:
          this.renderBootScreen();
          break;
          
        case GameState.TITLE:
          this.renderTitleScreen();
          break;
          
        case GameState.GAME_START:
        case GameState.PLAYING:
        case GameState.LEVEL_COMPLETE:
          this.renderGame();
          break;
          
        case GameState.GAME_OVER:
          this.renderGame();
          this.renderGameOver();
          break;
          
        case GameState.HIGH_SCORE:
          this.renderHighScore();
          break;
      }
    }
    
    // Apply CRT effect
    this.renderer.applyCrtEffect();
  }
  
  /**
   * Render the boot screen
   */
  private renderBootScreen(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Create a dark atmospheric background
    this.renderer.fillRect(0, 0, this.width, this.height, '#050505');
    
    // Draw starfield background
    this.drawStars();
    
    // Draw loading text
    const loadingText = "LOADING VALAXY";
    this.renderer.drawText(loadingText, {
      x: centerX,
      y: centerY - 40,
      color: '#FF0033',
      fontSize: 48,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Draw progress bar
    const progressBarWidth = 400;
    const progressBarHeight = 20;
    const progressBarX = centerX - progressBarWidth / 2;
    const progressBarY = centerY + 20;
    
    // Progress bar background
    this.renderer.fillRect(
      progressBarX,
      progressBarY,
      progressBarWidth,
      progressBarHeight,
      'rgba(50, 50, 50, 0.5)'
    );
    
    // Progress bar fill
    this.renderer.fillRect(
      progressBarX,
      progressBarY,
      progressBarWidth * this.bootProgress,
      progressBarHeight,
      '#FF0033'
    );
    
    // Progress bar border
    this.renderer.strokeRect(
      progressBarX,
      progressBarY,
      progressBarWidth,
      progressBarHeight,
      'rgba(255, 255, 255, 0.7)',
      2
    );
    
    // Draw percentage text
    const percentText = `${Math.floor(this.bootProgress * 100)}%`;
    this.renderer.drawText(percentText, {
      x: centerX,
      y: progressBarY + 50,
      color: '#FFFFFF',
      fontSize: 24,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Draw completion effect when full
    if (this.bootProgress >= 1) {
      // Pulsing glow
      const pulseSize = 150 + Math.sin(this.stateTime * 5) * 30;
      const pulseAlpha = 0.2 + Math.sin(this.stateTime * 3) * 0.1;
      
      this.renderer.fillCircle(
        centerX,
        centerY,
        pulseSize,
        `rgba(255, 0, 0, ${pulseAlpha})`
      );
      
      // "READY" text
      const readyAlpha = (Math.sin(this.stateTime * 5) + 1) / 2;
      this.renderer.drawText("READY", {
        x: centerX,
        y: progressBarY + 100,
        color: `rgba(255, 255, 255, ${readyAlpha})`,
        fontSize: 36,
        align: 'center',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
    }
    
    // Draw copyright and license at the bottom
    this.renderer.drawText("© 2025 WEST COAST AI LABS", {
      x: centerX,
      y: this.height - 80,
      color: '#AAAAAA',
      fontSize: 24,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    this.renderer.drawText("LICENSED BY WEST COAST AI LABS", {
      x: centerX,
      y: this.height - 40,
      color: '#FF0000',
      fontSize: 24,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
  }
  
  /**
   * Render the title screen
   */
  private renderTitleScreen(): void {
    const centerX = this.width / 2;
    
    // Draw vampire-themed background
    this.drawVampireBackground();
    
    // Draw vertical dark red columns on sides for authentic arcade look
    const columnWidth = this.width * 0.15;
    this.renderer.fillRect(0, 0, columnWidth, this.height, '#220000');
    this.renderer.fillRect(this.width - columnWidth, 0, columnWidth, this.height, '#220000');
    
    // Draw horizontal scanlines for CRT effect
    for (let i = 0; i < this.height; i += 3) {
      this.renderer.fillRect(0, i, this.width, 1, 'rgba(0, 0, 0, 0.1)');
    }
    
    // Removed fangs and blood drips as requested
    
    // Draw title with enhanced neon effect
    const titleY = this.height * 0.15;
    this.drawEnhancedLogo(centerX, titleY, 2.5);
    
    // Draw prompt with enhanced neon glow effect
    const promptAlpha = (Math.sin(this.stateTime * 5) + 1) / 2;
    
    // Create a red box behind the prompt with enhanced styling
    this.renderer.fillRect(centerX - 250, this.height * 0.4 - 30, 500, 60, '#550000');
    this.renderer.strokeRect(centerX - 250, this.height * 0.4 - 30, 500, 60, '#FF0000', 2);
    
    // Add inner border for more depth
    this.renderer.strokeRect(centerX - 245, this.height * 0.4 - 25, 490, 50, '#880000', 1);
    
    // Draw multiple glow layers for text
    for (let i = 0; i < 3; i++) {
      const glowSize = 3 - i;
      const glowAlpha = (0.3 - (i * 0.1)) * promptAlpha;
      
      this.renderer.drawText("PRESS SPACE TO PLAY", {
        x: centerX,
        y: this.height * 0.39,
        color: 'rgba(255, 0, 0, ' + glowAlpha + ')',
        fontSize: 52 + glowSize * 2,
        align: 'center',
        alpha: glowAlpha,
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
    }
    
    // Draw main text
    this.renderer.drawText("PRESS SPACE TO PLAY", {
      x: centerX,
      y: this.height * 0.39,
      color: '#FFFFFF',
      fontSize: 48,
      align: 'center',
      alpha: promptAlpha,
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Draw high scores section with enhanced decorative border
    const scoreBoxWidth = 500;
    const scoreBoxHeight = 250; // Increased height for better spacing
    const scoreBoxX = centerX - scoreBoxWidth / 2;
    const scoreBoxY = this.height * 0.55 - 40;
    
    // Draw score box background with gradient
    this.renderer.fillRect(scoreBoxX, scoreBoxY, scoreBoxWidth, scoreBoxHeight, 'rgba(0, 0, 0, 0.7)');
    
    // Draw enhanced border with double lines and corner decorations
    this.renderer.strokeRect(scoreBoxX, scoreBoxY, scoreBoxWidth, scoreBoxHeight, '#FFAA00', 2);
    this.renderer.strokeRect(scoreBoxX + 5, scoreBoxY + 5, scoreBoxWidth - 10, scoreBoxHeight - 10, '#FFAA00', 1);
    
    // Add corner decorations
    const cornerSize = 10;
    // Top-left corner
    this.renderer.fillRect(scoreBoxX, scoreBoxY, cornerSize, 2, '#FFAA00');
    this.renderer.fillRect(scoreBoxX, scoreBoxY, 2, cornerSize, '#FFAA00');
    // Top-right corner
    this.renderer.fillRect(scoreBoxX + scoreBoxWidth - cornerSize, scoreBoxY, cornerSize, 2, '#FFAA00');
    this.renderer.fillRect(scoreBoxX + scoreBoxWidth - 2, scoreBoxY, 2, cornerSize, '#FFAA00');
    // Bottom-left corner
    this.renderer.fillRect(scoreBoxX, scoreBoxY + scoreBoxHeight - 2, cornerSize, 2, '#FFAA00');
    this.renderer.fillRect(scoreBoxX, scoreBoxY + scoreBoxHeight - cornerSize, 2, cornerSize, '#FFAA00');
    // Bottom-right corner
    this.renderer.fillRect(scoreBoxX + scoreBoxWidth - cornerSize, scoreBoxY + scoreBoxHeight - 2, cornerSize, 2, '#FFAA00');
    this.renderer.fillRect(scoreBoxX + scoreBoxWidth - 2, scoreBoxY + scoreBoxHeight - cornerSize, 2, cornerSize, '#FFAA00');
    
    // Draw high scores header with enhanced arcade-style decoration
    this.renderer.fillRect(centerX - 200, scoreBoxY + 10, 400, 3, '#FFAA00');
    
    // Draw header text with glow effect
    for (let i = 0; i < 2; i++) {
      const glowSize = 2 - i;
      const glowAlpha = 0.3 - (i * 0.15);
      
      this.renderer.drawText("HIGH SCORES", {
        x: centerX,
        y: scoreBoxY + 30,
        color: 'rgba(255, 170, 0, ' + glowAlpha + ')',
        fontSize: 36 + glowSize * 2,
        align: 'center',
        alpha: glowAlpha,
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
    }
    
    this.renderer.drawText("HIGH SCORES", {
      x: centerX,
      y: scoreBoxY + 30,
      color: '#FFAA00',
      fontSize: 36,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    this.renderer.fillRect(centerX - 200, scoreBoxY + 50, 400, 3, '#FFAA00');
    
    // Display top 5 scores from our high scores array with enhanced styling
    const displayScores = this.highScores.slice(0, 5);
    
    // Make sure we always show 5 slots even if we have fewer scores
    for (let i = 0; i < 5; i++) {
      const score = i < displayScores.length ? displayScores[i] : { name: '---', score: 0, date: '', wave: 0 };
      const rowY = scoreBoxY + 90 + i * 30;
      const isHighlighted = Math.floor(this.stateTime * 2) % 5 === i; // Highlight rows sequentially
      
      // Draw row highlight for arcade effect
      if (isHighlighted) {
        this.renderer.fillRect(scoreBoxX + 20, rowY - 15, scoreBoxWidth - 40, 30, 'rgba(153, 0, 0, 0.2)');
      }
      
      // Display rank with enhanced styling
      this.renderer.drawText(`${i+1}.`, {
        x: scoreBoxX + 80,
        y: rowY,
        color: i === 0 ? '#FFFF00' : (isHighlighted ? '#FF9999' : '#FFFFFF'),
        fontSize: 24,
        align: 'right',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
      
      // Display name with enhanced styling
      this.renderer.drawText(score.name, {
        x: scoreBoxX + 100,
        y: rowY,
        color: i === 0 ? '#FFFF00' : (isHighlighted ? '#FF9999' : '#FFFFFF'),
        fontSize: 24,
        align: 'left',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
      
      // Display score with enhanced styling
      this.renderer.drawText(score.score.toString().padStart(6, '0'), {
        x: scoreBoxX + 250,
        y: rowY,
        color: i === 0 ? '#FFFF00' : (isHighlighted ? '#FF9999' : '#FFFFFF'),
        fontSize: 24,
        align: 'right',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
      
      // Display wave with enhanced styling
      this.renderer.drawText(`WAVE ${score.wave}`, {
        x: scoreBoxX + 420,
        y: rowY,
        color: i === 0 ? '#FFFF00' : (isHighlighted ? '#FF9999' : '#FFFFFF'),
        fontSize: 24,
        align: 'right',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
    }
    
    // Draw "GLOBAL LEADERBOARD" text to emphasize online nature
    this.renderer.drawText("GLOBAL LEADERBOARD", {
      x: centerX,
      y: scoreBoxY + scoreBoxHeight - 20,
      color: '#FF5555',
      fontSize: 20,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Draw "LICENSED BY WEST COAST AI LABS" text at the bottom of the high scores box
    this.renderer.drawText("LICENSED BY WEST COAST AI LABS", {
      x: centerX,
      y: scoreBoxY + scoreBoxHeight + 35,
      color: '#FF0000',
      fontSize: 24,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Draw copyright
    this.renderer.drawText("© 2025 WEST COAST AI LABS", {
      x: centerX,
      y: this.height - 40,
      color: '#AAAAAA',
      fontSize: 20,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
  }
  
  /**
   * Draw vampire-themed background
   */
  private drawVampireBackground(): void {
    // Draw dark blood-red gradient background
    this.renderer.fillRect(0, 0, this.width, this.height, '#110000');
    
    // Draw a full moon
    const moonX = this.width * 0.8;
    const moonY = this.height * 0.2;
    const moonSize = 60 + Math.sin(this.stateTime) * 3;
    
    // Moon glow
    this.renderer.fillCircle(
      moonX,
      moonY,
      moonSize + 20,
      'rgba(255, 0, 0, 0.1)'
    );
    
    this.renderer.fillCircle(
      moonX,
      moonY,
      moonSize + 10,
      'rgba(255, 0, 0, 0.2)'
    );
    
    // Moon core
    this.renderer.fillCircle(
      moonX,
      moonY,
      moonSize,
      'rgba(255, 200, 200, 0.8)'
    );
    
    // Draw highly detailed medieval castle
    const castleWidth = 300;
    const castleHeight = 150;
    const castleX = this.width / 2 - castleWidth / 2;
    const castleY = this.height * 0.3;
    
    // Define colors for more depth and realism
    const baseColor = 'rgba(50, 10, 10, 0.7)';      // Main castle walls
    const darkStone = 'rgba(30, 5, 5, 0.8)';        // Shadows and dark areas
    const lightStone = 'rgba(70, 20, 20, 0.6)';     // Highlights and light areas
    const deepShadow = 'rgba(10, 0, 0, 0.9)';       // Deep shadows and openings
    const windowGlow = 'rgba(255, 200, 100, 0.25)'; // Window light
    const moonlight = 'rgba(180, 180, 220, 0.1)';   // Moonlit surfaces
    
    // Draw distant mountains in background for depth
    for (let i = 0; i < 5; i++) {
      const mountainWidth = 180 + i * 40;
      const mountainHeight = 100 - i * 15;
      const mountainX = castleX + (i * 80) - 150;
      const mountainY = castleY - mountainHeight + castleHeight + 30;
      
      // Draw mountain silhouette
      this.renderer.fillRect(
        mountainX,
        mountainY,
        mountainWidth,
        mountainHeight,
        `rgba(15, 0, 0, ${0.3 - i * 0.05})`
      );
      
      // Add moonlight highlight to mountain peaks
      if (i % 2 === 0) {
        this.renderer.fillRect(
          mountainX + mountainWidth * 0.3,
          mountainY,
          mountainWidth * 0.1,
          10,
          moonlight
        );
      }
    }
    
    // Draw castle foundation with texture
    this.renderer.fillRect(
      castleX - 20,
      castleY + castleHeight - 20,
      castleWidth + 40,
      25,
      darkStone
    );
    
    // Draw main castle structure with depth
    this.renderer.fillRect(
      castleX,
      castleY,
      castleWidth,
      castleHeight,
      baseColor
    );
    
    // Add stone texture to castle walls (horizontal lines)
    for (let i = 0; i < castleHeight; i += 15) {
      this.renderer.fillRect(
        castleX,
        castleY + i,
        castleWidth,
        2,
        'rgba(0, 0, 0, 0.2)'
      );
    }
    
    // Add stone texture to castle walls (vertical lines)
    for (let i = 0; i < castleWidth; i += 30) {
      this.renderer.fillRect(
        castleX + i,
        castleY,
        2,
        castleHeight,
        'rgba(0, 0, 0, 0.15)'
      );
    }
    
    // Add castle wall battlements (crenellations)
    const creWidth = 12;
    const creHeight = 12;
    const creCount = Math.floor(castleWidth / (creWidth * 1.5));
    
    for (let i = 0; i < creCount; i++) {
      this.renderer.fillRect(
        castleX + (i * creWidth * 1.5) + 5,
        castleY - creHeight,
        creWidth,
        creHeight,
        darkStone
      );
    }
    
    // Draw main keep in center (taller central structure)
    const keepWidth = 80;
    const keepHeight = 100;
    const keepX = castleX + castleWidth / 2 - keepWidth / 2;
    const keepY = castleY - keepHeight + 30;
    
    // Main keep structure
    this.renderer.fillRect(
      keepX,
      keepY,
      keepWidth,
      keepHeight,
      lightStone
    );
    
    // Keep stone texture (horizontal)
    for (let i = 0; i < keepHeight; i += 15) {
      this.renderer.fillRect(
        keepX,
        keepY + i,
        keepWidth,
        2,
        'rgba(0, 0, 0, 0.2)'
      );
    }
    
    // Keep battlements
    for (let i = 0; i < 5; i++) {
      this.renderer.fillRect(
        keepX + (i * 16) + 4,
        keepY - 10,
        10,
        10,
        darkStone
      );
    }
    
    // Keep windows
    this.renderer.fillRect(
      keepX + 20,
      keepY + 20,
      15,
      25,
      windowGlow
    );
    
    this.renderer.fillRect(
      keepX + 45,
      keepY + 20,
      15,
      25,
      windowGlow
    );
    
    this.renderer.fillRect(
      keepX + 30,
      keepY + 60,
      20,
      30,
      windowGlow
    );
    
    // Keep roof (pointed)
    for (let i = 0; i < 15; i++) {
      this.renderer.fillRect(
        keepX + 10 + i * 4,
        keepY - 25 + i,
        keepWidth - 20 - i * 8,
        5,
        darkStone
      );
    }
    
    // Draw corner towers (4 towers)
    const towerPositions = [
      { x: castleX - 25, y: castleY - 40 },                    // Left front
      { x: castleX + castleWidth - 15, y: castleY - 40 },      // Right front
      { x: castleX - 15, y: castleY + castleHeight - 60 },     // Left back
      { x: castleX + castleWidth - 25, y: castleY + castleHeight - 60 } // Right back
    ];
    
    towerPositions.forEach((pos, index) => {
      const towerWidth = 40;
      const towerHeight = 90;
      
      // Main tower structure
      this.renderer.fillRect(
        pos.x,
        pos.y,
        towerWidth,
        towerHeight,
        index < 2 ? lightStone : baseColor // Front towers lighter
      );
      
      // Tower stone texture
      for (let i = 0; i < towerHeight; i += 15) {
        this.renderer.fillRect(
          pos.x,
          pos.y + i,
          towerWidth,
          2,
          'rgba(0, 0, 0, 0.2)'
        );
      }
      
      // Tower battlements
      for (let i = 0; i < 3; i++) {
        this.renderer.fillRect(
          pos.x + (i * 12) + 2,
          pos.y - 8,
          8,
          8,
          darkStone
        );
      }
      
      // Tower conical roof
      for (let i = 0; i < 12; i++) {
        this.renderer.fillRect(
          pos.x - 5 + i,
          pos.y - 20 + i,
          towerWidth + 10 - i * 2,
          4,
          deepShadow
        );
      }
      
      // Tower windows (2 per tower)
      this.renderer.fillRect(
        pos.x + 10,
        pos.y + 20,
        towerWidth - 20,
        15,
        windowGlow
      );
      
      this.renderer.fillRect(
        pos.x + 10,
        pos.y + 50,
        towerWidth - 20,
        15,
        windowGlow
      );
    });
    
    // Draw gatehouse (elaborate entrance)
    const gateWidth = 50;
    const gateHeight = 70;
    const gateX = castleX + castleWidth / 2 - gateWidth / 2;
    const gateY = castleY + castleHeight - gateHeight;
    
    // Gatehouse structure
    this.renderer.fillRect(
      gateX - 10,
      gateY - 20,
      gateWidth + 20,
      gateHeight,
      lightStone
    );
    
    // Gatehouse battlements
    for (let i = 0; i < 5; i++) {
      this.renderer.fillRect(
        gateX - 5 + (i * 15),
        gateY - 28,
        10,
        8,
        darkStone
      );
    }
    
    // Gate opening (archway)
    this.renderer.fillRect(
      gateX + 5,
      gateY + 10,
      gateWidth - 10,
      gateHeight - 10,
      deepShadow
    );
    
    // Gate arch
    for (let i = 0; i < 5; i++) {
      this.renderer.fillRect(
        gateX + 5 + i * 2,
        gateY + 10,
        gateWidth - 10 - i * 4,
        5,
        darkStone
      );
    }
    
    // Portcullis (gate bars)
    for (let i = 0; i < 4; i++) {
      this.renderer.fillRect(
        gateX + 10 + i * 10,
        gateY + 15,
        2,
        gateHeight - 15,
        darkStone
      );
    }
    
    // Drawbridge
    this.renderer.fillRect(
      gateX + 5,
      gateY + gateHeight,
      gateWidth - 10,
      15,
      darkStone
    );
    
    // Add curtain walls connecting towers
    // Left wall
    this.renderer.fillRect(
      castleX - 15,
      castleY + 20,
      20,
      castleHeight - 80,
      baseColor
    );
    
    // Right wall
    this.renderer.fillRect(
      castleX + castleWidth - 5,
      castleY + 20,
      20,
      castleHeight - 80,
      baseColor
    );
    
    // Add wall battlements
    for (let i = 0; i < 3; i++) {
      // Left wall battlements
      this.renderer.fillRect(
        castleX - 15 + i * 7,
        castleY + 12,
        5,
        8,
        darkStone
      );
      
      // Right wall battlements
      this.renderer.fillRect(
        castleX + castleWidth - 5 + i * 7,
        castleY + 12,
        5,
        8,
        darkStone
      );
    }
    
    // Add windows to main castle walls
    const windowRows = 2;
    const windowsPerRow = 5;
    const windowSpacing = castleWidth / (windowsPerRow + 1);
    
    for (let row = 0; row < windowRows; row++) {
      for (let i = 0; i < windowsPerRow; i++) {
        // Skip windows where the gatehouse is
        if (row === 1 && i === 2) {
          continue;
        }
        
        // Gothic style window
        const winX = castleX + (i + 1) * windowSpacing - 8;
        const winY = castleY + 30 + row * 50;
        
        // Window frame
        this.renderer.fillRect(
          winX - 2,
          winY - 2,
          16,
          22,
          darkStone
        );
        
        // Window light
        this.renderer.fillRect(
          winX,
          winY,
          12,
          18,
          windowGlow
        );
        
        // Window arch
        this.renderer.fillRect(
          winX,
          winY - 4,
          12,
          4,
          darkStone
        );
      }
    }
    
    // Add flags on towers
    const flagPositions = [
      { x: towerPositions[0].x + 20, y: towerPositions[0].y - 32 },
      { x: towerPositions[1].x + 20, y: towerPositions[1].y - 32 },
      { x: keepX + 40, y: keepY - 40 }
    ];
    
    flagPositions.forEach(pos => {
      // Flagpole
      this.renderer.fillRect(
        pos.x,
        pos.y,
        2,
        30,
        'rgba(100, 100, 100, 0.8)'
      );
      
      // Flag (waving with animation)
      const waveOffset = Math.sin(this.stateTime * 3) * 2;
      this.renderer.fillRect(
        pos.x + 2,
        pos.y + waveOffset,
        15,
        10,
        'rgba(150, 0, 0, 0.7)'
      );
    });
    
    // Add moat around castle
    this.renderer.fillRect(
      castleX - 40,
      castleY + castleHeight + 5,
      castleWidth + 80,
      15,
      'rgba(0, 0, 40, 0.3)'
    );
    
    // Moonlight reflection on moat
    this.renderer.fillRect(
      castleX + castleWidth / 2 - 30,
      castleY + castleHeight + 5,
      60,
      15,
      'rgba(200, 200, 255, 0.1)'
    );
  }
  
  /**
   * Draw enhanced logo with neon effect
   */
  private drawEnhancedLogo(x: number, y: number, scale: number = 1): void {
    // Logo colors
    const mainColor = '#FF0033'; // Brighter red
    const glowColor = 'rgba(255, 0, 51, 0.7)'; // Brighter glow
    const outlineColor = '#550000'; // Dark red outline
    const highlightColor = '#FF3366'; // Bright pink highlight
    
    // Logo dimensions
    const logoWidth = 480 * scale;
    const logoHeight = 180 * scale;
    
    // Draw multiple glow layers
    for (let i = 0; i < 3; i++) {
      const glowSize = (3 - i) * 4;
      const glowAlpha = 0.3 - (i * 0.1);
      
      this.renderer.drawText("VALAXY", {
        x: x,
        y: y,
        color: `rgba(255, 0, 51, ${glowAlpha})`,
        fontSize: (96 + glowSize) * scale,
        fontFamily: 'Press Start 2P, monospace',
        align: 'center',
        pixelated: true,
        alpha: glowAlpha
      });
    }
    
    // Draw logo shadow
    this.renderer.drawText("VALAXY", {
      x: x + 4 * scale,
      y: y + 4 * scale,
      color: 'rgba(0, 0, 0, 0.5)',
      fontSize: 96 * scale,
      fontFamily: 'Press Start 2P, monospace',
      align: 'center',
      pixelated: true
    });
    
    // "VALAXY" text (pixelated style)
    this.renderer.drawText("VALAXY", {
      x: x,
      y: y,
      color: mainColor,
      fontSize: 96 * scale,
      fontFamily: 'Press Start 2P, monospace',
      align: 'center',
      pixelated: true
    });
    
    // Add highlight to the logo text
    this.renderer.drawText("VALAXY", {
      x: x - 2 * scale,
      y: y - 2 * scale,
      color: highlightColor,
      fontSize: 96 * scale,
      fontFamily: 'Press Start 2P, monospace',
      align: 'center',
      pixelated: true,
      alpha: 0.2
    });
    
    // Removed fangs and blood drips as requested
  }
  
  /**
   * Render the main game screen
   */
  private renderGame(): void {
    // Draw enemies
    this.formationManager.draw(this.renderer);
    
    // Draw power-ups
    this.powerUpManager.draw(this.renderer);
    
    // Draw player
    this.player.draw(this.renderer);
    
    // Draw score and lives
    this.renderHUD();
    
    // Draw countdown if in GAME_START state
    if (this.state === GameState.GAME_START) {
      this.renderCountdown();
    }
  }
  
  /**
   * Render countdown before wave starts
   */
  private renderCountdown(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Calculate countdown number (3, 2, 1)
    const countdown = Math.ceil(3 - this.stateTime);
    
    if (countdown > 0) {
      // Semi-transparent background
      this.renderer.fillRect(
        centerX - 100,
        centerY - 100,
        200,
        200,
        'rgba(0, 0, 0, 0.7)'
      );
      
      // Draw border
      this.renderer.strokeRect(
        centerX - 100,
        centerY - 100,
        200,
        200,
        '#FF0000',
        3
      );
      
      // Draw "WAVE" text
      this.renderer.drawText(`WAVE ${this.level}`, {
        x: centerX,
        y: centerY - 40,
        color: '#FFFFFF',
        fontSize: 36,
        align: 'center',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
      
      // Draw countdown number with pulsing effect
      const pulseScale = 1 + Math.sin(this.stateTime * 10) * 0.2;
      const fontSize = Math.floor(72 * pulseScale);
      
      this.renderer.drawText(countdown.toString(), {
        x: centerX,
        y: centerY + 20,
        color: '#FF0000',
        fontSize: fontSize,
        align: 'center',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
      
      // Draw "GET READY" text
      this.renderer.drawText("GET READY", {
        x: centerX,
        y: centerY + 80,
        color: '#FFFF00',
        fontSize: 24,
        align: 'center',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true,
        alpha: Math.sin(this.stateTime * 5) * 0.5 + 0.5 // Blinking effect
      });
    }
  }
  
  /**
   * Render the heads-up display (score, lives, etc.)
   */
  private renderHUD(): void {
    // Score
    this.renderer.drawText(`SCORE ${this.player.getScore().toString().padStart(6, '0')}`, {
      x: 40,
      y: 40,
      color: '#FF0000',
      fontSize: 32,
      align: 'left',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Lives (moved to top left, next to score)
    this.renderer.drawText(`LIVES ${this.player.getLives()}`, {
      x: 40,
      y: 80,
      color: '#FF0000',
      fontSize: 24,
      align: 'left',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Draw small life icons
    for (let i = 0; i < this.player.getLives(); i++) {
      // Smaller player ship icon for each life
      const shipX = 150 + i * 25;
      const shipY = 75;
      
      // Ship body (crossbow shape)
      this.renderer.fillRect(shipX + 5, shipY, 10, 15, '#EEEEEE');
      this.renderer.fillRect(shipX, shipY + 5, 20, 5, '#EEEEEE');
      
      // Ship details
      this.renderer.fillRect(shipX + 9, shipY, 2, 20, '#990000');
      this.renderer.fillRect(shipX + 1, shipY + 6, 18, 2, '#990000');
    }
    
    // High score
    const highestScore = this.highScores.length > 0 ? this.highScores[0].score : 30000;
    this.renderer.drawText(`HI-SCORE ${highestScore.toString().padStart(6, '0')}`, {
      x: this.width / 2,
      y: 40,
      color: '#FF0000',
      fontSize: 32,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Wave
    this.renderer.drawText(`WAVE ${this.level}`, {
      x: this.width - 40,
      y: 40,
      color: '#FF0000',
      fontSize: 32,
      align: 'right',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Active powerup timers
    const hasShield = this.player.hasShield();
    const hasWeaponUpgrade = this.player.hasWeaponUpgrade();
    
    if (hasShield || hasWeaponUpgrade) {
      // Draw powerup legend box
      const legendX = this.width - 180;
      const legendY = 80;
      const legendWidth = 160;
      const legendHeight = hasShield && hasWeaponUpgrade ? 75 : 55;
      
      // Background
      this.renderer.fillRect(
        legendX,
        legendY,
        legendWidth,
        legendHeight,
        'rgba(0, 0, 0, 0.7)'
      );
      
      // Border
      this.renderer.strokeRect(
        legendX,
        legendY,
        legendWidth,
        legendHeight,
        '#FF0000',
        1
      );
      
      // Title
      this.renderer.drawText("POWERUPS", {
        x: legendX + 80,
        y: legendY + 15,
        color: '#FFFFFF',
        fontSize: 16,
        align: 'center',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
      
      // Shield timer
      if (hasShield) {
        const shieldTime = Math.ceil(this.player.getShieldTime());
        this.renderer.drawText(`SHIELD: ${shieldTime}s`, {
          x: legendX + 80,
          y: legendY + 35,
          color: '#00AAFF',
          fontSize: 12, // Smaller font size
          align: 'center',
          fontFamily: 'Press Start 2P, monospace',
          pixelated: true
        });
      }
      
      // Weapon upgrade timer
      if (hasWeaponUpgrade) {
        const upgradeTime = Math.ceil(this.player.getWeaponUpgradeTime());
        const yPos = hasShield ? legendY + 55 : legendY + 35;
        this.renderer.drawText(`WEAPON: ${upgradeTime}s`, {
          x: legendX + 80,
          y: yPos,
          color: '#FFCC00',
          fontSize: 12, // Smaller font size
          align: 'center',
          fontFamily: 'Press Start 2P, monospace',
          pixelated: true
        });
      }
    }
  }
  
  /**
   * Render the game over overlay
   */
  private renderGameOver(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Semi-transparent background
    this.renderer.fillRect(0, centerY - 120, this.width, 240, 'rgba(0, 0, 0, 0.8)');
    
    // Game over text
    this.renderer.drawText("GAME OVER", {
      x: centerX,
      y: centerY - 60,
      color: '#FF0000',
      fontSize: 72,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Final score
    this.renderer.drawText(`SCORE: ${this.player.getScore()}`, {
      x: centerX,
      y: centerY + 40,
      color: '#FFFFFF',
      fontSize: 48,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
  }
  
  /**
   * Render the high score entry screen
   */
  private renderHighScore(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Background
    this.renderer.fillRect(0, 0, this.width, this.height, 'rgba(0, 0, 0, 0.8)');
    
    // Title
    this.renderer.drawText("NEW HIGH SCORE!", {
      x: centerX,
      y: centerY - 120,
      color: '#FFAA00',
      fontSize: 48,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Score
    this.renderer.drawText(`SCORE: ${this.player.getScore()}`, {
      x: centerX,
      y: centerY - 60,
      color: '#FFFFFF',
      fontSize: 36,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Name entry instructions
    this.renderer.drawText("ENTER YOUR NAME", {
      x: centerX,
      y: centerY,
      color: '#FF0000',
      fontSize: 32,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Display current name being entered
    const displayName = this.playerName.padEnd(this.MAX_NAME_LENGTH, '_');
    
    // Draw each character of the name with the current position highlighted
    const charWidth = 50;
    const startX = centerX - ((this.MAX_NAME_LENGTH * charWidth) / 2) + (charWidth / 2);
    
    for (let i = 0; i < this.MAX_NAME_LENGTH; i++) {
      const charX = startX + (i * charWidth);
      const isCurrentPos = i === this.nameEntryPosition;
      const charColor = isCurrentPos ? '#FFFF00' : '#FFFFFF';
      const charSize = isCurrentPos ? 48 : 40;
      
      // Add blinking effect to current position
      const alpha = isCurrentPos ?
        0.5 + (0.5 * Math.sin(this.stateTime * 10)) : 1;
      
      this.renderer.drawText(displayName[i], {
        x: charX,
        y: centerY + 60,
        color: charColor,
        fontSize: charSize,
        align: 'center',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true,
        alpha
      });
    }
    
    // Instructions - multiple lines for better readability
    this.renderer.drawText("TYPE A-Z, 0-9: DIRECT INPUT", {
      x: centerX,
      y: centerY + 120,
      color: '#AAAAAA',
      fontSize: 20,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    this.renderer.drawText("UP/DOWN: CHANGE LETTER", {
      x: centerX,
      y: centerY + 145,
      color: '#AAAAAA',
      fontSize: 20,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    this.renderer.drawText("BACKSPACE: DELETE LETTER", {
      x: centerX,
      y: centerY + 170,
      color: '#AAAAAA',
      fontSize: 20,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Make the confirm instruction more visible with blinking effect
    const confirmAlpha = (Math.sin(this.stateTime * 5) + 1) / 2;
    this.renderer.drawText("PRESS SPACE TO CONFIRM", {
      x: centerX,
      y: centerY + 200,
      color: '#FFFFFF',
      fontSize: 24,
      align: 'center',
      alpha: confirmAlpha,
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
  }
  
  /**
   * Draw the Valaxy logo
   */
  private drawLogo(x: number, y: number, scale: number = 1): void {
    // Logo colors
    const mainColor = '#990000'; // Blood red
    const glowColor = 'rgba(153, 0, 0, 0.6)'; // Blood red glow
    const outlineColor = '#550000'; // Dark red outline
    const highlightColor = '#FF3333'; // Bright red highlight
    
    // Logo dimensions
    const logoWidth = 480 * scale; // Scaled size
    const logoHeight = 180 * scale; // Scaled size
    
    // No glow effect as requested
    
    // Draw logo shadow
    this.renderer.drawText("VALAXY", {
      x: x + 4 * scale,
      y: y + 4 * scale,
      color: 'rgba(0, 0, 0, 0.5)',
      fontSize: 96 * scale, // Scaled font size
      fontFamily: 'Press Start 2P, monospace',
      align: 'center',
      pixelated: true
    });
    
    // "VALAXY" text (pixelated style)
    this.renderer.drawText("VALAXY", {
      x: x,
      y: y,
      color: mainColor,
      fontSize: 96 * scale, // Scaled font size
      fontFamily: 'Press Start 2P, monospace',
      align: 'center',
      pixelated: true
    });
    
    // Add highlight to the logo text
    this.renderer.drawText("VALAXY", {
      x: x - 2 * scale,
      y: y - 2 * scale,
      color: highlightColor,
      fontSize: 96 * scale,
      fontFamily: 'Press Start 2P, monospace',
      align: 'center',
      pixelated: true,
      alpha: 0.1
    });
    
    // Removed fangs and blood drips as requested
  }
  
  /**
   * Create starfield
   */
  private createStars(count: number): void {
    // Reduce star count for better performance
    const reducedCount = Math.min(count, 40);
    this.stars = [];
    for (let i = 0; i < reducedCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 20 + 5, // Reduced speed variation for smoother movement
        color: this.getRandomStarColor()
      });
    }
  }
  
  /**
   * Get a random star color
   */
  private getRandomStarColor(): string {
    const colors = [
      '#FFFFFF', // White
      '#CCCCFF', // Light blue
      '#FFCCCC', // Light red
      '#FFFFCC', // Light yellow
      '#DDDDDD'  // Light grey
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  /**
   * Update stars
   */
  private updateStars(deltaTime: number): void {
    for (const star of this.stars) {
      star.y += star.speed * deltaTime;
      
      // Wrap around when off screen
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }
  }
  
  /**
   * Draw stars
   */
  private drawStars(): void {
    for (const star of this.stars) {
      this.renderer.fillCircle(star.x, star.y, star.size, star.color);
    }
  }
  
  /**
   * Start a new game
   */
  private startGame(): void {
    this.score = 0;
    this.level = 1;
    this.player = new Player(this.soundEngine, this.width, this.height);
    this.formationManager = new FormationManager(this.soundEngine, this.width, this.height);
    this.formationManager.createWave();
    this.powerUpManager.clearPowerUps(); // Clear any existing power-ups
    this.state = GameState.GAME_START;
    this.stateTime = 0;
    this.gameStarted = true;
  }
  
  /**
   * Check if current score is a high score
   */
  private isHighScore(): boolean {
    // Get the player's score
    const playerScore = this.player.getScore();
    
    // Always log the score for debugging
    console.log('Checking high score:', playerScore, 'Current high scores:', this.highScores);
    
    // If we have fewer than 5 scores, any score qualifies
    if (this.highScores.length < 5) {
      console.log('Less than 5 high scores, qualifying automatically');
      return true;
    }
    
    // Otherwise, check if the current score is higher than the lowest high score
    const sortedScores = [...this.highScores].sort((a, b) => b.score - a.score);
    const lowestHighScore = sortedScores[Math.min(4, sortedScores.length - 1)].score;
    const isHighScore = playerScore > lowestHighScore;
    
    console.log('Lowest high score:', lowestHighScore, 'Is high score:', isHighScore);
    return isHighScore;
  }
  
  /**
   * Add current score to high scores
   */
  private addHighScore(): void {
    try {
      // Create the new score object
      const newScore: HighScore = {
        name: this.playerName || 'AAA', // Default to AAA if no name entered
        score: this.player.getScore(),
        date: new Date().toISOString(),
        wave: this.level
      };
      
      console.log('Adding new high score:', newScore);
      
      // Check if this exact score already exists
      const isDuplicate = this.highScores.some(score =>
        score.name === newScore.name &&
        score.score === newScore.score
      );
      
      if (!isDuplicate) {
        // Add to current high scores
        this.highScores.push(newScore);
        
        // Sort by score (highest first)
        this.highScores.sort((a, b) => b.score - a.score);
        
        // Remove duplicates (same name and score)
        this.highScores = this.removeDuplicateScores(this.highScores);
        
        // Save to API
        this.saveHighScores().catch(err => {
          console.error('Failed to save high score to API:', err);
        });
      } else {
        console.log('Skipping duplicate score:', newScore);
        
        // Still ensure we have the correct format
        this.highScores = this.removeDuplicateScores(this.highScores);
      }
    } catch (error) {
      console.error('Error adding high score:', error);
      // Ensure we have at least default high scores
      if (this.highScores.length === 0) {
        this.setDefaultHighScores();
      }
    }
  }
  
  /**
   * Load high scores from API
   */
  private async loadHighScores(): Promise<void> {
    try {
      console.log('Loading high scores from API...');
      const response = await fetch('/api/highscores');
      
      if (response.ok) {
        const apiScores = await response.json();
        console.log('Successfully loaded high scores from API:', apiScores);
        
        // Ensure we have valid scores
        if (Array.isArray(apiScores) && apiScores.length > 0) {
          this.highScores = apiScores;
          
          // Make sure we have exactly 5 scores
          this.highScores = this.removeDuplicateScores(this.highScores);
          console.log('Processed high scores:', this.highScores);
        } else {
          console.warn('API returned empty or invalid scores, using defaults');
          this.setDefaultHighScores();
        }
      } else {
        console.error('Failed to load high scores from API:', response.status, response.statusText);
        this.setDefaultHighScores();
      }
    } catch (error) {
      console.error('Error loading high scores:', error);
      this.setDefaultHighScores();
    }
  }
  
  /**
   * Set default high scores
   */
  private setDefaultHighScores(): void {
    this.highScores = [
      { name: 'HAX', score: 94900, date: new Date().toISOString(), wave: 14 },
      { name: 'AAA', score: 63950, date: new Date().toISOString(), wave: 10 },
      { name: 'HAX', score: 63950, date: new Date().toISOString(), wave: 10 },
      { name: '---', score: 0, date: new Date().toISOString(), wave: 0 },
      { name: '---', score: 0, date: new Date().toISOString(), wave: 0 }
    ];
  }
  
  /**
   * Save high scores to API
   */
  private async saveHighScores(): Promise<void> {
    try {
      // First remove any placeholder scores (name "---" or score 0)
      const validScores = this.highScores.filter(score =>
        score.name !== '---' && score.score > 0
      );
      
      // Only send the most recent score to prevent duplicates
      const newScore = {
        name: this.playerName || 'AAA',
        score: this.player.getScore(),
        date: new Date().toISOString(),
        wave: this.level
      };
      
      console.log('Saving new high score to API:', newScore);
      
      const response = await fetch('/api/highscores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newScore)
      });
      
      if (response.ok) {
        // Update high scores with the sorted list from the server
        const serverScores = await response.json();
        
        if (Array.isArray(serverScores) && serverScores.length > 0) {
          this.highScores = serverScores;
          console.log('High scores saved successfully:', this.highScores);
        } else {
          console.warn('API returned empty scores after save, keeping current scores');
        }
      } else {
        console.error('Failed to save high scores to API:', await response.text());
      }
    } catch (error) {
      console.error('Error saving high scores to API:', error);
    }
  }
  
  /**
   * Remove duplicate scores from an array of high scores
   * Uses a more comprehensive approach to identify duplicates
   */
  private removeDuplicateScores(scores: HighScore[]): HighScore[] {
    const uniqueScores: HighScore[] = [];
    const seen = new Set<string>();
    
    // First sort by score (highest first) and date (newest first)
    // This ensures we keep the highest score if there are duplicates
    const sortedScores = [...scores].sort((a, b) => {
      // First compare by score (highest first)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // If scores are equal, compare by date (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    for (const score of sortedScores) {
      // Skip placeholder scores (with name "---" or score 0)
      if (score.name === '---' || score.score === 0) {
        continue;
      }
      
      // Create a unique key for this score based on name and score
      // This considers the same name and score as a duplicate, keeping only the highest wave
      const key = `${score.name}-${score.score}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueScores.push(score);
      } else {
        // If we've seen this name-score combination before, check if this one has a higher wave
        const existingIndex = uniqueScores.findIndex(s =>
          s.name === score.name && s.score === score.score
        );
        
        if (existingIndex >= 0 && score.wave > uniqueScores[existingIndex].wave) {
          // Replace with the higher wave version
          uniqueScores[existingIndex] = score;
        }
      }
    }
    
    // Re-sort by score before returning
    const result = uniqueScores.sort((a, b) => b.score - a.score);
    
    // Ensure we have exactly 5 entries
    while (result.length < 5) {
      result.push({ name: '---', score: 0, date: new Date().toISOString(), wave: 0 });
    }
    
    return result.slice(0, 5);
  }
  
  // Local storage methods removed - using Supabase directly
  
  /**
   * Update renderer dimensions to match the current display
   * This helps with responsive sizing on different devices
   */
  public updateRendererDimensions(width: number, height: number, aspectRatio: number): void {
    // Update the renderer with the new dimensions
    // This ensures the game visuals scale properly with the canvas size
    if (this.renderer) {
      this.renderer.updateDimensions(width, height, aspectRatio);
    }
  }

  /**
   * Get the input handler
   */
  public getInputHandler(): InputHandler {
    return this.inputHandler;
  }

  /**
   * Toggle sound on/off
   * @returns The new mute state (true if muted, false if unmuted)
   */
  public async toggleSound(): Promise<boolean> {
    return await this.soundEngine.toggleMute();
  }

  /**
   * Get current sound mute state
   * @returns True if sound is muted, false otherwise
   */
  public isSoundMuted(): boolean {
    return this.soundEngine.getMuteState();
  }
  
  /**
   * Set the sound volume
   * @param volumeDb Volume in decibels (range: -60 to 0)
   */
  public setVolume(volumeDb: number): void {
    this.soundEngine.setVolume(volumeDb);
  }
  
  /**
   * Get the current sound volume
   * @returns Volume in decibels
   */
  public getVolume(): number {
    return this.soundEngine.getVolume();
  }
  
  /**
   * Toggle sound effects on/off
   * @returns The new sound effects state (true if enabled, false if disabled)
   */
  public toggleSoundEffects(): boolean {
    const newState = !this.soundEngine.areSoundEffectsEnabled();
    this.soundEngine.setSoundEffectsEnabled(newState);
    return newState;
  }
  
  /**
   * Check if sound effects are enabled
   * @returns True if sound effects are enabled, false otherwise
   */
  public areSoundEffectsEnabled(): boolean {
    return this.soundEngine.areSoundEffectsEnabled();
  }

  /**
   * Clean up game resources
   */
  public dispose(): void {
    this.gameLoop.stop();
    this.inputHandler.cleanup();
    this.soundEngine.dispose();
    window.removeEventListener('resize', this.handleResize);
  }
}

// Star interface for background effect
interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
}