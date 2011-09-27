import noise
import internals.caching as cache
import internals.constants as constants
import internals.levelbuilder.finishing as finishing
import internals.levelbuilder.tilesets.field
import internals.levelbuilder.towns as towns


REGIONS = {"field": internals.levelbuilder.tilesets.field.TILESET}

def build_region(x, y, height, width):
    """Generates a region based on the region type and coordinates."""
    region = "field"
    tileset = REGIONS[region]

    map = perlin_refined(x, y, height, width)  # Build the terrain.
    map = finishing.rounding(map, tileset)  # Perform corner smoothing.

    return tileset, map


def perlin_refined(x, y, height=0, width=0):
    """Build a raw numeric map based on perlin noise."""
    if height == 0:
        height = constants.level_height
    if width == 0:
        width = constants.level_width
    freq = 16.0
    octave = 1

    x *= width
    y *= height

    return [[int(_perlin(x_grid, y_grid, 5) + 3) for
             x_grid in range(x, x + width)] for
            y_grid in range(y, y + height)]


def _perlin(x, y, amplitude=10):
    freq = 16.0
    octave = 1
    half_amp = amplitude / 2
    return round(noise.pnoise2(x/freq, y/freq, octave) * half_amp) + half_amp
