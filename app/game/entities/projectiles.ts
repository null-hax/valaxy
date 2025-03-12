/**
 * Projectile Entity
 * Represents projectiles fired by the player and enemies
 */

import { Collidable, Rect } from '../engine/collision';
import { Renderer } from '../engine/renderer';

export class Projectile implements Collidable {
  private active: boolean = true;

  constructor(
    private x: number,
    private y: number,
    private width: number,
    private height: number,
    private velocityX: number,
    private velocityY: number,
    private color: string,
    private isEnemyProjectile: boolean
  ) {}

  /**
   * Update projectile position
   */
  public update(deltaTime: number): void {
    // Move the projectile
    this.x += this.velocityX * deltaTime;
    this.y += this.velocityY * deltaTime;

    // Deactivate if out of bounds
    if (
      this.y < -this.height || 
      this.y > window.innerHeight || 
      this.x < -this.width || 
      this.x > window.innerWidth
    ) {
      this.active = false;
    }
  }

  /**
   * Draw the projectile
   */
  public draw(renderer: Renderer): void {
    if (!this.active) return;

    if (this.isEnemyProjectile) {
      // Enemy projectile (blood drop)
      renderer.fillCircle(
        this.x + this.width / 2,
        this.y + this.height / 2,
        this.width / 2,
        '#990000' // Dark red for blood
      );
      
      // Droplet trail
      renderer.fillCircle(
        this.x + this.width / 2,
        this.y - this.height / 4,
        this.width / 4,
        '#CC0000' // Lighter red for the trail
      );
    } else {
      // Player projectile (silver stake)
      renderer.fillRect(
        this.x,
        this.y,
        this.width,
        this.height,
        this.color
      );
      
      // Stake tip
      renderer.fillRect(
        this.x,
        this.y,
        this.width,
        this.height / 4,
        '#FFFFFF' // Bright white for the tip
      );
    }
  }

  /**
   * Deactivate the projectile (after hitting something)
   */
  public deactivate(): void {
    this.active = false;
  }

  /**
   * Check if the projectile is active
   * Implements Collidable interface
   */
  public isActive(): boolean {
    return this.active;
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
   * Check if this is an enemy projectile
   */
  public isEnemy(): boolean {
    return this.isEnemyProjectile;
  }

  /**
   * Get projectile position
   */
  public getPosition(): { x: number, y: number } {
    return { x: this.x, y: this.y };
  }
}