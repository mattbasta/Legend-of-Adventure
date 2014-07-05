define('sentient', ['harmable', 'animat'], function() {
    var defaultBehavior = 'flee';

    var fleeingFrom = [];
    var chasing = null;

    var wandering = false;

    var bestDirX;
    var bestDirY;

    var FLEE_DISTANCE = 15;
    var HURT_DISTANCE = 1;

    var levWidth;
    var levHeight;

    var DIRECTIONS = [
        [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]
    ];

    function getBestDirection(weighted) {
        // TODO: Set real values for size
        stageAvailableTiles(trigger('getX'), trigger('getY'), 1, 1);
        if (chasing) {
            stageAttractor(chasing);
        }
        if (fleeingFrom.length) {
            for (var i = 0; i < fleeingFrom.length; i++) {
                stageRepeller(fleeingFrom[i]);
            }
        }
        var bestDirection = getDirectionToBestTile();
        if (bestDirection === null) return null;
        return DIRECTIONS[bestDirection];
    }
    function behaviorChanged() {
        if (!velX && !velY) {
            var bestDirection = getBestDirection();
            if (!bestDirection) {
                trigger('stopMoving');
                if (wandering) {
                    trigger('stopWandering');
                }
                return;
            }
            trigger('startMoving', bestDirection[0], bestDirection[1]);
        }
    }
    function reevaluateBehavior() {
        var stillMustFlee = false;
        if (fleeingFrom.length) {
            for (var i = 0; i < fleeingFrom.length; i++) {
                if (getDistance(fleeingFrom[i]) > FLEE_DISTANCE) {
                    stillMustFlee = true;
                    break;
                }
            }
        }

        if (!chasing && !stillMustFlee) {
            trigger('stopMoving');
            trigger('schedule', function() {
                trigger('wander');
            }, 2000);
            return;
        } else {
            if (chasing) {
                // Try tossing out an attack.
                var dist = getDistance(chasing);
                if (trigger('doesAttack') && dist <= 1.5 * HURT_DISTANCE) {
                    trigger('attack', chasing);
                }
                // If what we're chasing is in range, stop to try to attack it.
                if (dist < HURT_DISTANCE * 2) {
                    trigger('stopMoving');
                }
            }

            var bestDirection = getBestDirection();
            if (!bestDirection) {
                trigger('stopMoving');
                trigger('schedule', function() {
                    trigger('wander');
                }, 3000);
                return;
            } else {
                trigger('startMoving', bestDirection[0], bestDirection[1]);
            }
        }

        scheduleReevaluate();
    }

    return {
        setup: function(sup) {
            sup();
            defaultBehavior = trigger('getPreferredBehavior');
            levHeight = getLevHeight();
            levWidth = getLevWidth();
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
        wander: function(sup) {
            // If we're chasing or fleeing, don't start wandering.
            if (chasing || fleeingFrom.length) {
                return;
            }

            if (wandering) return;

            var bestDirection = getBestDirection();
            if (!bestDirection) return;
            trigger('startMoving', bestDirection[0], bestDirection[1]);
            trigger('schedule', function() {
                trigger('stopWandering');
            }, Math.random() * 3000 + 1000);

        },
        stopWandering: function(sup) {
            wandering = false;

            trigger('schedule', function() {
                trigger('wander');
            }, Math.random() * 2000 + 1000);

            if (chasing || fleeingFrom.length) {
                reevaluateBehavior();
                return;
            }
            trigger('stopMoving');
        },
        tick: function(sup, now, delta) {
            sup(now, delta);
            if (wandering || chasing || fleeingFrom.length) {
                reevaluateBehavior();
            }
        }
    };
});
