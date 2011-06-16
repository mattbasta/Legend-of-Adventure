
def rounding(region, tileset):
    """Create smooth corners on a region."""

    def get_tile(tile):
        """Returns the tile for a given tuple/id."""
        if tile in tileset:
            return tileset[tile]
        return tile


    def mutate(base, tl=None, tr=None, bl=None, br=None):
        """Convert a tile to or from its descriptive form."""

        if isinstance(base, (int, float, long)):
            base = [base, base, base, base]
        else:
            base = list(base)

        if tl:
            base[0] = tl
        if tr:
            base[1] = tr
        if bl:
            base[2] = bl
        if br:
            base[3] = br

        if all(base[i] == base[0] for i in range(1, 4)):
            base = base[0]
            return base

        return tuple(base)

    # First pass, horiz and vertical gradients.
    for x in range(len(region)):
        for y in range(len(region[x])):
            # Second column and up, test for horiz gradient.
            if x and region[x][y] != region[x - 1][y]:
                region[x][y] = mutate(region[x][y],
                                      tl=region[x - 1][y],
                                      bl=region[x - 1][y])

            # Second row and down, test for vertical gradient.
            if (y and region[x][y] != region[x][y - 1] and
                not isinstance(region[x][y - 1], tuple)):
                region[x][y] = mutate(region[x][y],
                                      tl=region[x][y - 1],
                                      tr=region[x][y - 1])

    # Perform tile replacement.
    return map(lambda row: map(lambda tile: get_tile(tile),
                               region[row]),
               range(len(region)))

