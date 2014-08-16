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

    var phrases = [
        'Get back here, criminal!',
        'We don\'t take kindly to your type around here!',
        'Get out of our town!'
    ];

    var attacking = false;
    function saySomething() {
        if (attacking) say(phrases[Math.random() * phrases.length | 0]);
        trigger('schedule', function() {
            saySomething();
        }, Math.random() * 5000 + 3000);
    }

    var drops = [
        // Lower index is worth less.
        'wsw.old.',
        'wsw.plain.',
        'wsw.sharp.',
        'wsw.forged.'
    ];

    return {
        setup: function(sup) {
            sup();
            trigger('schedule', function() {
                saySomething();
            }, Math.random() * 10000 + 4000);
        },

        getData: function(sup) {
            var data = sup();
            data.proto = 'avatar';
            data.image = image;
            data.width = data.height = getSize();
            data.speed = 0.0075;
            data.nametag = 'Soldier';
            return data;
        },
        silent: function() {
            return true;
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

        chase: function(sup) {
            sup();
            attacking = true;
        },

        stopChasing: function(sup) {
            sup();
            attacking = false;
            trigger('stopMoving');
        },

        attacked: function(sup, from, damage, item) {
            if (item === SOLDIER_WEAPON) return;
            sup();
        },

        getDrops: function() {
            var level = Math.random() * 5 + 2 | 0;
            return drops[Math.pow(Math.random(), 3) * drops.length | 0] + level;
        }
    };
});
