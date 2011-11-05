from nose.tools import eq_

from internals.locations import Location


def test_slide():
    """
    Test that the proper level ID is generated when the user slides to an
    adjacent level.
    """
    x = Location("o:0:0")
    eq_(x.get_slide_code(1, 1), "o:1:1")

    x = Location("o:0:0:fooworld:1:2")
    eq_(x.get_slide_code(-1, -3), "o:0:0:fooworld:-1:-3")

    x = Location("o:0:0:b:1:2:x")
    eq_(x.get_slide_code(-1, -3), "o:0:0:b:-1:-3:x")

