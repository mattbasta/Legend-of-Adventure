const BaseEntity = require('./entities/BaseEntity');
const cheats = require('./cheats');
const entity = require('./entity');
const events = require('./events');
const Inventory = require('./inventory');
const regions = require('./regions');
const terrain = require('./terrain');


const MAX_HEALTH = 100;
const PLAYER_INVENTORY_SIZE = 5;
const PLAYER_SPEED = 0.0075;


exports.Player = class Player extends BaseEntity {
  constructor(connection) {
    super('player');

    this.ws = connection;

    connection.on('message', this.onMessage.bind(this));
    connection.on('close', this.onClose.bind(this));

    this.send('haldo');

    this.name = 'Player';
    this.health = MAX_HEALTH;
    this.lastUpdate = Date.now();

    this.effectTTL = 0;
    this.movementEffect = null;

    this.godMode = false;

    this.region = regions.getRegion(
      terrain.WORLD_OVERWORLD,
      terrain.REGIONTYPE_FIELD,
      0,
      0
    );
    this.coordStack = [[this.x, this.y]];

    this.inventory = new Inventory(this, PLAYER_INVENTORY_SIZE);
    this.inventory.give('wsw.sharp.12');
    this.inventory.give('f5');
    this.inventory.give('f5');

    this.region.addEntity(this);
    this.send(`lev${this.region}`);
  }

  onMessage(message) {
    if (!message) {
      return;
    }
    // console.log('> ' + message)

    const split = message.split(/\s/g);
    switch (split[0]) {
      case 'cyc': // cycle inventory
        this.inventory.cycle(split[1]);
        return;

      case 'cha': // chat
        if (cheats.handleCheat(split[1], this)) {
          return;
        }
        this.region.broadcast(
          new events.Event(events.CHAT, `${this.x} ${this.y}\n${split[1]}`, this)
        );
        return;

      case 'loc':
        const posData = split[1].split(':');
        if (posData.length < 4) {
          return;
        }
        // TODO: do more cheat testing here
        const newX = parseFloat(posData[0]);
        const newY = parseFloat(posData[1]);
        if (isNaN(newX) || isNaN(newY)) {
          return;
        }

        if (
          newX < 0 ||
          newX > this.region.terrain.width ||
          newY < 0 ||
          newY > this.region.terrain.height
        ) {
          console.error('User attempted to exceed bounds of the level');
          return;
        }

        const velX = parseFloat(posData[2]);
        const velY = parseFloat(posData[3]);
        if (isNaN(velX) || isNaN(velY)) {
          return;
        }
        if (velX < -1 || velX > 1 || velY > 1 || velX > 1) {
          console.error('User attempted to go faster than possible');
          return;
        }

        const dirX = parseFloat(posData[4]);
        const dirY = parseFloat(posData[5]);
        if (isNaN(dirX) || isNaN(dirY)) {
          return;
        }
        if (dirX < -1 || dirX > 1 || dirY > 1 || dirX > 1) {
          console.error('User attempted to face invalid direction');
          return;
        }

        this.x = newX;
        this.y = newY;
        this.velX = velX;
        this.velY = velY;
        this.dirX = dirX;
        this.dirY = dirY;

        this.lastUpdate = Date.now();

        this.region.broadcast(
          new events.Event(
            events.ENTITY_UPDATE,
            `${JSON.stringify({
              x: this.x,
              y: this.y,
              velocity: [this.velX, this.velY],
              direction: [this.dirX, this.dirY],
            })}\n${this.x} ${this.y}`
          )
        );

        break;

      case 'use':
        const slot = parseInt(split[1], 10);
        if (isNaN(slot)) {
          return;
        }
        this.inventory.use(slot, this);
        return;

      case 'dro':
        this.inventory.drop(this);
        return;

      case 'lev':
        const pos = split[1].split(':');
        const x = parseFloat(pos[0]);
        const y = parseFloat(pos[1]);
        const iXPos = this.region.x - x;
        const iYPos = this.region.y - y;
        if (iYPos > 1 || iYPos < -1 || iXPos > 1 || iXPos < -1 || iXPos && iYPos) {
          return;
        }

        // console.log(`${this.eid} sliding to ${x}:${y}`);
        this.sendToLocation(
          this.region.parentID,
          this.region.type,
          x,
          y,
          this.x,
          this.y
        );
        return;
    }
  }

  onClose() {
    this.region.removeEntity(this);
  }

  onEvent(event) {
    switch (event.type) {
      case events.DEATH:
        this.send(`delevt:${event.origin}\n${event.origin}`);
        return;
      case events.DIRECT_ATTACK:
        const [x, y] = event.body.split(' ').slice(0, 2).map(x => parseFloat(x));

        const AWR = entity.ATTACK_WIGGLE_ROOM;
        if (
          x < this.x - AWR ||
          x > this.x + this.width + AWR ||
          y < this.y - this.height - AWR ||
          y > this.y + AWR
        ) {
          return;
        }

        // TODO: Figure out how to calculate this
        const damage = 10;

        this.incrementHealth(-1 * damage);

        this.onEvent(
          new events.Event(events.PARTICLE_MACRO, '0.5 0 bloodspatter 5 local', null)
        );
        this.region.broadcast(
          new events.Event(events.PARTICLE_MACRO, `0.5 0 bloodspatter 5 ${this.eid}`, this)
        );
        return;
    }

    this.send(event.toString());
  }

  send(data) {
    this.ws.send(data);
  }

  tick() {
    super.tick();

    if (!this.region) {
      return;
    }

    const now = Date.now();
    const delta = (now - this.lastUpdate) / 1000;

    if (this.velX || this.velY) {
      let {velX, velY} = this;
      if (velX && velY) {
        velX *= Math.SQRT1_2;
        velY *= Math.SQRT1_2;
      }

      this.x += velX * PLAYER_SPEED * delta;
      this.y += velY * PLAYER_SPEED * delta;

      this.lastUpdate = now;
    }

    if (this.godMode && (Math.random() * 3 | 0) === 0) {
      this.onEvent(
        new events.Event(
          events.PARTICLE_MACRO,
          '0.5 -0.5 godmode 3 local',
          null
        )
      );
      this.region.broadcast(
        new events.Event(
          events.PARTICLE_MACRO,
          `0.5 -0.5 godmode 3 ${this.eid}`,
          this
        )
      );
    }

    for (let portal of this.region.terrain.portals) {
      if (!entity.isEntityCollidingWithPortal(portal, this)) {
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
        target = this.region.id + ':' + target;
        this.coordStack.push(currentCoords);
      }

      this.sendToLocation(...regions.getRegionData(target), destX, destY);
      break;
    }

    if (this.effectTTL) {
      this.effectTTL -= 1;
      if (!this.effectTTL) {
        this.onEvent(events.EFFECT_CLEAR, '', null);
      }
    }
  }

  setEffect(effect, ttl) {
    this.effectTTL = ttl;
    this.onEvent(new events.Event(events.EFFECT, effect, null));
  }

  sendToLocation(parentID, type, x, y, newX, newY) {
    const oldRegion = this.region;
    super.sendToLocation(parentID, type, x, y, newX, newY);

    if (this.region === oldRegion) {
      this.send(`epuevt:local\n${JSON.stringify({x: this.x, y: this.y})}`);
      return;
    }

    this.send('flv');
    this.send(`epuevt:local\n${JSON.stringify({x: this.x, y: this.y})}`);
    this.send(`lev${this.region.toString()}`);
  }
  incrementHealth(amount) {
    const newHealth = this.health + amount;
    if (newHealth > MAX_HEALTH) {
      this.health = MAX_HEALTH;
    } else if (newHealth <= 0) {
      this.health = 0;
      if (!this.godMode) {
        this.death();
      }
    } else {
      if (newHealth < this.health) {
        this.send(`sndhit_grunt${Math.random() * 3 | 0}:${this.x}:${this.y}`);
      }
      this.health = newHealth;
    }
    this.send(`hea${this.health}`);
  }
  death() {
    this.region.broadcast(
      new events.Event(events.EVENT_PARTICLE_MACRO, `${this.x} ${this.y} deathFlake 25`, this)
    );

    while (this.inventory.numItems()) {
      this.inventory.drop();
    }

    this.sendToLocation(terrain.WORLD_OVERWORLD, terrain.REGIONTYPE_FIELD, 0, 0, 50, 50);
    this.health = MAX_HEALTH;
    this.send('dea');
  }

  isAtMaxHealth() {
    return this.health === MAX_HEALTH;
  }
  updateInventory() {
    const inv = this.inventory;
    this.send(`inv${inv.slots.map((x, i) => `${i}:${x}:${inv.counts[i]}`).join('\n')}`);
  }

  getMetadata() {
    return {
      nametag: this.name,
    };
  }

};
