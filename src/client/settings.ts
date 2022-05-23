export default {
  init_module: "game",
  port: 80,
  fps: 30,
  speed: 0.0075,
  tilesize: 50,
  tilesPerRow: 5,
  tilesetTileSize: 16, // The size of a tile in the tileset
  terrainChunkSize: 15,

  show_epu: false,
  show_fps: false,
  show_hitmap: true,
  show_hitmappings: false,
  show_tileval: false,

  scales: {
    terrain: 16 / 50,
    entities: 32 / 50,
    objects: 1,
  } as Record<string, number>,

  effect: null as string | null,

  entityPrototypes: {
    avatar: {
      image: "avatar",
      xOffset: 0,
      width: 1,
      height: 1,
      speed: 0.0075,
      sprite: {
        left: [
          { position: 4, duration: 5 },
          { position: 5, duration: 5 },
          { position: 3, duration: 5 },
        ],
        right: [
          { position: 7, duration: 5 },
          { position: 8, duration: 5 },
          { position: 6, duration: 5 },
        ],
        up: [
          { position: 10, duration: 5 },
          { position: 11, duration: 5 },
          { position: 9, duration: 5 },
        ],
        down: [
          { position: 1, duration: 5 },
          { position: 2, duration: 5 },
          { position: 0, duration: 5 },
        ],
      },
    },
    item: {
      image: "items",
      xOffset: 0,
      movement: "itemHover",
    },
    chest: {
      image: "chest",
      xOffset: 0,
      clip: {
        x: 0,
        y: 0,
        width: 32,
        height: 32,
      },
    },
    animal: {
      sprite: {
        left: [
          { position: 4, duration: 5 },
          { position: 5, duration: 5 },
          { position: 3, duration: 5 },
        ],
        right: [
          { position: 7, duration: 5 },
          { position: 8, duration: 5 },
          { position: 6, duration: 5 },
        ],
        up: [
          { position: 10, duration: 5 },
          { position: 11, duration: 5 },
          { position: 9, duration: 5 },
        ],
        down: [
          { position: 1, duration: 5 },
          { position: 2, duration: 5 },
          { position: 0, duration: 5 },
        ],
      },
    },
  } as const,
};
