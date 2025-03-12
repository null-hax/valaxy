/**
 * Enemy Entities
 * Implements the vampire-themed enemies in our Galaga clone
 */

import { Collidable, Rect } from '../engine/collision';
import { Renderer } from '../engine/renderer';
import { SoundEffect, SoundEngine } from '../sounds/soundEngine';
import { Projectile } from './projectiles';

// Different types of vampire enemies
export enum EnemyType {
  BASIC_VAMPIRE,   // Basic enemy (like Galaga's bee)
  VAMPIRE_BAT,     // Mid-tier enemy (like Galaga's butterfly)
  BLOOD_LORD       // Boss enemy (like Galaga's flagship)
}

// Enemy movement patterns
export enum MovementPattern {
  GRID,            // Stay in formation
  DIVE,            // Dive attack toward player
  CIRCLE,          // Circular movement
  PATROL,          // Side to side patrol
  RETURN_TO_GRID   // Return to formation position
}

// Enemy states
export enum EnemyState {
  SPAWNING,
  ACTIVE,
  EXPLODING,
  TRANSFORMING,
  CAPTURING
}

export interface EnemyFormationPosition {
  x: number;
  y: number;
  row: number;
  col: number;
}

export class Enemy implements Collidable {
  // Position and dimensions
  private x: number = 0;
  private y: number = 0;
  private width: number = 24;
  private height: number = 24;
  
  // Movement
  private velocityX: number = 0;
  private velocityY: number = 0;
  private movementPattern: MovementPattern = MovementPattern.GRID;
  private gridPosition: EnemyFormationPosition;
  private patrolDistance: number = 40;
  private patrolSpeed: number = 50;
  private patrolOriginX: number = 0;
  private diveSpeed: number = 150;
  private returnSpeed: number = 80;
  private movementTimer: number = 0;
  private pathPoints: {x: number, y: number}[] = [];
  private pathIndex: number = 0;
  
  // State
  private state: EnemyState = EnemyState.SPAWNING;
  private active: boolean = true;
  private points: number = 100;
  
  // Combat
  private health: number = 1;
  private projectiles: Projectile[] = [];
  private fireRate: number = 2; // seconds between shots
  private lastFireTime: number = 0;
  private firingEnabled: boolean = false;
  
  // Effects
  private explosionTimer: number = 0;
  private explosionDuration: number = 0.5;
  private transformationTimer: number = 0;
  private transformationDuration: number = 1.0;
  private hitAnimationTimer: number = 0;
  private hitAnimationDuration: number = 0.2;
  private isShowingHitAnimation: boolean = false;
  
  // Animation
  private animationFrame: number = 0;
  private frameTime: number = 0;
  private frameDuration: number = 0.2; // seconds per frame
  private frameCount: number = 2;
  private targetPlayer: {x: number, y: number} | null = null;
  
  constructor(
    private type: EnemyType,
    formationPosition: EnemyFormationPosition,
    private soundEngine: SoundEngine,
    private screenWidth: number,
    private screenHeight: number
  ) {
    this.gridPosition = formationPosition;
    this.x = formationPosition.x;
    this.y = formationPosition.y;
    this.patrolOriginX = formationPosition.x;
    
    // Set up enemy type-specific properties
    this.setupType();
  }
  
  /**
   * Set up type-specific properties
   */
  private setupType(): void {
    switch (this.type) {
      case EnemyType.BASIC_VAMPIRE:
        this.width = 24;
        this.height = 24;
        this.health = 1;
        this.points = 100;
        this.frameCount = 2;
        this.firingEnabled = true;
        this.fireRate = 3; // Fires less often
        break;
        
      case EnemyType.VAMPIRE_BAT:
        this.width = 28;
        this.height = 24;
        this.health = 1;
        this.points = 150;
        this.frameCount = 3; // More animation frames for wing flapping
        this.firingEnabled = true;
        this.fireRate = 2.5;
        this.diveSpeed = 180; // Faster dive
        break;
        
      case EnemyType.BLOOD_LORD:
        this.width = 32;
        this.height = 32;
        this.health = 2; // Takes two hits
        this.points = 400;
        this.frameCount = 2;
        this.firingEnabled = true;
        this.fireRate = 2;
        this.diveSpeed = 120; // Slower but more threatening
        break;
    }
  }
  
  /**
   * Update enemy state
   */
  public update(deltaTime: number, playerPosition: {x: number, y: number}): void {
    this.targetPlayer = playerPosition;
    
    // Update animation
    this.frameTime += deltaTime;
    if (this.frameTime >= this.frameDuration) {
      this.frameTime = 0;
      this.animationFrame = (this.animationFrame + 1) % this.frameCount;
    }
    
    // Update hit animation if active
    if (this.isShowingHitAnimation) {
      this.hitAnimationTimer += deltaTime;
      if (this.hitAnimationTimer >= this.hitAnimationDuration) {
        this.isShowingHitAnimation = false;
        this.hitAnimationTimer = 0;
      }
    }
    
    // Update state
    switch (this.state) {
      case EnemyState.SPAWNING:
        this.state = EnemyState.ACTIVE;
        break;
        
      case EnemyState.EXPLODING:
        this.explosionTimer += deltaTime;
        if (this.explosionTimer >= this.explosionDuration) {
          this.active = false;
        }
        break;
        
      case EnemyState.TRANSFORMING:
        this.transformationTimer += deltaTime;
        if (this.transformationTimer >= this.transformationDuration) {
          this.completeTransformation();
        }
        break;
        
      case EnemyState.ACTIVE:
        this.updateMovement(deltaTime);
        this.attemptFiring();
        break;
    }
    
    // Update projectiles
    this.projectiles = this.projectiles.filter(p => p.isActive());
    for (const projectile of this.projectiles) {
      projectile.update(deltaTime);
    }
  }
  
  /**
   * Update enemy movement based on current pattern
   */
  private updateMovement(deltaTime: number): void {
    this.movementTimer += deltaTime;
    
    switch (this.movementPattern) {
      case MovementPattern.GRID:
        // Minor hover movement in the grid
        this.y = this.gridPosition.y + Math.sin(this.movementTimer * 2) * 3;
        break;
        
      case MovementPattern.DIVE:
        if (this.pathPoints.length === 0 || this.pathIndex >= this.pathPoints.length) {
          // Return to grid if dive path is complete
          this.setMovementPattern(MovementPattern.RETURN_TO_GRID);
        } else {
          // Follow dive path
          const targetPoint = this.pathPoints[this.pathIndex];
          const dx = targetPoint.x - this.x;
          const dy = targetPoint.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 5) {
            // Move to next point
            this.pathIndex++;
          } else {
            // Move toward current point
            const speed = this.diveSpeed * deltaTime;
            const ratio = speed / distance;
            this.x += dx * ratio;
            this.y += dy * ratio;
          }
        }
        break;
        
      case MovementPattern.CIRCLE:
        // Circular movement pattern
        const circleRadius = 40;
        const circleSpeed = 2;
        this.x = this.patrolOriginX + Math.cos(this.movementTimer * circleSpeed) * circleRadius;
        this.y = this.gridPosition.y + Math.sin(this.movementTimer * circleSpeed) * circleRadius;
        break;
        
      case MovementPattern.PATROL:
        // Side to side patrol
        this.x = this.patrolOriginX + Math.sin(this.movementTimer * this.patrolSpeed / 100) * this.patrolDistance;
        break;
        
      case MovementPattern.RETURN_TO_GRID:
        // Return to formation position
        const gridDx = this.gridPosition.x - this.x;
        const gridDy = this.gridPosition.y - this.y;
        const gridDistance = Math.sqrt(gridDx * gridDx + gridDy * gridDy);
        
        if (gridDistance < 5) {
          // Back in formation
          this.x = this.gridPosition.x;
          this.y = this.gridPosition.y;
          this.setMovementPattern(MovementPattern.GRID);
        } else {
          // Move toward formation position
          const returnSpeed = this.returnSpeed * deltaTime;
          const ratio = returnSpeed / gridDistance;
          this.x += gridDx * ratio;
          this.y += gridDy * ratio;
        }
        break;
    }
  }
  
  /**
   * Set a new movement pattern
   */
  public setMovementPattern(pattern: MovementPattern, pathPoints?: {x: number, y: number}[]): void {
    this.movementPattern = pattern;
    this.pathIndex = 0;
    
    if (pattern === MovementPattern.DIVE && pathPoints) {
      this.pathPoints = pathPoints;
    }
  }
  
  /**
   * Create a dive attack path
   */
  public createDivePath(playerX: number): {x: number, y: number}[] {
    const startX = this.x;
    const startY = this.y;
    const points: {x: number, y: number}[] = [];
    
    // Create a curve path for diving
    const controlPoint1X = startX + (Math.random() * 100 - 50);
    const controlPoint1Y = startY + 100;
    const controlPoint2X = playerX + (Math.random() * 80 - 40);
    const controlPoint2Y = this.screenHeight - 100;
    const endX = Math.random() * this.screenWidth;
    const endY = -50; // Off screen at the top
    
    // Generate points along a bezier curve
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      
      // Cubic bezier formula
      const x = u*u*u*startX + 3*u*u*t*controlPoint1X + 3*u*t*t*controlPoint2X + t*t*t*endX;
      const y = u*u*u*startY + 3*u*u*t*controlPoint1Y + 3*u*t*t*controlPoint2Y + t*t*t*endY;
      
      points.push({x, y});
    }
    
    return points;
  }
  
  /**
   * Attempt to fire a projectile
   */
  private attemptFiring(): void {
    if (!this.firingEnabled || this.state !== EnemyState.ACTIVE) return;
    
    const now = performance.now() / 1000;
    if (now - this.lastFireTime < this.fireRate) return;
    
    // Random chance to fire, higher for dive attacks
    const firingChance = this.movementPattern === MovementPattern.DIVE ? 0.8 : 0.2;
    if (Math.random() > firingChance) return;
    
    this.lastFireTime = now;
    
    // Create a new projectile
    const projectile = new Projectile(
      this.x + this.width / 2 - 3,
      this.y + this.height,
      6,
      10,
      0,
      150, // Vertical velocity downward
      '#990000', // Blood red
      true // Is enemy projectile
    );
    
    this.projectiles.push(projectile);
    this.soundEngine.playSound(SoundEffect.ENEMY_SHOOT);
  }
  
  /**
   * Draw the enemy
   */
  public draw(renderer: Renderer): void {
    if (!this.active) return;
    
    if (this.state === EnemyState.EXPLODING) {
      // Smaller red pixel explosion of blood
      const explosionProgress = this.explosionTimer / this.explosionDuration;
      const centerX = Math.floor(this.x + this.width / 2);
      const centerY = Math.floor(this.y + this.height / 2);
      
      // Blood colors - different shades of red
      const bloodColors = ['#FF0000', '#CC0000', '#990000', '#660000', '#880000'];
      
      // Draw blood pixel explosion - smaller and more concentrated than the generic explosion
      const maxParticles = 20; // Fewer particles for a smaller effect
      
      for (let i = 0; i < maxParticles; i++) {
        // Calculate position with slight randomness
        const angle = (Math.PI * 2 * i / maxParticles) + (explosionProgress * Math.PI * 0.5);
        // Smaller distance for a more concentrated effect
        const distance = 25 * explosionProgress;
        
        // Add slight randomness to distance for more natural look
        const randomOffset = Math.sin(i * 7.3) * 3;
        const particleX = centerX + Math.floor(Math.cos(angle) * (distance + randomOffset));
        const particleY = centerY + Math.floor(Math.sin(angle) * (distance + randomOffset));
        
        // Smaller pixel size for blood droplets
        const pixelSize = Math.max(1, Math.floor(3 * (1 - explosionProgress)));
        
        // Random blood color
        const colorIndex = Math.floor(Math.random() * bloodColors.length);
        
        // Draw blood pixel
        renderer.fillRect(
          particleX,
          particleY,
          pixelSize,
          pixelSize,
          bloodColors[colorIndex]
        );
      }
      
      // Add blood splatter effect - smaller droplets
      if (explosionProgress < 0.7) {
        // Central blood splash
        renderer.fillRect(
          centerX - 3,
          centerY - 3,
          6,
          6,
          '#990000' // Dark red for central splash
        );
        
        // Random blood droplets
        const dropletCount = 12;
        for (let i = 0; i < dropletCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 15 * explosionProgress;
          
          const dropletX = centerX + Math.cos(angle) * distance;
          const dropletY = centerY + Math.sin(angle) * distance;
          
          // Random droplet size (1-2 pixels)
          const dropletSize = Math.floor(Math.random() * 2) + 1;
          
          // Random blood color
          const colorIndex = Math.floor(Math.random() * bloodColors.length);
          
          // Draw blood droplet
          renderer.fillRect(
            dropletX,
            dropletY,
            dropletSize,
            dropletSize,
            bloodColors[colorIndex]
          );
        }
      }
    } else if (this.state === EnemyState.TRANSFORMING) {
      // Draw transformation animation
      const progress = this.transformationTimer / this.transformationDuration;
      
      // Pulsating glow effect
      const glowSize = this.width * (0.8 + Math.sin(progress * Math.PI * 6) * 0.3);
      
      renderer.fillCircle(
        this.x + this.width / 2,
        this.y + this.height / 2,
        glowSize / 2,
        `rgba(153, 0, 0, ${0.7 - progress * 0.3})`
      );
      
      // Draw morphing shape
      this.drawEnemy(renderer, progress);
    } else {
      // Draw the enemy with hit animation if active
      if (this.isShowingHitAnimation) {
        this.drawEnemyHitAnimation(renderer);
      } else {
        this.drawEnemy(renderer);
      }
    }
    
    // Draw projectiles
    for (const projectile of this.projectiles) {
      projectile.draw(renderer);
    }
  }
  
  /**
   * Draw enemy hit animation (bloody splatter effect)
   */
  private drawEnemyHitAnimation(renderer: Renderer): void {
    // First draw the normal enemy
    this.drawEnemy(renderer);
    
    // Then overlay the hit effect - pixelated blood splatter
    const centerX = Math.floor(this.x + this.width / 2);
    const centerY = Math.floor(this.y + this.height / 2);
    
    // Blood colors
    const bloodColors = ['#FF0000', '#990000', '#660000', '#CC0000'];
    
    // Draw blood pixels
    const hitProgress = this.hitAnimationTimer / this.hitAnimationDuration;
    const maxSplatter = 12;
    
    for (let i = 0; i < maxSplatter; i++) {
      // Calculate random positions for blood pixels
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.width * 0.6;
      
      const pixelX = centerX + Math.cos(angle) * distance;
      const pixelY = centerY + Math.sin(angle) * distance;
      
      // Random blood pixel size (1-3 pixels)
      const pixelSize = Math.floor(Math.random() * 3) + 1;
      
      // Random blood color
      const colorIndex = Math.floor(Math.random() * bloodColors.length);
      
      // Draw blood pixel
      renderer.fillRect(
        pixelX,
        pixelY,
        pixelSize,
        pixelSize,
        bloodColors[colorIndex]
      );
    }
    
    // Flash the enemy red
    const flashOpacity = 0.7 * (1 - hitProgress);
    renderer.fillRect(
      this.x,
      this.y,
      this.width,
      this.height,
      `rgba(255, 0, 0, ${flashOpacity})`
    );
  }
  
  /**
   * Draw the enemy based on its type
   */
  private drawEnemy(renderer: Renderer, transformProgress?: number): void {
    const frame = this.animationFrame;
    
    switch (this.type) {
      case EnemyType.BASIC_VAMPIRE:
        // Basic vampire enemy
        this.drawBasicVampire(renderer, frame);
        break;
        
      case EnemyType.VAMPIRE_BAT:
        // Vampire bat enemy
        this.drawVampireBat(renderer, frame);
        break;
        
      case EnemyType.BLOOD_LORD:
        // Blood lord boss enemy
        this.drawBloodLord(renderer, frame);
        break;
    }
  }
  
  /**
   * Draw the basic vampire enemy
   */
  private drawBasicVampire(renderer: Renderer, frame: number): void {
    // Colors
    const bodyColor = '#990000'; // Dark red
    const capeColor = '#330000'; // Darker red
    const faceColor = '#EEEEEE'; // Pale white
    
    // Body
    renderer.fillRect(this.x + 8, this.y + 6, 8, 14, bodyColor);
    
    // Cape (changes with animation frame)
    if (frame === 0) {
      renderer.fillRect(this.x + 4, this.y + 10, 4, 8, capeColor);
      renderer.fillRect(this.x + 16, this.y + 10, 4, 8, capeColor);
    } else {
      renderer.fillRect(this.x + 2, this.y + 8, 6, 10, capeColor);
      renderer.fillRect(this.x + 16, this.y + 8, 6, 10, capeColor);
    }
    
    // Head
    renderer.fillRect(this.x + 8, this.y + 2, 8, 6, faceColor);
    
    // Eyes
    renderer.fillRect(this.x + 9, this.y + 4, 2, 2, bodyColor);
    renderer.fillRect(this.x + 13, this.y + 4, 2, 2, bodyColor);
  }
  
  /**
   * Draw the vampire bat enemy
   */
  private drawVampireBat(renderer: Renderer, frame: number): void {
    // Colors
    const bodyColor = '#660066'; // Purple for bat
    const wingColor = '#440044'; // Darker purple
    const eyeColor = '#FF0000'; // Red eyes
    
    // Body
    renderer.fillRect(this.x + 10, this.y + 8, 8, 12, bodyColor);
    
    // Wings (changes with animation frame)
    if (frame === 0) {
      // Wings folded
      renderer.fillRect(this.x + 4, this.y + 10, 6, 8, wingColor);
      renderer.fillRect(this.x + 18, this.y + 10, 6, 8, wingColor);
    } else if (frame === 1) {
      // Wings partially extended
      renderer.fillRect(this.x + 2, this.y + 8, 8, 10, wingColor);
      renderer.fillRect(this.x + 18, this.y + 8, 8, 10, wingColor);
    } else {
      // Wings fully extended
      renderer.fillRect(this.x, this.y + 6, 10, 12, wingColor);
      renderer.fillRect(this.x + 18, this.y + 6, 10, 12, wingColor);
    }
    
    // Head
    renderer.fillRect(this.x + 10, this.y + 4, 8, 6, bodyColor);
    
    // Ears
    renderer.fillRect(this.x + 8, this.y, 2, 4, bodyColor);
    renderer.fillRect(this.x + 18, this.y, 2, 4, bodyColor);
    
    // Eyes
    renderer.fillRect(this.x + 11, this.y + 6, 2, 2, eyeColor);
    renderer.fillRect(this.x + 15, this.y + 6, 2, 2, eyeColor);
  }
  
  /**
   * Draw the blood lord boss enemy
   */
  private drawBloodLord(renderer: Renderer, frame: number): void {
    // Colors
    const bodyColor = '#770000'; // Dark red
    const capeColor = '#330000'; // Darker red for cape
    const crownColor = '#DDAA00'; // Gold crown
    const faceColor = '#EEEEEE'; // Pale white face
    const eyeColor = '#FF0000'; // Glowing red eyes
    
    // Cape background (changes with animation)
    if (frame === 0) {
      renderer.fillRect(this.x + 2, this.y + 8, 28, 16, capeColor);
    } else {
      renderer.fillRect(this.x, this.y + 6, 32, 18, capeColor);
    }
    
    // Body
    renderer.fillRect(this.x + 10, this.y + 8, 12, 18, bodyColor);
    
    // Head
    renderer.fillRect(this.x + 10, this.y + 4, 12, 6, faceColor);
    
    // Crown
    renderer.fillRect(this.x + 8, this.y, 16, 4, crownColor);
    renderer.fillRect(this.x + 8, this.y - 2, 2, 2, crownColor);
    renderer.fillRect(this.x + 12, this.y - 2, 2, 2, crownColor);
    renderer.fillRect(this.x + 18, this.y - 2, 2, 2, crownColor);
    renderer.fillRect(this.x + 22, this.y - 2, 2, 2, crownColor);
    
    // Eyes
    renderer.fillRect(this.x + 12, this.y + 6, 2, 2, eyeColor);
    renderer.fillRect(this.x + 18, this.y + 6, 2, 2, eyeColor);
    
    // Health indicator (glow for second hit remaining)
    if (this.health > 1) {
      renderer.fillCircle(
        this.x + this.width / 2,
        this.y + this.height / 2,
        this.width * 0.6,
        `rgba(255, 0, 0, 0.2)`
      );
    }
  }
  
  /**
   * Handle being hit by a projectile
   */
  public hit(): boolean {
    if (this.state !== EnemyState.ACTIVE) {
      return false;
    }
    
    this.health--;
    
    if (this.health <= 0) {
      // Enemy destroyed
      this.state = EnemyState.EXPLODING;
      this.explosionTimer = 0;
      this.soundEngine.playSound(
        this.type === EnemyType.BLOOD_LORD
          ? SoundEffect.BOSS_EXPLOSION
          : SoundEffect.ENEMY_EXPLOSION
      );
      return true;
    } else {
      // Enemy hit but not destroyed - show hit animation
      this.isShowingHitAnimation = true;
      this.hitAnimationTimer = 0;
      this.soundEngine.playSound(SoundEffect.ENEMY_SHOOT); // Reuse sound for hit effect
    }
    
    return false;
  }
  
  /**
   * Start transformation
   */
  public transform(): void {
    if (this.state !== EnemyState.ACTIVE) {
      return;
    }
    
    this.state = EnemyState.TRANSFORMING;
    this.transformationTimer = 0;
    this.soundEngine.playSound(SoundEffect.VAMPIRE_TRANSFORM);
  }
  
  /**
   * Complete transformation
   */
  private completeTransformation(): void {
    // Upgrade to next type
    if (this.type === EnemyType.BASIC_VAMPIRE) {
      this.type = EnemyType.VAMPIRE_BAT;
    } else if (this.type === EnemyType.VAMPIRE_BAT) {
      this.type = EnemyType.BLOOD_LORD;
    }
    
    // Reset state to active
    this.state = EnemyState.ACTIVE;
    
    // Update properties based on new type
    this.setupType();
  }
  
  /**
   * Start capturing sequence
   */
  public startCapture(playerPosition: {x: number, y: number}): void {
    if (this.state !== EnemyState.ACTIVE || this.type !== EnemyType.BLOOD_LORD) {
      return;
    }
    
    this.state = EnemyState.CAPTURING;
    this.targetPlayer = playerPosition;
    this.soundEngine.playSound(SoundEffect.VAMPIRE_CAPTURE);
  }
  
  /**
   * Get the collision rectangle
   * Implements Collidable interface
   */
  public getCollisionRect(): Rect {
    // Smaller collision area than visual size
    return {
      x: this.x + 4,
      y: this.y + 4,
      width: this.width - 8,
      height: this.height - 8
    };
  }
  
  /**
   * Check if the enemy is active
   * Implements Collidable interface
   */
  public isActive(): boolean {
    return this.active;
  }
  
  /**
   * Get enemy points value
   */
  public getPoints(): number {
    return this.points;
  }
  
  /**
   * Get enemy projectiles
   */
  public getProjectiles(): Projectile[] {
    return this.projectiles;
  }
  
  /**
   * Get enemy type
   */
  public getType(): EnemyType {
    return this.type;
  }
  
  /**
   * Get enemy state
   */
  public getState(): EnemyState {
    return this.state;
  }
  
  /**
   * Get enemy position
   */
  public getPosition(): { x: number, y: number } {
    return { x: this.x, y: this.y };
  }
  
  /**
   * Get grid position
   */
  public getGridPosition(): EnemyFormationPosition {
    return this.gridPosition;
  }
  
  /**
   * Set grid position
   */
  public setGridPosition(position: EnemyFormationPosition): void {
    this.gridPosition = position;
  }
}