/**
 * Power-Ups Module
 * Implements vampire-themed power-ups for the player
 */

import { Collidable, Rect } from '../engine/collision';
import { Renderer } from '../engine/renderer';
import { SoundEffect, SoundEngine } from '../sounds/soundEngine';

// Power-up types
export enum PowerUpType {
  GARLIC,         // Area attack that damages all enemies on screen
  HOLY_WATER,     // Temporary shield
  SILVER_CROSS,   // Weapon upgrade (faster firing)
  EXTRA_LIFE      // Gives an extra life
}

export class PowerUp implements Collidable {
  private active: boolean = true;
  private width: number = 24;
  private height: number = 24;
  private velocityY: number = 50; // Slow downward movement
  private animationFrame: number = 0;
  private frameTime: number = 0;
  private frameDuration: number = 0.2; // seconds per frame
  private frameCount: number = 4;
  private pulseTime: number = 0;
  private pulseRate: number = 2; // Pulse rate in seconds
  private lifespan: number = 10; // Power-ups disappear after 10 seconds
  private lifespanTimer: number = 0;

  constructor(
    private x: number,
    private y: number,
    private type: PowerUpType,
    private soundEngine: SoundEngine,
    private screenHeight: number
  ) {}

  /**
   * Update power-up position and animation
   */
  public update(deltaTime: number): void {
    if (!this.active) return;

    // Update position
    this.y += this.velocityY * deltaTime;

    // Update animation
    this.frameTime += deltaTime;
    if (this.frameTime >= this.frameDuration) {
      this.frameTime = 0;
      this.animationFrame = (this.animationFrame + 1) % this.frameCount;
    }

    // Update pulse effect
    this.pulseTime += deltaTime;
    if (this.pulseTime > this.pulseRate) {
      this.pulseTime = 0;
    }

    // Update lifespan
    this.lifespanTimer += deltaTime;
    if (this.lifespanTimer >= this.lifespan) {
      this.active = false;
    }

    // Deactivate if out of bounds
    if (this.y > this.screenHeight) {
      this.active = false;
    }
  }

  /**
   * Draw the power-up
   */
  public draw(renderer: Renderer): void {
    if (!this.active) return;

    // Calculate pulse effect (0.0 to 1.0)
    const pulseProgress = Math.sin(this.pulseTime / this.pulseRate * Math.PI * 2) * 0.5 + 0.5;
    
    // Blink rapidly when about to expire
    const isVisible = this.lifespanTimer > this.lifespan - 3 ? 
      Math.floor(this.lifespanTimer * 10) % 2 === 0 : true;
    
    if (!isVisible) return;

    // Draw based on power-up type
    switch (this.type) {
      case PowerUpType.GARLIC:
        this.drawGarlic(renderer, pulseProgress);
        break;
      case PowerUpType.HOLY_WATER:
        this.drawHolyWater(renderer, pulseProgress);
        break;
      case PowerUpType.SILVER_CROSS:
        this.drawSilverCross(renderer, pulseProgress);
        break;
      case PowerUpType.EXTRA_LIFE:
        this.drawExtraLife(renderer, pulseProgress);
        break;
    }
  }

  /**
   * Draw garlic power-up
   */
  private drawGarlic(renderer: Renderer, pulseProgress: number): void {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const radius = 10 + pulseProgress * 2;

    // Garlic bulb (white with slight yellow tint)
    renderer.fillCircle(centerX, centerY, radius, '#FFFFDD');
    
    // Garlic details
    const segments = 5;
    for (let i = 0; i < segments; i++) {
      const angle = (Math.PI * 2 * i / segments) + (this.animationFrame * 0.2);
      const segX = centerX + Math.cos(angle) * radius * 0.7;
      const segY = centerY + Math.sin(angle) * radius * 0.7;
      
      renderer.fillCircle(segX, segY, radius * 0.4, '#EEEEDD');
    }
    
    // Stem
    renderer.fillRect(centerX - 1, centerY - radius - 4, 2, 4, '#AAAA88');
  }

  /**
   * Draw holy water power-up
   */
  private drawHolyWater(renderer: Renderer, pulseProgress: number): void {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    
    // Vial
    renderer.fillRect(centerX - 6, centerY - 8, 12, 16, '#DDDDFF');
    
    // Liquid
    const waterHeight = 10 + Math.sin(this.animationFrame * 0.5) * 2;
    renderer.fillRect(centerX - 4, centerY - 6 + (16 - waterHeight), 8, waterHeight, '#3333FF');
    
    // Vial neck
    renderer.fillRect(centerX - 3, centerY - 12, 6, 4, '#DDDDFF');
    
    // Cork
    renderer.fillRect(centerX - 2, centerY - 14, 4, 2, '#AA8866');
    
    // Glow effect
    renderer.fillCircle(centerX, centerY, 14 * pulseProgress, 'rgba(100, 100, 255, 0.3)');
  }

  /**
   * Draw silver cross power-up
   */
  private drawSilverCross(renderer: Renderer, pulseProgress: number): void {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    
    // Cross vertical bar
    renderer.fillRect(centerX - 2, centerY - 10, 4, 20, '#CCCCCC');
    
    // Cross horizontal bar
    renderer.fillRect(centerX - 8, centerY - 2, 16, 4, '#CCCCCC');
    
    // Shine effect based on animation frame
    const shineX = this.animationFrame === 0 ? centerX - 1 : centerX + 1;
    const shineY = this.animationFrame === 2 ? centerY - 1 : centerY + 1;
    
    renderer.fillRect(shineX, shineY, 1, 1, '#FFFFFF');
    
    // Glow effect
    renderer.fillCircle(centerX, centerY, 12 * pulseProgress, 'rgba(255, 255, 255, 0.3)');
  }

  /**
   * Draw extra life power-up
   */
  private drawExtraLife(renderer: Renderer, pulseProgress: number): void {
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    
    // Heart shape (simplified for pixel art)
    renderer.fillRect(centerX - 6, centerY - 4, 4, 4, '#FF0000');
    renderer.fillRect(centerX + 2, centerY - 4, 4, 4, '#FF0000');
    renderer.fillRect(centerX - 8, centerY - 2, 16, 6, '#FF0000');
    renderer.fillRect(centerX - 6, centerY + 4, 12, 2, '#FF0000');
    renderer.fillRect(centerX - 4, centerY + 6, 8, 2, '#FF0000');
    renderer.fillRect(centerX - 2, centerY + 8, 4, 2, '#FF0000');
    
    // Pulse effect
    const pulseSize = 12 + pulseProgress * 4;
    renderer.fillCircle(centerX, centerY, pulseSize, 'rgba(255, 0, 0, 0.2)');
  }

  /**
   * Activate the power-up effect
   */
  public activate(): void {
    this.active = false;
    
    // Play sound effect
    this.soundEngine.playSound(SoundEffect.POWER_UP);
  }

  /**
   * Get the collision rectangle
   * Implements Collidable interface
   */
  public getCollisionRect(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Check if the power-up is active
   * Implements Collidable interface
   */
  public isActive(): boolean {
    return this.active;
  }

  /**
   * Get the power-up type
   */
  public getType(): PowerUpType {
    return this.type;
  }

  /**
   * Get power-up position
   */
  public getPosition(): { x: number, y: number } {
    return { x: this.x, y: this.y };
  }
}

/**
 * PowerUpManager class to handle spawning and managing power-ups
 */
export class PowerUpManager {
  private powerUps: PowerUp[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 25; // Seconds between power-up spawns
  private spawnChance: number = 0.1; // 10% chance to spawn a power-up

  constructor(
    private soundEngine: SoundEngine,
    private screenWidth: number,
    private screenHeight: number
  ) {}

  /**
   * Update all power-ups
   */
  public update(deltaTime: number): void {
    // Update spawn timer
    this.spawnTimer += deltaTime;
    
    // Try to spawn a power-up
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      
      if (Math.random() < this.spawnChance) {
        this.spawnRandomPowerUp();
      }
    }
    
    // Update existing power-ups
    this.powerUps = this.powerUps.filter(p => p.isActive());
    for (const powerUp of this.powerUps) {
      powerUp.update(deltaTime);
    }
  }

  /**
   * Draw all power-ups
   */
  public draw(renderer: Renderer): void {
    for (const powerUp of this.powerUps) {
      powerUp.draw(renderer);
    }
  }

  /**
   * Spawn a power-up at the given enemy position (when enemy is destroyed)
   */
  public spawnPowerUpAtPosition(x: number, y: number, enemyPoints: number): void {
    // Slightly reduced chance for power-ups from enemies
    const powerUpChance = Math.min(0.6, enemyPoints / 1200);
    
    if (Math.random() < powerUpChance) {
      // Determine power-up type based on enemy value
      let type: PowerUpType;
      
      const roll = Math.random();
      if (enemyPoints >= 400 && roll < 0.2) {
        // 20% chance for extra life from high-value enemies
        type = PowerUpType.EXTRA_LIFE;
      } else if (roll < 0.4) {
        // 40% chance for garlic
        type = PowerUpType.GARLIC;
      } else if (roll < 0.7) {
        // 30% chance for holy water
        type = PowerUpType.HOLY_WATER;
      } else {
        // 30% chance for silver cross
        type = PowerUpType.SILVER_CROSS;
      }
      
      this.spawnPowerUp(x, y, type);
    }
  }

  /**
   * Spawn a random power-up at a random position
   */
  private spawnRandomPowerUp(): void {
    const x = Math.random() * (this.screenWidth - 24);
    const y = 50 + Math.random() * 100; // Spawn in upper part of screen
    
    const types = [
      PowerUpType.GARLIC,
      PowerUpType.HOLY_WATER,
      PowerUpType.SILVER_CROSS
    ];
    
    // Extra life is rare
    if (Math.random() < 0.1) {
      types.push(PowerUpType.EXTRA_LIFE);
    }
    
    const type = types[Math.floor(Math.random() * types.length)];
    this.spawnPowerUp(x, y, type);
  }

  /**
   * Spawn a specific power-up at the given position
   */
  private spawnPowerUp(x: number, y: number, type: PowerUpType): void {
    const powerUp = new PowerUp(
      x,
      y,
      type,
      this.soundEngine,
      this.screenHeight
    );
    
    this.powerUps.push(powerUp);
  }

  /**
   * Get all active power-ups
   */
  public getPowerUps(): PowerUp[] {
    return this.powerUps;
  }

  /**
   * Clear all power-ups
   */
  public clearPowerUps(): void {
    this.powerUps = [];
  }
}