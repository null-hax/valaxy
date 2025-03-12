/**
 * Player Entity
 * Represents the player's vampire hunter ship
 */

import { Collidable, Rect } from '../engine/collision';
import { KeyState, InputState } from '../engine/input';
import { Renderer } from '../engine/renderer';
import { SoundEffect, SoundEngine } from '../sounds/soundEngine';
import { Projectile } from './projectiles';

// Player states
export enum PlayerState {
  SPAWNING,
  ACTIVE,
  INVULNERABLE,
  EXPLODING,
  CAPTURED,
  DEAD
}

export class Player implements Collidable {
  // Position and dimensions
  private x: number = 0;
  private y: number = 0;
  private width: number = 32;
  private height: number = 32;
  private speed: number = 200; // pixels per second
  
  // State
  private state: PlayerState = PlayerState.SPAWNING;
  private lives: number = 3;
  private score: number = 0;
  private _active: boolean = true;
  
  // Weapons
  private isFiring: boolean = false;
  private fireRate: number = 0.25; // seconds between shots
  private lastFireTime: number = 0;
  private projectiles: Projectile[] = [];
  
  // Effects
  private invulnerableTime: number = 2; // seconds of invulnerability after spawning
  private invulnerableTimer: number = 0;
  private blinkInterval: number = 0.1; // seconds between blinks
  private blinkTimer: number = 0;
  private isVisible: boolean = true;
  private explosionTimer: number = 0;
  private explosionDuration: number = 1; // seconds
  
  // Animation
  private animationFrame: number = 0;
  private frameTime: number = 0;
  private frameDuration: number = 0.1; // seconds per frame
  private thrustAnimation: boolean = false;
  
  constructor(
    private soundEngine: SoundEngine,
    private screenWidth: number,
    private screenHeight: number
  ) {
    this.reset();
  }
  
  /**
   * Reset player to starting position
   */
  public reset(): void {
    this.x = this.screenWidth / 2 - this.width / 2;
    this.y = this.screenHeight - this.height - 20;
    this.state = PlayerState.SPAWNING;
    this.invulnerableTimer = this.invulnerableTime;
    this._active = true;
    this.explosionTimer = 0;
    this.projectiles = [];
  }
  
  /**
   * Update player state
   */
  public update(deltaTime: number, inputState: InputState): void {
    // Update timers
    if (this.state === PlayerState.INVULNERABLE) {
      this.invulnerableTimer -= deltaTime;
      this.blinkTimer -= deltaTime;
      
      if (this.blinkTimer <= 0) {
        this.blinkTimer = this.blinkInterval;
        this.isVisible = !this.isVisible;
      }
      
      if (this.invulnerableTimer <= 0) {
        this.state = PlayerState.ACTIVE;
        this.isVisible = true;
      }
    }
    
    if (this.state === PlayerState.EXPLODING) {
      this.explosionTimer += deltaTime;
      if (this.explosionTimer >= this.explosionDuration) {
        if (this.lives > 0) {
          this.reset();
        } else {
          this.state = PlayerState.DEAD;
          this._active = false;
        }
      }
      return; // Don't process movement or firing while exploding
    }
    
    if (this.state === PlayerState.SPAWNING) {
      this.state = PlayerState.INVULNERABLE;
    }
    
    // Process movement
    if (this.state === PlayerState.ACTIVE || this.state === PlayerState.INVULNERABLE) {
      // Move left
      if (inputState.left === KeyState.PRESSED || inputState.left === KeyState.HELD) {
        this.x -= this.speed * deltaTime;
        this.thrustAnimation = true;
      }
      
      // Move right
      if (inputState.right === KeyState.PRESSED || inputState.right === KeyState.HELD) {
        this.x += this.speed * deltaTime;
        this.thrustAnimation = true;
      }
      
      // Ensure player stays within screen bounds
      this.x = Math.max(0, Math.min(this.screenWidth - this.width, this.x));
      
      // Process firing
      if (inputState.fire === KeyState.PRESSED || inputState.fire === KeyState.HELD) {
        this.fire();
      }
    }
    
    // Update animation
    this.frameTime += deltaTime;
    if (this.frameTime >= this.frameDuration) {
      this.frameTime = 0;
      this.animationFrame = (this.animationFrame + 1) % 2;
    }
    
    // Reset thrust animation if not moving
    if (inputState.left === KeyState.IDLE && inputState.right === KeyState.IDLE) {
      this.thrustAnimation = false;
    }
    
    // Update projectiles
    this.projectiles = this.projectiles.filter(p => p.isActive());
    for (const projectile of this.projectiles) {
      projectile.update(deltaTime);
    }
  }
  
  /**
   * Draw the player
   */
  public draw(renderer: Renderer): void {
    // Don't draw if not visible during invulnerability blink
    if (!this.isVisible) return;
    
    if (this.state === PlayerState.EXPLODING) {
      // Draw explosion animation
      const explosionProgress = this.explosionTimer / this.explosionDuration;
      const explosionRadius = 20 * explosionProgress;
      
      renderer.fillCircle(
        this.x + this.width / 2,
        this.y + this.height / 2,
        explosionRadius,
        `rgba(255, ${255 * (1 - explosionProgress)}, 0, ${1 - explosionProgress})`
      );
      
      // Draw particles
      for (let i = 0; i < 8; i++) {
        const angle = Math.PI * 2 * (i / 8);
        const distance = explosionRadius * 1.5;
        const particleX = this.x + this.width / 2 + Math.cos(angle) * distance;
        const particleY = this.y + this.height / 2 + Math.sin(angle) * distance;
        const particleSize = 3 * (1 - explosionProgress);
        
        renderer.fillCircle(
          particleX,
          particleY,
          particleSize,
          `rgba(255, ${100 + 155 * (1 - explosionProgress)}, 0, ${1 - explosionProgress})`
        );
      }
    } else {
      // Draw player ship (vampire hunter crossbow-shaped ship)
      const shipColor = '#EEEEEE'; // White/silver for vampire hunter
      const accentColor = '#990000'; // Blood red accents
      
      // Ship body
      renderer.fillRect(this.x + 8, this.y, 16, 24, shipColor);
      renderer.fillRect(this.x, this.y + 8, 32, 8, shipColor);
      
      // Ship details
      renderer.fillRect(this.x + 14, this.y, 4, 32, accentColor);
      renderer.fillRect(this.x + 2, this.y + 10, 28, 4, accentColor);
      
      // Engine thrust (animation based on movement)
      if (this.thrustAnimation) {
        const thrustLength = 6 + this.animationFrame * 4;
        renderer.fillRect(
          this.x + 12,
          this.y + 32,
          8,
          thrustLength,
          this.animationFrame === 0 ? '#FF7700' : '#FFAA00'
        );
      }
    }
    
    // Draw projectiles
    for (const projectile of this.projectiles) {
      projectile.draw(renderer);
    }
  }
  
  /**
   * Fire a projectile
   */
  private fire(): void {
    const now = performance.now() / 1000; // Convert to seconds
    
    if (now - this.lastFireTime < this.fireRate) {
      return;
    }
    
    this.lastFireTime = now;
    
    // Create a new projectile at the front center of the ship
    const projectile = new Projectile(
      this.x + this.width / 2 - 2,
      this.y - 4,
      4,
      12,
      0,
      -400, // Vertical velocity
      '#EEEEFF', // Silver stake color
      false // Is enemy projectile
    );
    
    this.projectiles.push(projectile);
    this.soundEngine.playSound(SoundEffect.PLAYER_SHOOT);
  }
  
  /**
   * Handle being hit
   */
  public hit(): void {
    if (this.state !== PlayerState.ACTIVE) {
      return;
    }
    
    this.lives--;
    this.state = PlayerState.EXPLODING;
    this.explosionTimer = 0;
    this.soundEngine.playSound(SoundEffect.PLAYER_EXPLOSION);
  }
  
  /**
   * Add points to score
   */
  public addScore(points: number): void {
    this.score += points;
  }
  
  /**
   * Get the player's score
   */
  public getScore(): number {
    return this.score;
  }
  
  /**
   * Get the player's lives
   */
  public getLives(): number {
    return this.lives;
  }
  
  /**
   * Add a life (max 5)
   */
  public addLife(): void {
    if (this.lives < 5) {
      this.lives++;
    }
  }
  
  /**
   * Get the collision rectangle
   * Implements Collidable interface
   */
  public getCollisionRect(): Rect {
    return {
      x: this.x + 8,
      y: this.y + 4,
      width: this.width - 16,
      height: this.height - 8
    };
  }
  
  /**
   * Check if the player is active
   * Implements Collidable interface
   */
  public isActive(): boolean {
    return this._active && 
      (this.state === PlayerState.ACTIVE || this.state === PlayerState.INVULNERABLE);
  }
  
  /**
   * Get player projectiles
   */
  public getProjectiles(): Projectile[] {
    return this.projectiles;
  }
  
  /**
   * Get player state
   */
  public getState(): PlayerState {
    return this.state;
  }
  
  /**
   * Check if player is dead
   */
  public isDead(): boolean {
    return this.state === PlayerState.DEAD;
  }
  
  /**
   * Handle being captured by a vampire
   */
  public capture(): void {
    if (this.state !== PlayerState.ACTIVE) {
      return;
    }
    
    this.state = PlayerState.CAPTURED;
    this.soundEngine.playSound(SoundEffect.VAMPIRE_CAPTURE);
  }
  
  /**
   * Get player position
   */
  public getPosition(): { x: number, y: number } {
    return { x: this.x, y: this.y };
  }
}