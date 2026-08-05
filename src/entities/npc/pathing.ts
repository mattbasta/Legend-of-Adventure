import type { RNG } from "../../rng.ts";
import type { Hitmap } from "../../terrain.ts";

/**
 * The eight movement directions, in the order the behavior scripts have
 * always used (index 0 = east, going counter-clockwise). Hook results and
 * `getDirectionToBestTile` speak in indices into this table.
 */
export const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

function directionIndex(dirX: number, dirY: number): number {
  return DIRECTIONS.findIndex(([x, y]) => x === dirX && y === dirY);
}

export function distanceFromCoords(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.hypot(x1 - x2, y1 - y2);
}

interface PathingHost {
  rng: RNG;
  getHitmap(): Hitmap;
  getEntityPosition(eid: string): readonly [number, number] | null;
}

/**
 * Vector-field pathing, ported from legacy/entities/pathing.go.
 *
 * Each decision cycle the entity stages the walkable neighboring tiles, adds
 * attractors (chase targets) and repellers (threats), and asks for the best
 * direction: repelled directions are culled, attractor/repeller directions
 * are summed into a preferred heading, and a random viable direction breaks
 * ties. (A* / pathToBestTile arrives with the town NPCs.)
 */
export class PathingHelper {
  private stageX = 0;
  private stageY = 0;
  private directionStage: Array<readonly [number, number]> = [];
  private repulseDirections: Array<readonly [number, number]> = [];
  private attractDirections: Array<readonly [number, number]> = [];
  private repulseCoords: Array<readonly [number, number]> = [];
  private attractCoords: Array<readonly [number, number]> = [];

  private readonly host: PathingHost;

  constructor(host: PathingHost) {
    this.host = host;
  }

  isDirectionOk(
    x: number,
    y: number,
    w: number,
    h: number,
    dirX: number,
    dirY: number,
  ): boolean {
    return this.host.getHitmap().fits(x + dirX, y + dirY, w, h);
  }

  stageAvailableTiles(x: number, y: number, w: number, h: number) {
    this.stageX = x;
    this.stageY = y;

    const hitmap = this.host.getHitmap();
    const dirStage: Array<readonly [number, number]> = [];
    for (let i = y - 1; i <= y + 1; i++) {
      for (let j = x - 1; j <= x + 1; j++) {
        if (i === y && j === x) {
          continue;
        }
        if (!hitmap.fits(j, i, w, h)) {
          continue;
        }
        dirStage.push([Math.round(j - x), Math.round(i - y)]);
      }
    }

    this.directionStage = dirStage;
    this.repulseDirections = [];
    this.attractDirections = [];
    this.repulseCoords = [];
    this.attractCoords = [];
  }

  /**
   * Buckets the angle from the staged position to (x, y) into one of the
   * eight directions. The thresholds use the Go original's integer divisions
   * (45/2 == 22, not 22.5) to keep decisions identical.
   */
  private calculateDirection(x: number, y: number): readonly [number, number] {
    const angle =
      Math.atan2(y - this.stageY, x - this.stageX) * (-180 / Math.PI);

    let xDir = 0;
    if (Math.abs(angle) > 90 + 22) {
      xDir = -1;
    } else if (Math.abs(angle) < 90 - 22) {
      xDir = 1;
    }

    let yDir = 0;
    if (angle > 22 && angle < 180 - 22) {
      yDir = -1;
    } else if (angle < -11 && angle > -180 + 22) {
      yDir = 1;
    }

    return [xDir, yDir];
  }

  clearStagedPath() {
    // Path memory arrives with A*; nothing to clear yet.
  }

  stageRepeller(eid: string) {
    const pos = this.host.getEntityPosition(eid);
    if (!pos) {
      return;
    }
    this.repulseDirections.push(this.calculateDirection(pos[0], pos[1]));
    this.repulseCoords.push(pos);
  }

  stageAttractor(eid: string) {
    const pos = this.host.getEntityPosition(eid);
    if (!pos) {
      return;
    }
    this.attractDirections.push(this.calculateDirection(pos[0], pos[1]));
    this.attractCoords.push(pos);
  }

  stageRepellerCoord(x: number, y: number) {
    this.repulseDirections.push(this.calculateDirection(x, y));
    this.repulseCoords.push([x, y]);
  }

  stageAttractorCoord(x: number, y: number) {
    this.attractDirections.push(this.calculateDirection(x, y));
    this.attractCoords.push([x, y]);
  }

  getDirectionToBestTile(): number | null {
    if (this.directionStage.length === 0) {
      return null;
    }

    let tempDirs = this.directionStage;

    // If there are any repellers, try removing them from the list of
    // available directions.
    if (this.repulseDirections.length > 0) {
      tempDirs = [...this.directionStage];
      for (const dir of this.repulseDirections) {
        for (let i = 0; i < tempDirs.length; i++) {
          const candidate = tempDirs[i]!;
          if (candidate[0] !== dir[0] || candidate[1] !== dir[1]) {
            continue;
          }
          tempDirs.splice(i, 1);
          break;
        }
      }
      if (tempDirs.length === 0) {
        // Fleeing results in no usable directions; fall back to all.
        tempDirs = this.directionStage;
      }
    }

    if (tempDirs.length === 0) {
      return null;
    }
    if (tempDirs.length === 1) {
      const only = tempDirs[0]!;
      return directionIndex(only[0], only[1]);
    }

    // Sum attractors minus repellers into a preferred heading.
    let xSum = 0;
    let ySum = 0;
    for (const dir of this.attractDirections) {
      xSum += dir[0];
      ySum += dir[1];
    }
    for (const dir of this.repulseDirections) {
      xSum -= dir[0];
      ySum -= dir[1];
    }
    xSum = Math.max(-1, Math.min(1, xSum));
    ySum = Math.max(-1, Math.min(1, ySum));

    for (const dir of tempDirs) {
      if (dir[0] === xSum && dir[1] === ySum) {
        return directionIndex(dir[0], dir[1]);
      }
    }

    const random = tempDirs[(this.host.rng.uniform() * tempDirs.length) | 0]!;
    return directionIndex(random[0], random[1]);
  }
}
