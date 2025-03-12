/**
 * Player Entity
 * Represents the player's vampire hunter ship
 */

import { Collidable, Rect } from '../engine/collision';
import { KeyState, InputState } from '../engine/input';
import { Renderer } from '../engine/renderer';
import { SoundEffect, SoundEngine } from '../sounds/soundEngine';
import { Projectile } from './projectiles';
import { PowerUpType } from './powerups';

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
  
  // Power-ups
  private hasHolyWaterShield: boolean = false;
  private holyWaterShieldTimer: number = 0;
  private holyWaterShieldDuration: number = 10; // seconds
  private hasSilverCrossUpgrade: boolean = false;
  private silverCrossUpgradeTimer: number = 0;
  private silverCrossUpgradeDuration: number = 15; // seconds
  private baseFireRate: number = 0.25; // Store original fire rate
  private upgradedFireRate: number = 0.1; // Faster fire rate with upgrade
  
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
    
    // Reset power-ups
    this.hasHolyWaterShield = false;
    this.holyWaterShieldTimer = 0;
    this.hasSilverCrossUpgrade = false;
    this.silverCrossUpgradeTimer = 0;
    this.fireRate = this.baseFireRate;
  }
  
  /**
   * Update player state
   */
  public update(deltaTime: number, inputState: InputState): void {
    // Update power-up timers
    if (this.hasHolyWaterShield) {
      this.holyWaterShieldTimer -= deltaTime;
      if (this.holyWaterShieldTimer <= 0) {
        this.hasHolyWaterShield = false;
      }
    }
    
    if (this.hasSilverCrossUpgrade) {
      this.silverCrossUpgradeTimer -= deltaTime;
      if (this.silverCrossUpgradeTimer <= 0) {
        this.hasSilverCrossUpgrade = false;
        this.fireRate = this.baseFireRate; // Reset fire rate when upgrade expires
      }
    }
    
    // Update invulnerability timers
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
      // Authentic 80s arcade explosion animation - pure pixels, no circles
      const explosionProgress = this.explosionTimer / this.explosionDuration;
      const centerX = Math.floor(this.x + this.width / 2);
      const centerY = Math.floor(this.y + this.height / 2);
      
      // Classic explosion colors
      const explosionColors = ['#FFFFFF', '#FF0000', '#FFFF00', '#FF8800'];
      
      // Draw Space Invaders style explosion - just pixels flying outward
      const maxParticles = 24; // More particles for a denser effect
      
      for (let i = 0; i < maxParticles; i++) {
        // Calculate position with slight randomness
        const angle = (Math.PI * 2 * i / maxParticles) + (explosionProgress * Math.PI * 0.5);
        const distance = 40 * explosionProgress;
        
        // Add slight randomness to distance for more natural look
        const randomOffset = Math.sin(i * 7.3) * 5;
        const particleX = centerX + Math.floor(Math.cos(angle) * (distance + randomOffset));
        const particleY = centerY + Math.floor(Math.sin(angle) * (distance + randomOffset));
        
        // Pixel size varies based on distance from center (closer = larger)
        const pixelSize = Math.max(1, Math.floor(4 * (1 - explosionProgress)));
        
        // Color based on position and time
        const colorIndex = Math.floor((i + explosionProgress * 12) % explosionColors.length);
        
        // Draw single pixel (or small block for visibility)
        renderer.fillRect(
          particleX,
          particleY,
          pixelSize,
          pixelSize,
          explosionColors[colorIndex]
        );
      }
      
      // Add Space Invaders style explosion fragments - just rectangular blocks
      if (explosionProgress < 0.7) {
        // Center chunk
        renderer.fillRect(
          centerX - 4,
          centerY - 4,
          8,
          8,
          explosionProgress < 0.3 ? '#FFFFFF' : '#FF8800'
        );
        
        // Diagonal fragments
        const fragSize = 3;
        const fragDist = 8 * explosionProgress;
        
        // Top-left fragment
        renderer.fillRect(
          centerX - fragSize - fragDist,
          centerY - fragSize - fragDist,
          fragSize,
          fragSize,
          '#FFFFFF'
        );
        
        // Top-right fragment
        renderer.fillRect(
          centerX + fragDist,
          centerY - fragSize - fragDist,
          fragSize,
          fragSize,
          '#FF0000'
        );
        
        // Bottom-left fragment
        renderer.fillRect(
          centerX - fragSize - fragDist,
          centerY + fragDist,
          fragSize,
          fragSize,
          '#FFFF00'
        );
        
        // Bottom-right fragment
        renderer.fillRect(
          centerX + fragDist,
          centerY + fragDist,
          fragSize,
          fragSize,
          '#FF8800'
        );
      }
    } else {
      // Draw player ship (vampire hunter crossbow-shaped ship)
      const shipColor = '#EEEEEE'; // White/silver for vampire hunter
      const accentColor = '#990000'; // Blood red accents
      const metalColor = '#CCCCCC'; // Metal color
      
      // Draw holy water shield if active
      if (this.hasHolyWaterShield) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const shieldRadius = this.width * 0.8;
        const pulseAmount = Math.sin(performance.now() / 200) * 0.2 + 0.8;
        
        // Draw shield glow
        renderer.fillCircle(
          centerX,
          centerY,
          shieldRadius * pulseAmount,
          'rgba(100, 100, 255, 0.3)'
        );
        
        // Draw shield outline
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i / 8) + (performance.now() / 1000);
          const shieldX = centerX + Math.cos(angle) * shieldRadius * 0.9;
          const shieldY = centerY + Math.sin(angle) * shieldRadius * 0.9;
          
          renderer.fillCircle(
            shieldX,
            shieldY,
            2,
            'rgba(150, 150, 255, 0.7)'
          );
        }
      }
      
      // Ship base
      renderer.fillRect(this.x + 12, this.y + 8, 8, 24, shipColor);
      
      // Crossbow arms (angled)
      renderer.fillRect(this.x + 2, this.y + 6, 12, 4, shipColor); // Left arm
      renderer.fillRect(this.x + 18, this.y + 6, 12, 4, shipColor); // Right arm
      
      // Bow strings
      renderer.fillRect(this.x + 2, this.y + 2, 2, 8, metalColor); // Left string
      renderer.fillRect(this.x + 28, this.y + 2, 2, 8, metalColor); // Right string
      
      // Stake/bolt
      renderer.fillRect(this.x + 14, this.y - 6, 4, 14, metalColor); // Stake shaft
      
      // Stake tip (pointed)
      renderer.fillRect(this.x + 12, this.y - 10, 8, 4, accentColor); // Stake tip
      
      // Crossbow details
      renderer.fillRect(this.x + 14, this.y + 12, 4, 20, accentColor); // Center detail
      renderer.fillRect(this.x + 8, this.y + 14, 16, 4, shipColor); // Crosspiece
      
      // Silver cross upgrade visual effect
      if (this.hasSilverCrossUpgrade) {
        // Add silver glow to the weapon
        const centerX = this.x + this.width / 2;
        const weaponY = this.y - 5;
        const pulseAmount = Math.sin(performance.now() / 150) * 0.3 + 0.7;
        
        renderer.fillCircle(
          centerX,
          weaponY,
          8 * pulseAmount,
          'rgba(220, 220, 255, 0.4)'
        );
        
        // Add silver tips to the crossbow arms
        renderer.fillRect(this.x, this.y + 6, 2, 4, '#FFFFFF');
        renderer.fillRect(this.x + 30, this.y + 6, 2, 4, '#FFFFFF');
      }
      
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
    
    if (this.hasSilverCrossUpgrade) {
      // Fire three projectiles in a spread pattern
      // Center projectile
      const centerProjectile = new Projectile(
        this.x + this.width / 2 - 2,
        this.y - 4,
        4,
        12,
        0,
        -400, // Vertical velocity
        '#EEEEFF', // Silver stake color
        false // Is enemy projectile
      );
      
      // Left projectile (angled slightly)
      const leftProjectile = new Projectile(
        this.x + this.width / 2 - 6,
        this.y,
        4,
        12,
        -50, // Horizontal velocity (left)
        -400, // Vertical velocity
        '#EEEEFF', // Silver stake color
        false // Is enemy projectile
      );
      
      // Right projectile (angled slightly)
      const rightProjectile = new Projectile(
        this.x + this.width / 2 + 2,
        this.y,
        4,
        12,
        50, // Horizontal velocity (right)
        -400, // Vertical velocity
        '#EEEEFF', // Silver stake color
        false // Is enemy projectile
      );
      
      this.projectiles.push(centerProjectile, leftProjectile, rightProjectile);
    } else {
      // Create a single projectile at the front center of the ship
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
    }
    
    this.soundEngine.playSound(SoundEffect.PLAYER_SHOOT);
  }
  
  /**
   * Handle being hit
   */
  public hit(): void {
    if (this.state !== PlayerState.ACTIVE) {
      return;
    }
    
    // Check if holy water shield is active
    if (this.hasHolyWaterShield) {
      // Shield absorbs the hit
      this.hasHolyWaterShield = false;
      this.holyWaterShieldTimer = 0;
      this.soundEngine.playSound(SoundEffect.POWER_UP);
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

  /**
   * Activate a power-up effect
   */
  public activatePowerUp(type: PowerUpType): void {
    switch (type) {
      case PowerUpType.HOLY_WATER:
        this.activateHolyWaterShield();
        break;
      case PowerUpType.SILVER_CROSS:
        this.activateSilverCrossUpgrade();
        break;
      case PowerUpType.EXTRA_LIFE:
        this.addLife();
        this.soundEngine.playSound(SoundEffect.POWER_UP);
        break;
    }
  }

  /**
   * Activate holy water shield (temporary invulnerability)
   */
  private activateHolyWaterShield(): void {
    this.hasHolyWaterShield = true;
    this.holyWaterShieldTimer = this.holyWaterShieldDuration;
    this.soundEngine.playSound(SoundEffect.POWER_UP);
  }

  /**
   * Activate silver cross weapon upgrade (faster firing)
   */
  private activateSilverCrossUpgrade(): void {
    this.hasSilverCrossUpgrade = true;
    this.silverCrossUpgradeTimer = this.silverCrossUpgradeDuration;
    this.fireRate = this.upgradedFireRate;
    this.soundEngine.playSound(SoundEffect.POWER_UP);
  }

  /**
   * Check if player has holy water shield active
   */
  public hasShield(): boolean {
    return this.hasHolyWaterShield;
  }
  
  /**
   * Get shield time remaining
   */
  public getShieldTime(): number {
    return this.holyWaterShieldTimer;
  }
  
  /**
   * Check if player has silver cross weapon upgrade active
   */
  public hasWeaponUpgrade(): boolean {
    return this.hasSilverCrossUpgrade;
  }
  
  /**
   * Get weapon upgrade time remaining
   */
  public getWeaponUpgradeTime(): number {
    return this.silverCrossUpgradeTimer;
  }
}