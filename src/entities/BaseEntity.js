const entity = require('../entity');


module.exports = class BaseEntity {
  constructor(type, region = null, x = null, y = null) {
    this.type = type;
    this.eid = entity.nextEntityID();
    this.region = region;
    this.x = x;
    this.y = y;
    this.velX = 0;
    this.velY = 0;
    this.dirX = 0;
    this.dirY = 1;

    this.height = 1;
    this.width = 1;
  }
  setLocation(region) {
    this.region = region;
  }
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  onEvent(event) {

  }

  tick() {}

  getMetadata() {
    return null;
  }
  toString() {
    return JSON.stringify(
      Object.assign(
        {
          id: this.eid,
          type: this.type,
          x: this.x,
          y: this.y,
          height: this.height,
          width: this.width,
        },
        this.getMetadata()
      )
    );
  }
};
