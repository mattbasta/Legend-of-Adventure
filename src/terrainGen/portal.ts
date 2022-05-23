import { Entity } from "../types";

export class Portal {
  x: number;
  y: number;
  width: number;
  height: number;
  destX: number;
  destY: number;

  target: string;

  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    destination: string,
    destX: number,
    destY: number
  ) {
    this.x = x | 0;
    this.y = y | 0;
    this.width = w | 0;
    this.height = h | 0;
    this.target = destination;
    this.destX = destX;
    this.destY = destY;
  }

  offset(x: number, y: number) {
    return new Portal(
      x + this.x,
      y + this.y,
      this.width,
      this.height,
      this.target,
      this.destX,
      this.destY
    );
  }

  collidingWithEntity({ x, y, width, height }: Entity) {
    return (
      x + width >= this.x &&
      this.x + this.width >= x &&
      y >= this.y &&
      this.y + this.height >= y - height
    );
  }

  serialize() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      target: this.target,
    };
  }
  toString() {
    return JSON.stringify(this.serialize());
  }
}
