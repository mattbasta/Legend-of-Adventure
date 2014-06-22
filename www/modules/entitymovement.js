define('entitymovement', [], function() {
    'use strict';

    function noop(x) {
        return 0;
    };

    return {
        item_hover_x: noop,
        item_hover_y: function(ticks) {
            return (Math.sin(ticks / 1000 * 2 * Math.PI) + 1) * -5;
        },
        sheep_bounce_x: noop,
        sheep_bounce_y: function(ticks) {
            return Math.abs(Math.sin(ticks / 500 * 2 * Math.PI)) * -5;
        }
    }
});
