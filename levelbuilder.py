import noise
import internals.caching as cache
import internals.constants as constants


def build_region(x, y, height, width):
    """Generates a region based on the region type and coordinates."""
    # TODO: Something more complex
    return perlin_refined(x, y, height, width)


def perlin_refined(x, y, height=100, width=100):
    """Build a raw numeric map based on perlin noise."""

    freq = 16.0
    octave = 1
    return tuple(tuple(_perlin(x, y) for x in range(width))
                 for y in range(height))

def _perlin(x, y, amplitude=10):
    freq = 16.0
    octave = 1
    half_amp = amplitude / 2
    return round(noise.pnoise2(x/freq, y/freq, octave) * half_amp) + half_amp
