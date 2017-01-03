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

    // FIXME: For non-players, this should populate with the full coordstack
    // for the generated entity.
    this.coordStack = [[this.x, this.y]];

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

    for (let portal of this.region.terrain.portals) {
      if (!portal.collidingWithEntity(this)) {
        continue;
      }

      console.log(`${this.eid} in contact with portal`);
      const currentCoords = [this.x, this.y];
      let {destX, destY, target} = portal;

      if (target === '..') {
        target = this.region.parentID;
        [destX, destY] = this.coordStack.pop();
      } else if (target === '.') {
        target = this.region.id;
        this.coordStack.pop();
        this.coordStack.push(currentCoords);
      } else {
        target = this.region.id + ',' + target;
        this.coordStack.push(currentCoords);
      }

      this.sendToLocation(
        ...require('../regions').getRegionData(target),
        destX,
        destY
      );
      break;
    }
  }

  sendToLocation(parentID, type, x, y, newX, newY) {
    const newRegion = require('../regions').getRegion(parentID, type, x, y);

    if (!newRegion) {
      console.error('Requested region that does not exist', parentID, type, x);
      return;
    }

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

    if (this.region) {
      this.region.removeEntity(this);
    }

    this.region = newRegion;
    newRegion.addEntity(this);
  }

  get maxHealth() {
    return 100;
  }

  incrementHealth(amount) {
    const newHealth = this.health + amount;
    if (newHealth > this.maxHealth) {
      this.health = this.maxHealth;
    } else if (newHealth <= 0) {
      this.health = 0;
      if (!this.godMode) {
        this.death();
      }
    } else {
      if (newHealth < this.health) {
        this.region.broadcast(
          new events.Event(
            events.SOUND,
            `grunt${Math.random() * 3 | 0}:${this.x}:${this.y}`
          )
        );
      }
      this.health = newHealth;
    }
  }
  isAtMaxHealth() {
    return this.health === this.maxHealth;
  }
  death() {
    //
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
