import os


def get_building_tiles(building, btype="buildings"):
    """
    Open a tiles file, parse the contents, and output the building entity.
    """

    def read_building(f):
        output = []
        for line in f:
            line = line.strip()
            row = []
            for tile in line.split():
                row.append(int(tile))
            output.append(row)
        return output

    with open(os.path.join(os.path.dirname(__file__),
                           "%s/" % btype,
                           "%s.tiles" % building)) as building_file:

        output = read_building(building_file)

    hitmap_file = os.path.join(os.path.dirname(__file__),
                               "%s/" % btype,
                               "%s.hitmap" % building)
    if os.path.exists(hitmap_file):
        with open(hitmap_file) as hitmap_file:
            hitmap = read_building(hitmap_file)
    else:
        hitmap = [[0 for i in range(len(output[j]))] for
                  j in range(len(output))]

    portal_file = os.path.join(os.path.dirname(__file__),
                               "%s/" % btype,
                               "%s.portals" % building)
    portals = []
    if os.path.exists(portal_file):
        with open(portal_file) as portal_file:
            for p in portal_file:
                x, y, width, height, destination, dest_crds = p.strip().split()
                dest_crds = map(float, dest_crds.split(":"))
                portals.append({
                    "x": float(x),
                    "y": float(y),
                    "width": int(width),
                    "height": int(height),
                    "destination": destination,
                    "dest_coords": dest_crds})

    return (len(output[0]), len(output), output, hitmap, portals, )


def overlay(grid, hitmap, structure, x, y):
    """Place a structure on the tile grid."""

    width, height, bt, hm, portals = structure
    for row_num in range(height):
        for tile in range(width):
            grid[y + row_num][x + tile] = bt[row_num][tile]
            hitmap[y + row_num][x + tile] = hm[row_num][tile]

    return grid, hitmap, portals

