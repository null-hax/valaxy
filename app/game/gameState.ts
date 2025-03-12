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
  private bootMessages: string[] = [
    "INITIALIZING VALAXY OS...",
    "LOADING VAMPIRE DATABASE...",
    "CALIBRATING STAKE LAUNCHERS...",
    "SCANNING FOR BLOOD SIGNATURES...",
    "ACTIVATING GARLIC SHIELDS...",
    "SYSTEM READY."
  ];
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
    
    // Load high scores
    this.loadHighScores();
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Set the game loop update callback
    this.gameLoop.setUpdateCallback(this.update.bind(this));
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
    const startY = this.height / 3;
    
    // Draw boot messages (except the last "SYSTEM READY" message which is drawn separately)
    for (let i = 0; i < Math.min(this.currentBootMessage, this.bootMessages.length - 1); i++) {
      const message = this.bootMessages[i];
      const alpha = i === this.currentBootMessage
        ? Math.min(1, (this.bootProgress * this.bootMessages.length) % 1 + 0.5)
        : 1;
      
      this.renderer.drawText(message, {
        x: centerX,
        y: startY + i * 60, // Much more spacing between lines for better readability
        color: '#FFFFFF',
        fontSize: 72, // Much larger font size for better visibility
        align: 'center',
        alpha,
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
    }
    
    // Draw progress bar
    const barWidth = this.width * 0.7;
    const barHeight = 30;
    const barX = (this.width - barWidth) / 2;
    const barY = this.height * 0.7;
    
    // Draw system ready text separately with better placement
    if (this.currentBootMessage === this.bootMessages.length - 1) {
      this.renderer.drawText(this.bootMessages[this.bootMessages.length - 1], {
        x: centerX,
        y: startY + (this.bootMessages.length - 1) * 60,
        color: '#00FF00',
        fontSize: 72,
        align: 'center',
        alpha: 1,
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
    }
    
    // Draw licensed text (moved below progress bar)
    this.renderer.drawText("LICENSED BY WEST COAST AI LABS", {
      x: centerX,
      y: this.height * 0.7 + barHeight + 40,
      color: '#FF0000',
      fontSize: 36,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Bar background
    this.renderer.fillRect(barX, barY, barWidth, barHeight, '#333333');
    
    // Progress
    this.renderer.fillRect(
      barX,
      barY,
      barWidth * this.bootProgress,
      barHeight,
      '#00FF00'
    );
    
    // Add border to progress bar
    this.renderer.strokeRect(barX, barY, barWidth, barHeight, '#FFFFFF', 3);
    
    // Draw copyright
    this.renderer.drawText("© 2025 WEST COAST AI LABS", {
      x: centerX,
      y: this.height - 80,
      color: '#AAAAAA',
      fontSize: 48,
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
    
    // Draw dark red background with gradient
    this.renderer.fillRect(0, 0, this.width, this.height, '#110000');
    
    // Draw vertical dark red columns on sides for authentic arcade look
    const columnWidth = this.width * 0.15;
    this.renderer.fillRect(0, 0, columnWidth, this.height, '#220000');
    this.renderer.fillRect(this.width - columnWidth, 0, columnWidth, this.height, '#220000');
    
    // Draw horizontal scanlines for CRT effect
    for (let i = 0; i < this.height; i += 3) {
      this.renderer.fillRect(0, i, this.width, 1, 'rgba(0, 0, 0, 0.1)');
    }
    
    // Draw background stars with pulsing effect
    for (let i = 0; i < 80; i++) {
      const starX = Math.sin(this.stateTime * 0.1 + i) * 100 + centerX + (i * 20) % this.width - 100;
      const starY = Math.cos(this.stateTime * 0.1 + i) * 100 + this.height / 2 + (i * 15) % this.height - 100;
      const starSize = 1 + Math.sin(this.stateTime * 2 + i) * 1;
      this.renderer.fillCircle(starX, starY, starSize, '#FFFFFF');
    }
    
    // Draw large background fangs
    const fangWidth = 120;
    const fangHeight = 350;
    const fangSpacing = 250;
    
    // Left fang (background)
    this.renderer.fillRect(centerX - fangSpacing, 50, fangWidth, fangHeight, 'rgba(153, 0, 0, 0.3)');
    this.renderer.fillRect(centerX - fangSpacing, 50, fangWidth / 2, fangHeight, 'rgba(85, 0, 0, 0.3)');
    
    // Right fang (background)
    this.renderer.fillRect(centerX + fangSpacing - fangWidth, 50, fangWidth, fangHeight, 'rgba(153, 0, 0, 0.3)');
    this.renderer.fillRect(centerX + fangSpacing - fangWidth / 2, 50, fangWidth / 2, fangHeight, 'rgba(85, 0, 0, 0.3)');
    
    // Draw blood drips from top of screen
    for (let i = 0; i < 8; i++) {
      const x = this.width * (i + 0.5) / 8;
      const height = 30 + Math.sin(this.stateTime + i) * 20;
      this.renderer.fillRect(x - 3, 0, 6, height, '#990000');
    }
    
    // Draw title (much larger)
    const titleY = this.height * 0.15;
    this.drawLogo(centerX, titleY, 2.5); // Much larger size
    
    // Draw decorative vampire bats flying in background
    for (let i = 0; i < 3; i++) {
      const batX = (this.width * 0.2) + (this.width * 0.3 * i) + Math.sin(this.stateTime * 0.5 + i) * 50;
      const batY = this.height * 0.3 + Math.cos(this.stateTime * 0.5 + i) * 30;
      const batSize = 15 + i * 5;
      
      // Draw simple bat shape
      this.renderer.fillRect(batX - batSize/2, batY, batSize, batSize/2, '#660000');
      this.renderer.fillRect(batX - batSize, batY - batSize/4, batSize/2, batSize/2, '#660000');
      this.renderer.fillRect(batX + batSize/2, batY - batSize/4, batSize/2, batSize/2, '#660000');
    }
    
    // Draw prompt (blinking with glow effect)
    const promptAlpha = (Math.sin(this.stateTime * 5) + 1) / 2;
    
    // Create a red box behind the prompt
    this.renderer.fillRect(centerX - 250, this.height * 0.4 - 30, 500, 60, '#550000');
    this.renderer.strokeRect(centerX - 250, this.height * 0.4 - 30, 500, 60, '#FF0000', 2);
    
    // Draw glow behind text
    this.renderer.drawText("PRESS SPACE TO PLAY", {
      x: centerX,
      y: this.height * 0.4,
      color: 'rgba(255, 0, 0, 0.5)',
      fontSize: 52,
      align: 'center',
      alpha: promptAlpha * 0.7,
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Draw main text
    this.renderer.drawText("PRESS SPACE TO PLAY", {
      x: centerX,
      y: this.height * 0.4,
      color: '#FFFFFF',
      fontSize: 48,
      align: 'center',
      alpha: promptAlpha,
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Draw high scores section with decorative border
    const scoreBoxWidth = 500;
    const scoreBoxHeight = 250;
    const scoreBoxX = centerX - scoreBoxWidth / 2;
    const scoreBoxY = this.height * 0.55 - 40;
    
    // Draw score box background
    this.renderer.fillRect(scoreBoxX, scoreBoxY, scoreBoxWidth, scoreBoxHeight, 'rgba(0, 0, 0, 0.7)');
    this.renderer.strokeRect(scoreBoxX, scoreBoxY, scoreBoxWidth, scoreBoxHeight, '#FFAA00', 2);
    
    // Draw high scores header with arcade-style decoration
    this.renderer.fillRect(centerX - 200, scoreBoxY + 10, 400, 3, '#FFAA00');
    
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
    
    // Display top 5 scores with names
    const displayScores = [
      { name: 'ACE', score: 30000, wave: 5 },
      { name: 'HAX', score: 20000, wave: 3 },
      { name: 'BOB', score: 10000, wave: 2 },
      { name: 'ZOE', score: 5000, wave: 1 },
      { name: 'DAN', score: 2500, wave: 1 }
    ];
    
    for (let i = 0; i < displayScores.length; i++) {
      const score = displayScores[i];
      // Display rank
      this.renderer.drawText(`${i+1}.`, {
        x: scoreBoxX + 80,
        y: scoreBoxY + 90 + i * 30,
        color: i === 0 ? '#FFFF00' : '#FFFFFF', // Gold color for top score
        fontSize: 24,
        align: 'right',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
      
      // Display name
      this.renderer.drawText(score.name, {
        x: scoreBoxX + 100,
        y: scoreBoxY + 90 + i * 30,
        color: i === 0 ? '#FFFF00' : '#FFFFFF', // Gold color for top score
        fontSize: 24,
        align: 'left',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
      
      // Display score
      this.renderer.drawText(score.score.toString().padStart(6, '0'), {
        x: scoreBoxX + 250,
        y: scoreBoxY + 90 + i * 30,
        color: i === 0 ? '#FFFF00' : '#FFFFFF', // Gold color for top score
        fontSize: 24,
        align: 'right',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
      
      // Display wave
      this.renderer.drawText(`WAVE ${score.wave}`, {
        x: scoreBoxX + 420,
        y: scoreBoxY + 90 + i * 30,
        color: i === 0 ? '#FFFF00' : '#FFFFFF', // Gold color for top score
        fontSize: 24,
        align: 'right',
        fontFamily: 'Press Start 2P, monospace',
        pixelated: true
      });
    }
    
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
    
    // Draw "LICENSED BY WEST COAST AI LABS" text at bottom
    this.renderer.drawText("LICENSED BY WEST COAST AI LABS", {
      x: centerX,
      y: this.height - 70,
      color: '#FF0000',
      fontSize: 24,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
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
      alpha: 0.3
    });
    
    // Draw larger vampire fangs under the logo
    const fangWidth = 25 * scale;
    const fangHeight = 40 * scale;
    const fangSpacing = 40 * scale;
    const fangY = y + 100 * scale;
    
    // Left fang
    this.renderer.fillRect(x - fangSpacing, fangY, fangWidth, fangHeight, mainColor);
    this.renderer.fillRect(x - fangSpacing, fangY, fangWidth / 2, fangHeight, outlineColor);
    
    // Right fang
    this.renderer.fillRect(x + fangSpacing - fangWidth, fangY, fangWidth, fangHeight, mainColor);
    this.renderer.fillRect(x + fangSpacing - fangWidth / 2, fangY, fangWidth / 2, fangHeight, outlineColor);
    
    // Add blood drips from fangs
    const dripsCount = 3;
    for (let i = 0; i < dripsCount; i++) {
      const drip1X = x - fangSpacing + fangWidth / 2 - (5 * scale) + (i * 5 * scale);
      const drip2X = x + fangSpacing - fangWidth / 2 - (5 * scale) + (i * 5 * scale);
      const dripLength = (10 + Math.sin(this.stateTime * 2 + i) * 5) * scale;
      
      this.renderer.fillRect(drip1X, fangY + fangHeight, 3 * scale, dripLength, highlightColor);
      this.renderer.fillRect(drip2X, fangY + fangHeight, 3 * scale, dripLength, highlightColor);
    }
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
    if (this.highScores.length < 10) {
      return true;
    }
    
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
    
    // Limit to top 10
    if (this.highScores.length > 10) {
      this.highScores = this.highScores.slice(0, 10);
    }
    
    // Save to local storage
    this.saveHighScores();
  }
  
  /**
   * Load high scores from local storage
   */
  private loadHighScores(): void {
    try {
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
        this.saveHighScores();
      }
    } catch (error) {
      console.error('Error loading high scores:', error);
      this.highScores = [];
    }
  }
  
  /**
   * Save high scores to local storage
   */
  private saveHighScores(): void {
    try {
      localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(this.highScores));
    } catch (error) {
      console.error('Error saving high scores:', error);
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