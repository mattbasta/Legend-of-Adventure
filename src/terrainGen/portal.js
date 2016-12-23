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
};
