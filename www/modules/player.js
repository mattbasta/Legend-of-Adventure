define('player', ['comm', 'sound'], function(comm, sound) {
    'use strict';

    var health = 100;
    var lowHealth = null;

    comm.messages.on('hea', function(body) {
        var newHealth = parseInt(body, 10);

        if (newHealth < health) {
            sound.playSound('hit_grunt' + (Math.random() * 4 | 0), 0);
        }

        health = newHealth;

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
