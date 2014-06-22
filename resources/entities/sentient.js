define('sentient', ['harmable', 'animat'], function() {
    var defaultBehavior = 'flee';

    var fleeingFrom = [];
    var chasing = null;

    var doesAttack = false;
    var lastAttack = 0;

    var bestDirX;
    var bestDirY;

    var DIRECTIONS = [
        [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1],
        [1, -1]
    ];

    function getBestDirection() {

    }
    function behaviorChanged() {
        if (!velX && !velY) {

        }
        scheduleReevaluate();
    }
    function reevaluateBehavior() {

        scheduleReevaluate();
    }

    function scheduleReevaluate() {
        // This crazy formula comes from the legacy server. I don't remember
        // why it's so crazy.
        scheduledEvent = Date.now() + (Math.random() * 2 + 5) / 11 * 1000 + 675;
    }

    function getDirectionWeight() {}


    var scheduledEvent = Date.now();

    return {
        setup: function(sup) {
            sup();
            defaultBehavior = trigger('getPreferredBehavior');
        },

        forget: function(sup, id) {
            if (chasing === id) chasing = null;
            var idx = fleeingFrom.indexOf(id);
            if (idx) {
                fleeingFrom.splice(idx, 1);
            }
        },
        flee: function(sup, id) {
            var idx = fleeingFrom.indexOf(id);
            if (idx === -1) {
                fleeingFrom.push(id);
            }
            behaviorChanged();
        },
        chase: function(sup, id) {
            if (chasing === id) return;
            chasing = id;
            behaviorChanged();
        },

        attack: function(sup, id) {},
        wander: function(sup) {
            // If we're chasing or fleeing, don't start wandering.
            if (chasing || fleeingFrom.length) {
                return;
            }
            sup();
        },
        stopWandering: function(sup) {
            if (chasing || fleeingFrom.length) {
                reevaluateBehavior();
                return;
            }
            sup();
        },

        tick: function(sup, now, delta) {
            sup();
            if (scheduledEvent <= now) {
                reevaluateBehavior();
                scheduledEvent = null;
            }
        },
        attacked: function(sup, from, distance, weapon) {}
    };
});
