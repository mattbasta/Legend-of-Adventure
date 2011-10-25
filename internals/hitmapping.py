from math import floor

from constants import tilesize


def get_hitmap(position, hitmap):
    """
    Returns a 2-tuple of 2-tuples containing the minimum and maximum values for
    X and Y of the entity, respectively.
    """
    x, y = position
    x, y = floor(x / tilesize), floor(y / tilesize)
    x, y = map(int, (x, y))

    x2, y2 = position
    x2, y2 = floor(x2 / tilesize) + 1, floor(y2 / tilesize) + 1
    x2, y2 = map(int, (x2, y2))

    x_min, y_min = 0, 0
    x_max, y_max = len(hitmap[y]) * tilesize, len(hitmap) * tilesize

    # Calculate the X min and max
    for i in range(x - 1, -1, -1):
        if hitmap[y][i] or hitmap[y2][i]:
            x_min = (i + 1) * tilesize
            break

    for i in range(x + 1, len(hitmap[y])):
        if hitmap[y][i] or hitmap[y2][i]:
            x_max = i * tilesize
            break

    # Calculate the Y min and max
    for i in range(y, -1, -1):
        if hitmap[i][x] or hitmap[i][x2]:
            y_min = (i + 1) * tilesize
            break

    for i in range(y + 1, len(hitmap[y])):
        if hitmap[i][x] or hitmap[i][x2]:
            y_max = i * tilesize
            break

    return ((x_min, x_max), (y_min, y_max))

