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
    
    // Play coin insert sound to simulate arcade start
    this.soundEngine.playSound(SoundEffect.COIN_INSERT);
    
    // Start the boot sequence
    this.state = GameState.BOOT;
    
    // Start the game loop
    this.gameLoop.start();
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
    
    // Transition to playing after intro animation
    if (this.stateTime >= 2) {
      this.state = GameState.PLAYING;
      this.stateTime = 0;
      
      // Start background music
      this.soundEngine.startMusic();
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
      
      // Special handling for garlic area attack
      if (powerUpType === PowerUpType.GARLIC) {
        this.activateGarlicAreaAttack();
      }
      
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
  
  /**
   * Activate garlic area attack (damages all on-screen enemies)
   */
  private activateGarlicAreaAttack(): void {
    const enemies = this.formationManager.getEnemies();
    let hitCount = 0;
    
    // Damage all enemies on screen
    for (const enemy of enemies) {
      if (enemy.hit()) {
        // Enemy was destroyed
        const points = enemy.getPoints();
        this.score += points;
        this.player.addScore(points);
        hitCount++;
      }
    }
    
    // Visual effect for area attack
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Create expanding circle effect
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        if (this.state !== GameState.PLAYING) return;
        
        const radius = i * 20;
        this.renderer.fillCircle(
          centerX,
          centerY,
          radius,
          `rgba(255, 255, 255, ${0.5 - i * 0.025})`
        );
      }, i * 50);
    }
  }
  
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
      if (this.isHighScore()) {
        this.state = GameState.HIGH_SCORE;
      } else {
        this.state = GameState.TITLE;
      }
      this.stateTime = 0;
    }
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
  
  /**
   * Update high score entry state
   */
  private updateHighScore(deltaTime: number, inputState: InputState): void {
    this.stateTime += deltaTime;
    
    // Update debounce timers
    if (this.nameEntryDebounce > 0) {
      this.nameEntryDebounce -= deltaTime;
    }
    
    if (this.confirmDebounce > 0) {
      this.confirmDebounce -= deltaTime;
    }
    
    // Handle name entry
    if (this.nameEntryPosition < this.MAX_NAME_LENGTH) {
      // Move selection up/down through characters with debounce
      if (inputState.up === KeyState.PRESSED || (inputState.up === KeyState.HELD && this.nameEntryDebounce <= 0)) {
        const currentChar = this.playerName.charAt(this.nameEntryPosition) || 'A';
        const currentIndex = this.ALLOWED_CHARS.indexOf(currentChar);
        const newIndex = (currentIndex + 1) % this.ALLOWED_CHARS.length;
        this.playerName = this.playerName.substring(0, this.nameEntryPosition) +
                          this.ALLOWED_CHARS.charAt(newIndex) +
                          this.playerName.substring(this.nameEntryPosition + 1);
        this.soundEngine.playSound(SoundEffect.MENU_NAVIGATE);
        // Reset state time to prevent auto-advancing
        this.stateTime = 0;
        // Set debounce timer
        this.nameEntryDebounce = this.DEBOUNCE_TIME;
      }
      
      if (inputState.down === KeyState.PRESSED || (inputState.down === KeyState.HELD && this.nameEntryDebounce <= 0)) {
        const currentChar = this.playerName.charAt(this.nameEntryPosition) || 'A';
        const currentIndex = this.ALLOWED_CHARS.indexOf(currentChar);
        const newIndex = (currentIndex - 1 + this.ALLOWED_CHARS.length) % this.ALLOWED_CHARS.length;
        this.playerName = this.playerName.substring(0, this.nameEntryPosition) +
                          this.ALLOWED_CHARS.charAt(newIndex) +
                          this.playerName.substring(this.nameEntryPosition + 1);
        this.soundEngine.playSound(SoundEffect.MENU_NAVIGATE);
        // Reset state time to prevent auto-advancing
        this.stateTime = 0;
        // Set debounce timer
        this.nameEntryDebounce = this.DEBOUNCE_TIME;
      }
      
      // Confirm character and move to next position - with strong debounce
      // Add space key (fire) explicitly to make sure it works
      const confirmPressed =
          inputState.fire === KeyState.PRESSED ||
          inputState.start === KeyState.PRESSED ||
          inputState.left === KeyState.PRESSED ||
          inputState.right === KeyState.PRESSED;
          
      // Special check for space key since it's important for confirmation
      if (this.inputHandler.isSpacePressed() && this.confirmDebounce <= 0) {
        // If no character is selected, default to 'A'
        if (this.nameEntryPosition >= this.playerName.length) {
          this.playerName += 'A';
        }
        
        this.nameEntryPosition++;
        this.soundEngine.playSound(SoundEffect.MENU_SELECT);
        // Reset state time to prevent auto-advancing
        this.stateTime = 0;
        // Set confirm debounce timer to prevent multiple confirmations
        this.confirmDebounce = this.CONFIRM_DEBOUNCE_TIME;
        return; // Skip the regular check below
      }
          
      if (confirmPressed && this.confirmDebounce <= 0) {
        // If no character is selected, default to 'A'
        if (this.nameEntryPosition >= this.playerName.length) {
          this.playerName += 'A';
        }
        
        this.nameEntryPosition++;
        this.soundEngine.playSound(SoundEffect.MENU_SELECT);
        // Reset state time to prevent auto-advancing
        this.stateTime = 0;
        // Set confirm debounce timer to prevent multiple confirmations
        this.confirmDebounce = this.CONFIRM_DEBOUNCE_TIME;
      }
    } else {
      // Name entry complete, add high score after a short delay
      if (this.stateTime >= 1) {
        this.addHighScore();
        
        // Reload high scores before returning to title screen
        this.loadHighScores().then(() => {
          console.log('High scores reloaded for title screen:', this.highScores);
        }).catch(err => {
          console.error('Failed to reload high scores:', err);
        });
        
        this.state = GameState.TITLE;
        this.stateTime = 0;
        this.playerName = '';
        this.nameEntryPosition = 0;
        this.nameEntryDebounce = 0;
        this.confirmDebounce = 0;
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
    
    // Render based on game state
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
    
    // Draw mystical blood-red mist effect
    for (let i = 0; i < 30; i++) {
      const fogX = Math.sin(this.stateTime * 0.3 + i * 0.2) * (this.width * 0.4) + centerX;
      const fogY = Math.cos(this.stateTime * 0.2 + i * 0.3) * (this.height * 0.3) + centerY;
      const fogSize = 70 + Math.sin(this.stateTime * 0.5 + i) * 30;
      const fogAlpha = 0.03 + Math.sin(this.stateTime * 0.2 + i * 0.1) * 0.02;
      
      this.renderer.fillCircle(
        fogX,
        fogY,
        fogSize,
        `rgba(100, 0, 0, ${fogAlpha})`
      );
    }
    
    // Draw a large ornate blood vial in the center
    const vialWidth = 140;
    const vialHeight = 280;
    const vialX = centerX - vialWidth / 2;
    const vialY = centerY - vialHeight / 2 + 20; // Slightly lower
    
    // Draw an altar/pedestal for the vial
    const altarWidth = vialWidth * 2;
    const altarHeight = 50;
    const altarX = centerX - altarWidth / 2;
    const altarY = vialY + vialHeight - 20;
    
    // Altar base
    this.renderer.fillRect(
      altarX,
      altarY,
      altarWidth,
      altarHeight,
      'rgba(40, 10, 10, 0.7)'
    );
    
    // Altar details
    for (let i = 0; i < 7; i++) {
      this.renderer.fillRect(
        altarX + 10 + i * (altarWidth - 20) / 6,
        altarY - 5,
        10,
        5,
        'rgba(60, 20, 20, 0.7)'
      );
    }
    
    // Draw candles on the altar
    const candlePositions = [
      { x: altarX + 30, y: altarY - 15 },
      { x: altarX + altarWidth - 30, y: altarY - 15 }
    ];
    
    candlePositions.forEach(pos => {
      // Candle body
      this.renderer.fillRect(
        pos.x - 5,
        pos.y - 20,
        10,
        20,
        'rgba(150, 150, 150, 0.7)'
      );
      
      // Candle flame
      const flameHeight = 15 + Math.sin(this.stateTime * 5) * 3;
      this.renderer.fillRect(
        pos.x - 1,
        pos.y - 20 - flameHeight,
        2,
        flameHeight,
        'rgba(255, 200, 100, 0.8)'
      );
      
      // Flame glow
      this.renderer.fillCircle(
        pos.x,
        pos.y - 20 - flameHeight / 2,
        flameHeight / 2 + 5,
        'rgba(255, 150, 50, 0.2)'
      );
    });
    
    // Vial neck (top narrow part)
    const neckWidth = 40;
    const neckHeight = 50;
    const neckX = vialX + (vialWidth - neckWidth) / 2;
    
    // Draw ornate symbols around the vial
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this.stateTime * 0.2;
      const radius = 180;
      const symbolX = centerX + Math.cos(angle) * radius;
      const symbolY = centerY + Math.sin(angle) * radius;
      
      // Draw mystical symbol
      this.renderer.fillCircle(
        symbolX,
        symbolY,
        5,
        'rgba(150, 0, 0, 0.3)'
      );
      
      // Connect symbols with lines
      const nextAngle = ((i + 1) / 8) * Math.PI * 2 + this.stateTime * 0.2;
      const nextX = centerX + Math.cos(nextAngle) * radius;
      const nextY = centerY + Math.sin(nextAngle) * radius;
      
      this.renderer.strokeLine(
        symbolX,
        symbolY,
        nextX,
        nextY,
        'rgba(100, 0, 0, 0.2)',
        1
      );
      
      // Connect to center
      this.renderer.strokeLine(
        symbolX,
        symbolY,
        centerX,
        centerY,
        'rgba(100, 0, 0, 0.1)',
        1
      );
    }
    
    // Vial body (main container) with curved shape
    // Left side curve
    for (let i = 0; i < 10; i++) {
      const curveWidth = Math.sin(i / 10 * Math.PI) * 15;
      this.renderer.fillRect(
        vialX - curveWidth,
        vialY + neckHeight + i * (vialHeight - neckHeight) / 10,
        curveWidth,
        (vialHeight - neckHeight) / 10,
        'rgba(40, 40, 60, 0.3)'
      );
    }
    
    // Right side curve
    for (let i = 0; i < 10; i++) {
      const curveWidth = Math.sin(i / 10 * Math.PI) * 15;
      this.renderer.fillRect(
        vialX + vialWidth,
        vialY + neckHeight + i * (vialHeight - neckHeight) / 10,
        curveWidth,
        (vialHeight - neckHeight) / 10,
        'rgba(40, 40, 60, 0.3)'
      );
    }
    
    // Main vial body
    this.renderer.fillRect(
      vialX,
      vialY + neckHeight,
      vialWidth,
      vialHeight - neckHeight,
      'rgba(40, 40, 60, 0.3)'
    );
    
    // Vial neck
    this.renderer.fillRect(
      neckX,
      vialY,
      neckWidth,
      neckHeight,
      'rgba(40, 40, 60, 0.3)'
    );
    
    // Ornate vial cap
    this.renderer.fillRect(
      neckX - 15,
      vialY - 20,
      neckWidth + 30,
      20,
      'rgba(80, 40, 40, 0.8)'
    );
    
    // Cap details
    for (let i = 0; i < 5; i++) {
      this.renderer.fillRect(
        neckX - 10 + i * 15,
        vialY - 25,
        10,
        5,
        'rgba(120, 60, 60, 0.8)'
      );
    }
    
    // Glass highlights
    this.renderer.fillRect(
      vialX + 15,
      vialY + neckHeight + 10,
      3,
      vialHeight - neckHeight - 20,
      'rgba(200, 200, 255, 0.3)'
    );
    
    this.renderer.fillRect(
      vialX + vialWidth - 18,
      vialY + neckHeight + 10,
      3,
      vialHeight - neckHeight - 20,
      'rgba(200, 200, 255, 0.3)'
    );
    
    // Calculate blood fill level based on boot progress
    const maxFillHeight = vialHeight - neckHeight - 10;
    const currentFillHeight = maxFillHeight * this.bootProgress;
    const bloodY = vialY + vialHeight - currentFillHeight;
    
    // Blood fill animation
    const bloodColor = '#990000';
    const bloodHighlight = '#FF0000';
    const bloodShadow = '#550000';
    
    // Blood shadow/depth effect
    this.renderer.fillRect(
      vialX + 10,
      bloodY,
      vialWidth - 20,
      currentFillHeight,
      bloodShadow
    );
    
    // Main blood body
    this.renderer.fillRect(
      vialX + 15,
      bloodY,
      vialWidth - 30,
      currentFillHeight,
      bloodColor
    );
    
    // Blood wave at top with better containment
    if (currentFillHeight > 0) {
      // Ensure waves stay within vial boundaries
      const safeWidth = vialWidth - 40; // Narrower than the vial to prevent overflow
      const waveStartX = vialX + 20;
      
      for (let i = 0; i < safeWidth; i++) {
        const waveY = Math.sin((this.stateTime * 3) + (i * 0.2)) * 3;
        
        // Only draw if within vial
        if (bloodY + waveY > vialY + neckHeight && bloodY + waveY < vialY + vialHeight - 10) {
          this.renderer.fillRect(
            waveStartX + i,
            bloodY + waveY,
            1,
            4,
            bloodHighlight
          );
        }
      }
    }
    
    // Blood bubbles animation with proper containment
    if (currentFillHeight > 20) {
      const bubbleCount = Math.min(8, Math.floor(currentFillHeight / 30));
      const safeWidth = vialWidth - 50; // Even narrower for bubbles
      
      for (let i = 0; i < bubbleCount; i++) {
        const bubbleSize = 1.5 + Math.random() * 2;
        // Constrain bubble X position to stay safely within vial
        const bubbleX = vialX + 25 + (Math.sin(this.stateTime * 0.8 + i * 2) * 0.5 + 0.5) * safeWidth;
        
        // Bubble rises based on time and its index
        const bubbleRise = ((this.stateTime * 15) + (i * 40)) % (currentFillHeight - 10);
        const bubbleY = bloodY + currentFillHeight - bubbleRise - 10;
        
        // Only draw if bubble is within the blood and vial
        if (bubbleY > bloodY && bubbleY < vialY + vialHeight - 15) {
          this.renderer.fillCircle(
            bubbleX,
            bubbleY,
            bubbleSize,
            'rgba(255, 50, 50, 0.7)'
          );
        }
      }
    }
    
    // Blood glow effect
    if (currentFillHeight > 0) {
      const glowRadius = 50 + Math.sin(this.stateTime * 2) * 10;
      this.renderer.fillCircle(
        centerX,
        bloodY + currentFillHeight / 2,
        glowRadius,
        'rgba(255, 0, 0, 0.05)'
      );
    }
    
    // Vial glass border
    this.renderer.strokeRect(
      vialX,
      vialY + neckHeight,
      vialWidth,
      vialHeight - neckHeight,
      'rgba(255, 255, 255, 0.4)',
      2
    );
    
    // Neck glass border
    this.renderer.strokeRect(
      neckX,
      vialY,
      neckWidth,
      neckHeight,
      'rgba(255, 255, 255, 0.4)',
      2
    );
    
    // Ornate measurement lines with symbols
    for (let i = 1; i <= 5; i++) {
      const lineY = vialY + neckHeight + (vialHeight - neckHeight) * (i / 6);
      
      // Left measurement line with decorative end
      this.renderer.fillRect(
        vialX - 15,
        lineY,
        15,
        1,
        'rgba(255, 255, 255, 0.5)'
      );
      
      this.renderer.fillCircle(
        vialX - 18,
        lineY,
        3,
        'rgba(255, 100, 100, 0.5)'
      );
      
      // Right measurement line with decorative end
      this.renderer.fillRect(
        vialX + vialWidth,
        lineY,
        15,
        1,
        'rgba(255, 255, 255, 0.5)'
      );
      
      this.renderer.fillCircle(
        vialX + vialWidth + 18,
        lineY,
        3,
        'rgba(255, 100, 100, 0.5)'
      );
    }
    
    // Draw completion effect when full
    if (this.bootProgress >= 1) {
      // Pulsing glow around the vial
      const pulseSize = 150 + Math.sin(this.stateTime * 5) * 30;
      const pulseAlpha = 0.2 + Math.sin(this.stateTime * 3) * 0.1;
      
      this.renderer.fillCircle(
        centerX,
        centerY,
        pulseSize,
        `rgba(255, 0, 0, ${pulseAlpha})`
      );
      
      // Particles emanating from the vial
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2 + this.stateTime;
        const distance = 50 + Math.sin(this.stateTime * 3 + i) * 30;
        const particleX = centerX + Math.cos(angle) * distance;
        const particleY = centerY + Math.sin(angle) * distance;
        const particleSize = 2 + Math.sin(this.stateTime * 5 + i) * 1;
        
        this.renderer.fillCircle(
          particleX,
          particleY,
          particleSize,
          'rgba(255, 50, 50, 0.7)'
        );
      }
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
    
    // Instructions
    this.renderer.drawText("UP/DOWN: CHANGE LETTER", {
      x: centerX,
      y: centerY + 130,
      color: '#AAAAAA',
      fontSize: 24,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Make the confirm instruction more visible with blinking effect
    const confirmAlpha = (Math.sin(this.stateTime * 5) + 1) / 2;
    this.renderer.drawText("PRESS SPACE TO CONFIRM", {
      x: centerX,
      y: centerY + 170,
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
    // If we have fewer than 5 scores, any score qualifies
    if (this.highScores.length < 5) {
      return true;
    }
    
    // Otherwise, check if the current score is higher than the lowest high score
    return this.player.getScore() > this.highScores[this.highScores.length - 1].score;
  }
  
  /**
   * Add current score to high scores
   */
  private addHighScore(): void {
    const newScore: HighScore = {
      name: this.playerName || 'AAA', // Default to AAA if no name entered
      score: this.player.getScore(),
      date: new Date().toISOString(),
      wave: this.level
    };
    
    this.highScores.push(newScore);
    this.highScores.sort((a, b) => b.score - a.score);
    
    // Limit to top 5
    if (this.highScores.length > 5) {
      this.highScores = this.highScores.slice(0, 5);
    }
    
    // Save to API and local storage
    this.saveHighScores().catch(err => {
      console.error('Failed to save high score to API:', err);
      // Fallback to local storage only if API fails
      this.saveHighScoresToLocalStorage();
    });
  }
  
  /**
   * Load high scores from API
   */
  private async loadHighScores(): Promise<void> {
    try {
      // First try to load from API
      const response = await fetch('/api/highscores');
      
      if (response.ok) {
        this.highScores = await response.json();
        // Also update local storage with the latest scores
        this.saveHighScoresToLocalStorage();
      } else {
        // Fallback to local storage if API fails
        const savedScores = localStorage.getItem(HIGH_SCORES_KEY);
        if (savedScores) {
          this.highScores = JSON.parse(savedScores);
        } else {
          // Initial default high scores
          this.highScores = [
            { name: 'ACE', score: 30000, date: new Date().toISOString(), wave: 5 },
            { name: 'BOB', score: 20000, date: new Date().toISOString(), wave: 3 },
            { name: 'CAT', score: 10000, date: new Date().toISOString(), wave: 2 }
          ];
          // Save to local storage as fallback
          this.saveHighScoresToLocalStorage();
        }
      }
    } catch (error) {
      console.error('Error loading high scores:', error);
      
      // Fallback to local storage
      const savedScores = localStorage.getItem(HIGH_SCORES_KEY);
      if (savedScores) {
        try {
          this.highScores = JSON.parse(savedScores);
          return;
        } catch (e) {
          console.error('Error parsing local storage high scores:', e);
        }
      }
      
      // Fallback to defaults if everything fails
      this.highScores = [
        { name: 'ACE', score: 30000, date: new Date().toISOString(), wave: 5 },
        { name: 'BOB', score: 20000, date: new Date().toISOString(), wave: 3 },
        { name: 'CAT', score: 10000, date: new Date().toISOString(), wave: 2 }
      ];
    }
  }
  
  /**
   * Save high scores to API and local storage as backup
   */
  private async saveHighScores(): Promise<void> {
    // Keep only the top 5 scores
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 5);
    
    try {
      // Save to local storage first as a reliable backup
      this.saveHighScoresToLocalStorage();
      
      // Then try to save to the API
      const response = await fetch('/api/highscores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.highScores),
      });
      
      if (response.ok) {
        // Update local high scores with the sorted list from the server
        this.highScores = await response.json();
        console.log('High scores saved successfully:', this.highScores);
        
        // Update local storage with the latest from the server
        this.saveHighScoresToLocalStorage();
      } else {
        console.error('Failed to save high scores to API:', await response.text());
      }
    } catch (error) {
      console.error('Error saving high scores to API:', error);
      // Local storage was already updated above, so no need to call again
    }
  }
  
  /**
   * Save high scores to local storage (fallback method)
   */
  private saveHighScoresToLocalStorage(): void {
    try {
      localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(this.highScores));
    } catch (error) {
      console.error('Error saving high scores to local storage:', error);
    }
  }
  
  /**
   * Get the input handler
   */
  public getInputHandler(): InputHandler {
    return this.inputHandler;
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