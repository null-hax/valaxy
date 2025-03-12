/**
 * Enemy Formation Manager
 * Handles the organization and wave patterns of enemies
 */

import { Enemy, EnemyFormationPosition, EnemyType, MovementPattern } from './enemies';
import { SoundEngine } from '../sounds/soundEngine';
import { Renderer } from '../engine/renderer';

// Formation configuration
interface FormationConfig {
  rows: number;
  cols: number;
  rowSpacing: number;
  colSpacing: number;
  startY: number;
  horizontalSpeed: number;
  verticalSpeed: number;
  waveDelay: number;
}

export class FormationManager {
  private enemies: Enemy[] = [];
  private formationGrid: (Enemy | null)[][] = [];
  private activeEnemies: Enemy[] = [];
  
  private formationX: number = 0;
  private formationDirection: number = 1; // 1 for right, -1 for left
  private formationSpeed: number = 30;
  private formationAmplitude: number = 80;
  
  private waveCount: number = 0;
  private diveCooldown: number = 0;
  private diveCooldownTime: number = 3; // seconds between dives
  
  private config: FormationConfig = {
    rows: 5,
    cols: 8,
    rowSpacing: 40,
    colSpacing: 48,
    startY: 80,
    horizontalSpeed: 30,
    verticalSpeed: 0,
    waveDelay: 3
  };
  
  constructor(
    private soundEngine: SoundEngine,
    private screenWidth: number,
    private screenHeight: number
  ) {
    this.formationX = (this.screenWidth - (this.config.cols * this.config.colSpacing)) / 2;
    this.initGrid();
  }
  
  /**
   * Initialize the formation grid
   */
  private initGrid(): void {
    this.formationGrid = [];
    
    for (let row = 0; row < this.config.rows; row++) {
      this.formationGrid[row] = [];
      for (let col = 0; col < this.config.cols; col++) {
        this.formationGrid[row][col] = null;
      }
    }
  }
  
  /**
   * Create a new wave of enemies
   */
  public createWave(): void {
    this.waveCount++;
    this.enemies = [];
    this.activeEnemies = [];
    this.initGrid();
    
    // Create enemy layout based on wave number
    this.createWaveLayout();
    
    // Add all enemies to the active list
    this.activeEnemies = [...this.enemies];
  }
  
  /**
   * Create the enemy layout for the current wave
   */
  private createWaveLayout(): void {
    // Different layouts based on wave number
    if (this.waveCount === 1) {
      this.createBasicLayout();
    } else if (this.waveCount === 2) {
      this.createAdvancedLayout();
    } else {
      this.createChallengeLayout();
    }
  }
  
  /**
   * Create a basic layout (for wave 1) - Easier version
   */
  private createBasicLayout(): void {
    // Top row: Just a couple of Blood Lords for the first level
    this.addEnemy(EnemyType.BLOOD_LORD, 0, 2);
    this.addEnemy(EnemyType.BLOOD_LORD, 0, this.config.cols - 3);
    
    // Middle rows: Fewer Vampire Bats in a pattern
    for (let row = 1; row < 3; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        // Only add bats at even columns for a more sparse formation
        if (col % 2 === 0) {
          this.addEnemy(EnemyType.VAMPIRE_BAT, row, col);
        }
      }
    }
    
    // Bottom rows: Fewer Basic Vampires
    for (let row = 3; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        // Only add vampires at alternating positions
        if ((row + col) % 2 === 0) {
          this.addEnemy(EnemyType.BASIC_VAMPIRE, row, col);
        }
      }
    }
  }
  
  /**
   * Create a more advanced layout (for wave 2)
   */
  private createAdvancedLayout(): void {
    // Top row: More Blood Lords
    for (let col = 1; col < this.config.cols; col += 2) {
      this.addEnemy(EnemyType.BLOOD_LORD, 0, col);
    }
    
    // Form a "V" pattern with Vampire Bats
    for (let row = 1; row < 3; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        if (col === row || col === this.config.cols - row - 1 || 
            col === row + 1 || col === this.config.cols - row - 2) {
          this.addEnemy(EnemyType.VAMPIRE_BAT, row, col);
        }
      }
    }
    
    // Bottom rows: Dense formation of Basic Vampires
    for (let row = 3; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        this.addEnemy(EnemyType.BASIC_VAMPIRE, row, col);
      }
    }
  }
  
  /**
   * Create a challenging layout (for wave 3+)
   */
  private createChallengeLayout(): void {
    // Top row: Many Blood Lords
    for (let col = 0; col < this.config.cols; col++) {
      if (col % 2 === 0) {
        this.addEnemy(EnemyType.BLOOD_LORD, 0, col);
      }
    }
    
    // Middle rows: Alternating pattern of enemies
    for (let row = 1; row < 3; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        const type = (col + row) % 2 === 0 
          ? EnemyType.VAMPIRE_BAT 
          : EnemyType.BLOOD_LORD;
        this.addEnemy(type, row, col);
      }
    }
    
    // Bottom rows: Mix of Basic Vampires and Vampire Bats
    for (let row = 3; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        const type = col % 3 === 0 
          ? EnemyType.VAMPIRE_BAT 
          : EnemyType.BASIC_VAMPIRE;
        this.addEnemy(type, row, col);
      }
    }
  }
  
  /**
   * Add an enemy to the formation
   */
  private addEnemy(type: EnemyType, row: number, col: number): void {
    const x = this.formationX + col * this.config.colSpacing;
    const y = this.config.startY + row * this.config.rowSpacing;
    
    const formationPosition: EnemyFormationPosition = {
      x,
      y,
      row,
      col
    };
    
    const enemy = new Enemy(
      type,
      formationPosition,
      this.soundEngine,
      this.screenWidth,
      this.screenHeight
    );
    
    this.enemies.push(enemy);
    this.formationGrid[row][col] = enemy;
  }
  
  /**
   * Update the formation
   */
  public update(deltaTime: number, playerPosition: {x: number, y: number}): void {
    this.updateFormationPosition(deltaTime);
    this.updateEnemies(deltaTime, playerPosition);
    this.updateDivingEnemies(deltaTime);
    
    // Remove inactive enemies
    this.activeEnemies = this.activeEnemies.filter(enemy => enemy.isActive());
  }
  
  /**
   * Update the overall formation position
   */
  private updateFormationPosition(deltaTime: number): void {
    // Update formation movement
    this.formationX += this.formationDirection * this.formationSpeed * deltaTime;
    
    // Check boundaries and reverse direction if needed
    const rightEdge = this.formationX + this.config.cols * this.config.colSpacing;
    const leftEdge = this.formationX;
    
    const rightMargin = 40;
    const leftMargin = 40;
    
    if (rightEdge > this.screenWidth - rightMargin) {
      this.formationX = this.screenWidth - rightMargin - this.config.cols * this.config.colSpacing;
      this.formationDirection = -1;
    } else if (leftEdge < leftMargin) {
      this.formationX = leftMargin;
      this.formationDirection = 1;
    }
    
    // Update grid positions for all enemies in formation
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.cols; col++) {
        const enemy = this.formationGrid[row][col];
        if (enemy && enemy.getState() === 0) { // Only update if in active grid state
          const formationPosition = enemy.getGridPosition();
          formationPosition.x = this.formationX + col * this.config.colSpacing;
          enemy.setGridPosition(formationPosition);
        }
      }
    }
    
    // Update dive cooldown
    if (this.diveCooldown > 0) {
      this.diveCooldown -= deltaTime;
    }
  }
  
  /**
   * Update all enemies
   */
  private updateEnemies(deltaTime: number, playerPosition: {x: number, y: number}): void {
    for (const enemy of this.activeEnemies) {
      enemy.update(deltaTime, playerPosition);
    }
    
    // Trigger new dive attacks if cooldown is ready
    if (this.diveCooldown <= 0 && this.activeEnemies.length > 0) {
      this.triggerDiveAttack(playerPosition.x);
    }
  }
  
  /**
   * Update diving enemies
   */
  private updateDivingEnemies(deltaTime: number): void {
    // Diving enemies are handled in their own update method
  }
  
  /**
   * Trigger a new dive attack from the formation
   */
  private triggerDiveAttack(playerX: number): void {
    // Reset cooldown
    this.diveCooldown = this.diveCooldownTime;
    
    // Determine how many enemies should dive
    let divingEnemies = 1;
    
    // Higher waves get more diving enemies
    if (this.waveCount >= 2) divingEnemies = 2;
    if (this.waveCount >= 3) divingEnemies = 3;
    
    // Find eligible enemies to dive (prefer higher-row enemies first)
    const eligibleEnemies: Enemy[] = [];
    
    // Start from the bottom of the formation
    for (let row = this.config.rows - 1; row >= 0; row--) {
      for (let col = 0; col < this.config.cols; col++) {
        const enemy = this.formationGrid[row][col];
        if (enemy && enemy.isActive()) {
          eligibleEnemies.push(enemy);
        }
      }
      
      // If we have enough eligible enemies from this row, stop looking
      if (eligibleEnemies.length >= divingEnemies * 2) {
        break;
      }
    }
    
    // Shuffle the eligible enemies
    for (let i = eligibleEnemies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligibleEnemies[i], eligibleEnemies[j]] = [eligibleEnemies[j], eligibleEnemies[i]];
    }
    
    // Take only the number we need
    const selectedEnemies = eligibleEnemies.slice(0, divingEnemies);
    
    // Make them dive
    for (const enemy of selectedEnemies) {
      const divePath = enemy.createDivePath(playerX);
      enemy.setMovementPattern(MovementPattern.DIVE, divePath);
      
      // Remove from formation grid
      const pos = enemy.getGridPosition();
      this.formationGrid[pos.row][pos.col] = null;
    }
  }
  
  /**
   * Draw all enemies
   */
  public draw(renderer: Renderer): void {
    for (const enemy of this.activeEnemies) {
      enemy.draw(renderer);
    }
  }
  
  /**
   * Get all active enemies
   */
  public getEnemies(): Enemy[] {
    return this.activeEnemies;
  }
  
  /**
   * Get the number of active enemies
   */
  public getEnemyCount(): number {
    return this.activeEnemies.length;
  }
  
  /**
   * Check if there are no more enemies
   */
  public isWaveCleared(): boolean {
    return this.activeEnemies.length === 0;
  }
  
  /**
   * Get the current wave number
   */
  public getWave(): number {
    return this.waveCount;
  }
}