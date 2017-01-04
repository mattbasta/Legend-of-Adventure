const BaseEntity = require('./baseEntity');
const constants = require('./constants');
const events = require('../events');


const ITEM_PICK_UP_DIST = 0.5;

module.exports = class ItemEntity extends BaseEntity {
  constructor(itemCode, dropper) {
    super(
      'item',
      dropper.region,
      dropper.x + dropper.dirX,
      dropper.y + dropper.dirY
    );

    this.itemCode = itemCode;
    this.dropperEID = dropper.eid;

    this.height = 0.45;
    this.width = 0.45;
  }

  onEvent(event) {
    switch (event.type) {
      case events.ENTITY_UPDATE:
        const entity = event.origin;
        if (!entity || !entity.inventory) {
          return;
        }

        const [x, y] = event.body.split('\n')[1].split(' ').map(x => parseFloat(x));
        const dist = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
        if (dist > ITEM_PICK_UP_DIST) {
          return;
        }

        const [given, ] = entity.inventory.give(this.itemCode);
        if (given) {
          this.region.removeEntity(this);
        }
    }
  }

  getClipping() {
    const clip = {
      height: this.height * 50,
      width: this.width * 50,
    };
    if (this.itemCode[0] === 'w') {
      const weaponData = this.itemCode.substr(1).split('.');
      clip.x = constants.WEAPON_PREFIXES[weaponData[1]] * 24 + (5 * 24);
      clip.y = constants.WEAPONS[weaponData[0]] * 24;
    } else {
      const code = parseInt(this.itemCode.substr(1), 10);
      clip.x = code % 5 * 24;
      clip.y = (code / 5 | 0) * 24;
      if (this.itemCode[0] === 'p') {
        clip.y += 5 * 24;
      }
    }

    return clip;
  }

  getMetadata() {
    return {
      proto: 'item',
      code: this.itemCode,
      clip: this.getClipping(),
    };
  }
};
