function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

const images = {
  tileset_default: loadImage("/static/images/tilesets/default.png"),
  tileset_dungeons: loadImage("/static/images/tilesets/dungeons.png"),
  tileset_interiors: loadImage("/static/images/tilesets/interiors.png"),
  inventory: loadImage("/static/images/inventory.png"),
  avatar: loadImage("/static/images/avatar.png"),
  items: loadImage("/static/images/items.png"),
  chest: loadImage("/static/images/chest.png"),
  old_woman1: loadImage("static/images/old_woman1.png"),
  old_woman2: loadImage("static/images/old_woman2.png"),
  pots: loadImage("static/images/pots.png"),
  homely1: loadImage("static/images/homely1.png"),
  homely2: loadImage("static/images/homely2.png"),
  homely3: loadImage("static/images/homely3.png"),
  child1: loadImage("static/images/child1.png"),
  child2: loadImage("static/images/child2.png"),
  soldier1: loadImage("static/images/soldier1.png"),
  soldier2: loadImage("static/images/soldier2.png"),
  soldier3: loadImage("static/images/soldier3.png"),
  trader: loadImage("static/images/npc.png"),
  bully: loadImage("static/images/bully.png"),
  sheep: loadImage("static/images/sheep.png"),
  wolf: loadImage("static/images/wolf.png"),
  zombie: loadImage("static/images/zombie.png"),
  death_waker: loadImage("static/images/death_waker.png"),
  fallen_angel: loadImage("static/images/fallen_angel.png"),
} as const;

export type GameImages = keyof typeof images;

export function waitFor(
  ...deps: Array<keyof typeof images>
): Promise<Array<HTMLImageElement>> {
  for (const img of deps) {
    if (!(img in images)) {

    }
  }
  return Promise.all(deps.map((img) => images[img]));
}
