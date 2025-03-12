/**
 * Collision Detection Module
 * Handles collision detection between game objects
 */

// Basic rectangle for collision detection
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Object with collision properties
export interface Collidable {
  getCollisionRect(): Rect;
  isActive(): boolean;
}

export class CollisionSystem {
  /**
   * Check if two rectangles are colliding
   */
  public static rectIntersect(rect1: Rect, rect2: Rect): boolean {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  /**
   * Check if a point is inside a rectangle
   */
  public static pointInRect(x: number, y: number, rect: Rect): boolean {
    return (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    );
  }

  /**
   * Check if two circles are colliding
   */
  public static circleIntersect(
    x1: number, y1: number, r1: number,
    x2: number, y2: number, r2: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < r1 + r2;
  }

  /**
   * Calculate distance between two points
   */
  public static distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Detect collisions between an object and an array of objects
   * Returns array of objects that collided with the first object
   */
  public static detectCollisions<T extends Collidable>(
    object: Collidable,
    objects: T[]
  ): T[] {
    if (!object.isActive()) return [];

    const rect1 = object.getCollisionRect();
    const collisions: T[] = [];

    for (const target of objects) {
      if (!target.isActive()) continue;
      if (object === target) continue;

      const rect2 = target.getCollisionRect();
      if (this.rectIntersect(rect1, rect2)) {
        collisions.push(target);
      }
    }

    return collisions;
  }

  /**
   * Detect collisions between two groups of objects
   * Returns a Map where keys are objects from group1 that had collisions
   * and values are arrays of objects from group2 that they collided with
   */
  public static detectGroupCollisions<T1 extends Collidable, T2 extends Collidable>(
    group1: T1[],
    group2: T2[]
  ): Map<T1, T2[]> {
    const collisionMap = new Map<T1, T2[]>();

    for (const obj1 of group1) {
      if (!obj1.isActive()) continue;

      const collisions = this.detectCollisions(obj1, group2);
      if (collisions.length > 0) {
        collisionMap.set(obj1, collisions);
      }
    }

    return collisionMap;
  }

  /**
   * Create a smaller collision rect from a visual rect
   * Useful for making collision detection more forgiving
   */
  public static createReducedRect(rect: Rect, reductionPercentage: number = 0.2): Rect {
    const widthReduction = rect.width * reductionPercentage;
    const heightReduction = rect.height * reductionPercentage;
    
    return {
      x: rect.x + widthReduction / 2,
      y: rect.y + heightReduction / 2,
      width: rect.width - widthReduction,
      height: rect.height - heightReduction
    };
  }
}