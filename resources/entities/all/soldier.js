define('soldier', ['npc', 'neutral'], function() {
    'use strict';

    var SOLDIER_WEAPON = 'wsp.soldier';

    var image = 'soldier' + (Math.random() * 3 + 1 | 0);

    function getSize() {
        return 50;
    }

    function getHealth() {
        return 125;
    }

    return {
        setup: function(sup) {
            sup();
        },

        getData: function(sup) {
            var data = sup();
            data.proto = 'avatar';
            data.image = image;
            data.width = data.height = getSize();
            data.speed = 0.0075;
            return data;
        },
        getWidth: getSize,
        getHeight: getSize,
        getHealth: getHealth,

        // noop
        wander: function() {},

        seenAttack: function(sup, from, damage, item) {
            sup();

            if (item === SOLDIER_WEAPON) return;

            var dist = getDistance(from);
            if (dist === null || dist > 50) return;

            trigger('chase', from);
        },

        holdingWeapon: function() {
            return SOLDIER_WEAPON;
        },

        stopChasing: function(sup) {
            sup();
            trigger('stopMoving');
        },

        attacked: function(sup, from, damage, item) {
            if (item === SOLDIER_WEAPON) return;
            sup();
        }
    };
});
