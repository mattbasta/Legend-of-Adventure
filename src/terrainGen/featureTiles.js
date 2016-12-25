const fs = require('fs');
const path = require('path');

const Portal = require('./portal');
const terrain = require('../terrain');


class FeatureTiles {
  constructor(name, width, height) {
    this.name = name;
    this.height = height;
    this.width = width;

    this.tiles = new Uint16Array(height * width);
    this.hitmap = new terrain.Hitmap(width, height);

    this.portals = new Set();
  }

  populateTiles(tileData) {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        this.tiles[i * this.width + j] = tileData[i][j];
      }
    }
  }

  populateHitmap(hitmapData) {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        if (!hitmapData[i][j]) {
          continue;
        }
        this.hitmap.set(j, i);
      }
    }
  }

  apply(terrain, x, y) {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        terrain.tiles[(i + y) * terrain.width + x + j] = this.tiles[i * this.width + j];
      }
    }

    this.hitmap.apply(terrain.hitmap, x, y);

    for (let portal of this.portals.values()) {
      terrain.portals.add(portal.offset(x, y));
    }
  }
}


const cache = {};

exports.getFeatureTiles = function(name) {
  if (name in cache) {
    return cache[name];
  }

  const prefix = path.normalize(`${__dirname}/../../resources/tilesets`);
  const tileData = fs.readFileSync(`${prefix}/${name}.tiles`, 'utf-8');
  const hitmapData = fs.readFileSync(`${prefix}/${name}.hitmap`, 'utf-8');

  const tilesParsed = tileData.split(/\n/g).reduce((acc, cur) => {
    if (!cur.trim()) {
      return acc;
    }
    acc.push(cur.split(' ').map(x => parseInt(x, 10)));
    return acc;
  }, []);

  const hitmapParsed = tileData.split(/\n/g).reduce((acc, cur) => {
    if (!cur.trim()) {
      return acc;
    }
    acc.push(cur.split(' ').map(x => parseInt(x, 10)));
    return acc;
  }, []);

  const feature = new FeatureTiles(name, tilesParsed[0].length, tilesParsed.length);
  feature.populateTiles(tilesParsed);
  feature.populateHitmap(hitmapParsed);

  const portalPath = `${prefix}/${name}.portals`;
  if (fs.existsSync(portalPath)) {
    const portalsData = fs.readFileSync(portalPath, 'utf-8');
    for (let portalLine in portalsData.split(/\n/g)) {
      if (!portalLine.trim()) {
        continue;
      }
      const [x, y, width, height, destID, destX, destY] = portalLine.split(' ');
      feature.portals.add(
        new Portal(x | 0, y | 0, width | 0, height | 0, destID, destX | 0, destY | 0)
      );
    }
  }

  cache[name] = feature;
  return feature;
};
