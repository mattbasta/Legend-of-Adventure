exports.fillArea = function(terrain, x, y, width, height, material) {
  for (let i = y; i < y + height; i++) {
    for (let j = x; j < x + width; j++) {
      terrain.tiles[i * terrain.width + j] = material;
    }
  }
};
