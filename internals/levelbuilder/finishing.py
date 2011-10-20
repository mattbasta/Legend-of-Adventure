import copy


def rounding(region, tileset):
    """Create smooth corners on a region."""

    def is_vertical(tile):
        return (tile[0] == tile[2] and tile[1] == tile[3] and
                is_vertical_gradient(tile))

    def is_horizontal(tile):
        return (tile[0] == tile[1] and tile[2] == tile[3] and
                is_horizontal_gradient(tile))

    def is_vertical_gradient(tile):
        return tile[0] != tile[1] and tile[2] != tile[3]

    def is_horizontal_gradient(tile):
        return tile[0] != tile[2] and tile[1] != tile[3]

    def get_tile(tile):
        """Returns the tile for a given list/id."""
        t = tuple(tile)
        if t in tileset:
            return tileset[t]
        return tile[0]

    orig = copy.copy(region)

    # Convert the region to lists
    region = [[[b, b, b, b] for b in row] for row in region]

    def mutate(base, tl=None, tr=None, bl=None, br=None):
        """Convert a tile to or from its descriptive form."""
        if tl:  base[0] = tl
        if tr:  base[1] = tr
        if bl:  base[2] = bl
        if br:  base[3] = br

        return base

    rlen = len(region)
    rlen_minus = rlen - 1
    rrlen = range(rlen)

    # First pass, horiz and vertical gradients.
    for y in rrlen:
        clen = len(region[y])
        for x in range(clen):
            here = orig[y][x]

            # Weed out any single dots or vertical tips.
            if (y and x and y < rlen_minus and x < clen - 1 and
                here != orig[y][x - 1] and here != orig[y - 1][x] and
                here != orig[y][x + 1]):
                temp = orig[y - 1][x]
                orig[y][x] = temp
                region[y][x] = [temp, temp, temp, temp]
                continue

            # Second column and up, test for horiz gradient.
            if x and orig[y][x] != orig[y][x - 1]:
                region[y][x] = mutate(region[y][x],
                                      tl=orig[y][x - 1],
                                      bl=orig[y][x - 1])
                continue

            # Second row and down, test for vertical gradient.
            if (y and orig[y][x] != orig[y - 1][x] and
                region[y - 1][x][2] == region[y - 1][x][3]):
                region[y][x] = mutate(region[y][x],
                                      tl=orig[y - 1][x],
                                      tr=orig[y - 1][x])

    rlen_minus = rlen - 1
    # Second pass, basic corner matching. Also contains an optimized
    # version of the third pass to save resources.
    for y in rrlen:
        clen = len(region[y])
        for x in range(clen):
            hleft_c = x and is_vertical(region[y][x - 1])
            hright_c = x < clen - 1 and is_vertical(region[y][x + 1])

            # Optimize the third pass by squashing it into the second.
            if is_horizontal_gradient(region[y][x]):
                if hleft_c:
                    if (region[y][x][0] == region[y][x - 1][1] and
                        region[y][x][2] == region[y][x - 1][2]):
                        region[y][x - 1][2] = region[y][x][2]
                        region[y][x - 1][3] = region[y][x][2]
                    elif (region[y][x][0] == region[y][x - 1][2] and
                          region[y][x][2] == region[y][x - 1][3]):
                        region[y][x - 1][0] = region[y][x][0]
                        region[y][x - 1][1] = region[y][x][0]
                if hright_c:
                    if (region[y][x][1] == region[y][x + 1][0] and
                        region[y][x][3] == region[y][x + 1][1]):
                        region[y][x + 1][2] = region[y][x][3]
                        region[y][x + 1][3] = region[y][x][3]
                    elif (region[y][x][1] == region[y][x + 1][3] and
                          region[y][x][3] == region[y][x + 1][2]):
                        region[y][x + 1][0] = region[y][x][1]
                        region[y][x + 1][1] = region[y][x][1]
                continue
            if is_vertical_gradient(region[y][x]):
                # There is nothing for us here except pain.
                continue

            # Perform second pass operations.
            if not (y and region[y - 1][x][2] != region[y - 1][x][3]):
                continue

            if (hleft_c and region[y - 1][x][2] == region[y][x - 1][0] and
                region[y - 1][x][3] == region[y][x - 1][3]):

                temp1, temp2 = region[y - 1][x][2], region[y - 1][x][3]
                region[y][x] = [temp1, temp2, temp2, temp2]
                region[y][x - 1][1] = temp1
                continue

            if (hright_c and region[y - 1][x][2] == region[y][x + 1][2] and
                region[y - 1][x][3] == region[y][x + 1][1]):

                temp1, temp2 = region[y - 1][x][2], region[y - 1][x][3]
                region[y][x] = [temp1, temp2, temp1, temp1]
                region[y][x + 1][0] = temp2

    # Third pass is done above: intersection handling.

    # Fourth pass, perform final step corner matching.
    for y in rrlen:
        clen = len(region[y])
        for x in range(clen):
            here = region[y][x]
            # Ignore corners and edges.
            if (is_horizontal_gradient(here) or
                is_vertical_gradient(here)):
                continue

            if not (y and region[y - 1][x][2] != region[y - 1][x][3]):
                continue
            hleft_c = x and region[y][x - 1][1] != region[y][x - 1][3]

            if (hleft_c and region[y][x - 1][1] == region[y - 1][x][2] and
                region[y][x - 1][3] == region[y - 1][x][3]):
                temp = region[y - 1][x][3]
                region[y][x] = [region[y][x - 1][1], temp, temp, temp]
                continue

            hright_c = (x < clen - 1 and
                        region[y][x + 1][0] != region[y][x + 1][2])
            if (hright_c and region[y][x + 1][0] == region[y - 1][x][3] and
                region[y][x + 1][2] == region[y - 1][x][2]):
                temp = region[y - 1][x][2]
                region[y][x] = [temp, region[y - 1][x][3], temp, temp]

    # Perform tile replacement.
    return [[get_tile(cell) for cell in row] for row in region]

