const events = require('../events');

let eid = 0;


module.exports = class BaseEntity {
  constructor(type, region = null, x = 0, y = 0) {
    this.type = type;
    this.eid = `e${eid++}`;
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

  tick() {
    if (!this.region) {
      return;
    }
  }

  sendToLocation(parentID, type, x, y, newX, newY) {
    const newRegion = require('../regions').getRegion(parentID, type, x, y);
    this.x = newX;
    this.y = newY;

    if (newRegion === this.region) {
      this.region.broadcast(
        new events.Event(
          events.ENTITY_UPDATE,
          `${this}\n${this.x} ${this.y}`,
          this
        )
      );
      return;
    }

    if (!newRegion) {
      console.error('Requested region that does not exist', parentID, type, x);
      return;
    }

    if (this.region) {
      this.region.removeEntity(this);
    }

    this.region = newRegion;
    newRegion.addEntity(this);
  }

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
          velocity: [this.velX, this.velY],
          direction: [this.dirX, this.dirY],
          height: this.height,
          width: this.width,
        },
        this.getMetadata()
      )
    );
  }
};
