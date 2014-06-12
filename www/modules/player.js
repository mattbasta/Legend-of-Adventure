define('player', ['comm'], function(comm) {
    'use strict';

    var health = 100;
    var lowHealth = null;

    comm.messages.on('hea', function(body) {
        health = parseInt(body, 10);

        if (healthIsLow()) {
            if (!lowHealth)
                lowHealth = setInterval(require('playerStatsOverlay').redraw, 100);
        } else {
            clearInterval(lowHealth);
            lowHealth = null;
        }

        require('playerStatsOverlay').redraw();
    });

    function healthIsLow() {
        return health < 30;
    }

    return {
        getHealth: function() {
            return health;
        },
        healthIsLow: healthIsLow
    };
});
