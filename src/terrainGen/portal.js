module.exports = class Portal {
  constructor(x, y, w, h, destination, destX, destY) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.target = destination;
    this.destX = destX;
    this.destY = destY;
  }

  offset(x, y) {
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
};
