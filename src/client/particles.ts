const movements: Record<string, (self: ParticleBase) => void> = {
  spiralUp: (self) => {
    var cone = Math.max(self.y - self.origY + 15, 0);
    self.x = Math.sin(self.ticksTillDeath / 3) * (20 - cone) + self.origX + 25;
  },
};

class ParticleBase {
  ticksTillDeath: number;
  diameter: number;
  color: string;

  x: number = 0;
  y: number = 0;
  origX: number = 0;
  origY: number = 0;
  velX: number = 0;
  velY: number = 0;
  accX: number = 0;
  accY: number = 0;

  floor: number | null = null;
  movement: keyof typeof movements | null = null;

  constructor(ticks: number, diameter: number, color: string) {
    this.ticksTillDeath = ticks;
    this.diameter = diameter;
    this.color = color;
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.origX = x;
    this.origY = y;
  }

  tick() {
    this.velX += this.accX;
    this.velY += this.accY;
    this.x += this.velX;
    this.y -= this.velY;

    if (this.floor != null && this.y > this.floor) {
      this.y = this.floor;
      this.velY *= -1;
    }
    if (this.movement) {
      movements[this.movement](this);
    }
    return !--this.ticksTillDeath;
  }

  draw(context: CanvasRenderingContext2D, deltaX: number, deltaY: number) {
    context.fillStyle = this.color;
    context.fillRect(
      deltaX + this.x - this.diameter / 2,
      deltaY + this.y - this.diameter / 2,
      this.diameter,
      this.diameter
    );
  }
}

export class RawParticle extends ParticleBase {}

class BloodSpatter extends ParticleBase {
  constructor() {
    super(25, 5, "red");
    this.velX = (Math.random() - 0.5) * 3;
    this.velY = 7 * Math.random() + 5;
    this.accY = -1;
    this.floor = this.y;
  }
}
class EatFood extends ParticleBase {
  constructor() {
    super(15, 5, "#BDA469");
    this.velX = (Math.random() - 0.5) * 2.5;
    this.velY = 5 * Math.random() + 4;
    this.accY = -1;
    this.floor = this.y;
  }
}
class GodMode extends ParticleBase {
  constructor() {
    super(25, 5, "#F8FF9B");
    this.velX = (Math.random() - 0.5) * 2;
    this.velY = (Math.random() - 0.5) * 2;
  }
}
class ZombieSquish extends BloodSpatter {
  constructor() {
    super();
    this.diameter = 25;
    this.color = "#7DCD77";
  }
}
class DeathWakerSquish extends BloodSpatter {
  constructor() {
    super();
    this.diameter = 25;
    this.color = "#634A21";
  }
}
class DeathFlake extends ParticleBase {
  constructor() {
    super((Math.random() * 10 + 25) | 0, 4, "#222222");
    this.movement = "spiralup";
  }
}

export function macro(command: string) {
  switch (command) {
    case "bloodspatter":
      return new BloodSpatter();
    case "eatfood":
      return new EatFood();
    case "zombiesquish":
      return new ZombieSquish();
    case "deathwakersquish":
      return new DeathWakerSquish();
    case "godmode":
      return new GodMode();
    case "deathflake":
      return new DeathFlake();
    default:
      throw new Error(`Unrecognized macro ${command}`);
  }
}

export type Particle = ParticleBase;
