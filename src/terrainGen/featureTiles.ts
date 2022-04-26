import * as fs from "fs";
import * as path from "path";
import { Hitmap, Terrain } from "../terrain";
import { Portal } from "./portal";

export class FeatureTiles {
  name: string;
  height: number;
  width: number;

  tiles: Uint16Array;
  hitmap: Hitmap;

  portals: Set<Portal> = new Set();

  constructor(name: string, width: number, height: number) {
    this.name = name;
    this.height = height;
    this.width = width;

    this.tiles = new Uint16Array(height * width);
    this.hitmap = new Hitmap(width, height);
  }

  populateTiles(tileData: Array<Array<number>>) {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        this.tiles[i * this.width + j] = tileData[i][j];
      }
    }
  }

  populateHitmap(hitmapData: Array<Array<boolean>>) {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        if (!hitmapData[i][j]) {
          continue;
        }
        this.hitmap.set(j, i);
      }
    }
  }

  apply(terrain: Terrain, x: number, y: number) {
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        terrain.tiles[(i + y) * terrain.width + x + j] =
          this.tiles[i * this.width + j];
      }
    }

    this.hitmap.apply(terrain.hitmap, x, y);

    for (let portal of this.portals.values()) {
      terrain.portals.add(portal.offset(x, y));
    }
  }
}

const cache: Record<string, FeatureTiles> = {};

const prefix = path.normalize(`${__dirname}/../../../resources/tilesets`);

export function getFeatureTiles(name: string) {
  if (name in cache) {
    return cache[name];
  }

  const tileData = fs.readFileSync(`${prefix}/${name}.tiles`, "utf-8");
  const hitmapData = fs.readFileSync(`${prefix}/${name}.hitmap`, "utf-8");

  const tilesParsed = tileData.split(/\n/g).reduce((acc, cur) => {
    if (!cur.trim()) {
      return acc;
    }
    acc.push(cur.split(" ").map((x) => parseInt(x, 10)));
    return acc;
  }, [] as Array<Array<number>>);

  const hitmapParsed = hitmapData.split(/\n/g).reduce((acc, cur) => {
    if (!cur.trim()) {
      return acc;
    }
    acc.push(cur.split(" ").map((x) => !!parseInt(x, 10)));
    return acc;
  }, [] as Array<Array<boolean>>);

  const feature = new FeatureTiles(
    name,
    tilesParsed[0].length,
    tilesParsed.length
  );
  feature.populateTiles(tilesParsed);
  feature.populateHitmap(hitmapParsed);

  const portalPath = `${prefix}/${name}.portals`;
  if (fs.existsSync(portalPath)) {
    const portalsData = fs.readFileSync(portalPath, "utf-8");
    for (let portalLine of portalsData.split("\n")) {
      if (!portalLine.trim()) {
        continue;
      }
      const [x, y, width, height, destID, destX, destY] = portalLine.split(" ");
      feature.portals.add(
        new Portal(
          Number(x),
          Number(y),
          Number(width),
          Number(height),
          destID,
          Number(destX),
          Number(destY)
        )
      );
    }
  }

  cache[name] = feature;
  return feature;
}
