/**
 * Game State Manager
 * Handles the overall game state, progression, and game logic
 */

import { GameLoop } from './engine/gameLoop';
import { InputHandler, InputState } from './engine/input';
import { Renderer } from './engine/renderer';
import { CollisionSystem } from './engine/collision';
import { SoundEngine, SoundEffect } from './sounds/soundEngine';
import { Player } from './entities/player';
import { FormationManager } from './entities/formation';
import { Enemy, EnemyState } from './entities/enemies';
import { Projectile } from './entities/projectiles';

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
          this.score += enemy.getPoints();
          this.player.addScore(enemy.getPoints());
        }
      }
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
  
  /**
   * Update high score entry state
   */
  private updateHighScore(deltaTime: number, inputState: InputState): void {
    this.stateTime += deltaTime;
    
    // Handle name entry
    if (this.nameEntryPosition < this.MAX_NAME_LENGTH) {
      // Move selection up/down through characters
      if (inputState.up === 1) {
        const currentChar = this.playerName.charAt(this.nameEntryPosition) || 'A';
        const currentIndex = this.ALLOWED_CHARS.indexOf(currentChar);
        const newIndex = (currentIndex + 1) % this.ALLOWED_CHARS.length;
        this.playerName = this.playerName.substring(0, this.nameEntryPosition) +
                          this.ALLOWED_CHARS.charAt(newIndex) +
                          this.playerName.substring(this.nameEntryPosition + 1);
        this.soundEngine.playSound(SoundEffect.MENU_NAVIGATE);
        // Reset state time to prevent auto-advancing
        this.stateTime = 0;
      }
      
      if (inputState.down === 1) {
        const currentChar = this.playerName.charAt(this.nameEntryPosition) || 'A';
        const currentIndex = this.ALLOWED_CHARS.indexOf(currentChar);
        const newIndex = (currentIndex - 1 + this.ALLOWED_CHARS.length) % this.ALLOWED_CHARS.length;
        this.playerName = this.playerName.substring(0, this.nameEntryPosition) +
                          this.ALLOWED_CHARS.charAt(newIndex) +
                          this.playerName.substring(this.nameEntryPosition + 1);
        this.soundEngine.playSound(SoundEffect.MENU_NAVIGATE);
        // Reset state time to prevent auto-advancing
        this.stateTime = 0;
      }
      
      // Confirm character and move to next position
      if (inputState.fire === 1) {
        // If no character is selected, default to 'A'
        if (this.nameEntryPosition >= this.playerName.length) {
          this.playerName += 'A';
        }
        
        this.nameEntryPosition++;
        this.soundEngine.playSound(SoundEffect.MENU_SELECT);
        // Reset state time to prevent auto-advancing
        this.stateTime = 0;
      }
    } else {
      // Name entry complete, add high score after a short delay
      if (this.stateTime >= 1) {
        this.addHighScore();
        this.state = GameState.TITLE;
        this.stateTime = 0;
        this.playerName = '';
        this.nameEntryPosition = 0;
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
    
    // Draw boot messages
    for (let i = 0; i <= this.currentBootMessage; i++) {
      const message = this.bootMessages[i];
      const alpha = i === this.currentBootMessage
        ? Math.min(1, (this.bootProgress * this.bootMessages.length) % 1 + 0.5)
        : 1;
      
      this.renderer.drawText(message, {
        x: centerX,
        y: startY + i * 60, // Much more spacing between lines for better readability
        color: i === this.bootMessages.length - 1 ? '#00FF00' : '#FFFFFF',
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
    
    // Draw licensed text
    this.renderer.drawText("LICENSED BY WEST COAST AI LABS", {
      x: centerX,
      y: this.height - 150,
      color: '#FF0000',
      fontSize: 36,
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
    
    // Draw title
    const titleY = this.height * 0.2;
    this.drawLogo(centerX, titleY);
    
    // Draw subtitle
    this.renderer.drawText("VAMPIRE UNDERWORLD", {
      x: centerX,
      y: titleY + 120,
      color: '#990000',
      fontSize: 72, // Much larger font size
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Draw prompt (blinking)
    const promptAlpha = (Math.sin(this.stateTime * 5) + 1) / 2;
    this.renderer.drawText("PRESS FIRE TO START", {
      x: centerX,
      y: this.height * 0.55,
      color: '#FFFFFF',
      fontSize: 48, // Much larger font size
      align: 'center',
      alpha: promptAlpha,
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Draw high scores
    this.renderer.drawText("HIGH SCORES", {
      x: centerX,
      y: this.height * 0.65,
      color: '#FFAA00',
      fontSize: 36, // Larger font size
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Display top 3 scores with names
    const displayScores = this.highScores.slice(0, 3);
    for (let i = 0; i < displayScores.length; i++) {
      const score = displayScores[i];
      // Display name and score on the same line
      this.renderer.drawText(`${score.name}  ${score.score.toString().padStart(6, '0')}  WAVE ${score.wave}`, {
        x: centerX,
        y: this.height * 0.65 + 50 + i * 50,
        color: '#FFFFFF',
        fontSize: 36,
        align: 'center',
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
  }
  
  /**
   * Render the main game screen
   */
  private renderGame(): void {
    // Draw enemies
    this.formationManager.draw(this.renderer);
    
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
    
    // Lives
    this.renderer.drawText(`LIVES`, {
      x: 40,
      y: this.height - 60,
      color: '#FF0000',
      fontSize: 32,
      align: 'left',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
    
    // Draw life icons
    for (let i = 0; i < this.player.getLives(); i++) {
      // Larger player ship icon for each life
      const shipX = 150 + i * 60;
      const shipY = this.height - 65;
      
      // Ship body
      this.renderer.fillRect(shipX + 10, shipY, 20, 30, '#EEEEEE');
      this.renderer.fillRect(shipX, shipY + 10, 40, 10, '#EEEEEE');
      
      // Ship details
      this.renderer.fillRect(shipX + 18, shipY, 5, 40, '#990000');
      this.renderer.fillRect(shipX + 2, shipY + 12, 36, 5, '#990000');
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
    
    this.renderer.drawText("FIRE: CONFIRM", {
      x: centerX,
      y: centerY + 170,
      color: '#AAAAAA',
      fontSize: 24,
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
      pixelated: true
    });
  }
  
  /**
   * Draw the Valaxy logo
   */
  private drawLogo(x: number, y: number): void {
    // Logo colors
    const mainColor = '#990000'; // Blood red
    const glowColor = 'rgba(153, 0, 0, 0.6)'; // Blood red glow
    const outlineColor = '#550000'; // Dark red outline
    
    // Logo dimensions
    const logoWidth = 480; // Doubled size
    const logoHeight = 180; // Doubled size
    
    // Draw glow effect
    this.renderer.fillCircle(
      x,
      y + logoHeight / 2,
      logoWidth / 1.5, // Larger glow radius
      glowColor
    );
    
    // "VALAXY" text (pixelated style)
    this.renderer.drawText("VALAXY!!!", {
      x: x,
      y: y,
      color: mainColor,
      fontSize: 96, // Doubled font size
      fontFamily: 'Press Start 2P, monospace',
      align: 'center',
      pixelated: true
    });
    
    // Draw larger vampire fangs under the logo
    const fangWidth = 25;
    const fangHeight = 40;
    const fangSpacing = 40;
    const fangY = y + 100;
    
    // Left fang
    this.renderer.fillRect(x - fangSpacing, fangY, fangWidth, fangHeight, mainColor);
    this.renderer.fillRect(x - fangSpacing, fangY, fangWidth / 2, fangHeight, outlineColor);
    
    // Right fang
    this.renderer.fillRect(x + fangSpacing - fangWidth, fangY, fangWidth, fangHeight, mainColor);
    this.renderer.fillRect(x + fangSpacing - fangWidth / 2, fangY, fangWidth / 2, fangHeight, outlineColor);
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