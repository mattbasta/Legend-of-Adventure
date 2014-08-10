define('sentient', ['harmable', 'animat'], function() {
    var defaultBehavior = 'flee';

    var fleeingFrom = [];
    var chasing = null;

    var wandering = false;

    var FLEE_DISTANCE = 15;
    var HURT_DISTANCE = 1;

    var levWidth;
    var levHeight;

    var wanderDir;

    var DIRECTIONS = [
        [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]
    ];

    function getBestDirection(wandering) {
        var x = trigger('getX');
        var y = trigger('getY');

        // TODO: Set real values for size
        stageAvailableTiles(x, y, 1, 1);
        trigger('stagePathElements', x, y);
        var bestDirection = trigger('getDirectionToBestTile', wandering);
        if (bestDirection === null) return null;
        return DIRECTIONS[bestDirection];
    }
    function reevaluateBehavior() {
        var stillMustFlee = false;
        if (fleeingFrom.length) {
            var dist;
            for (var i = 0; i < fleeingFrom.length; i++) {
                dist = getDistance(fleeingFrom[i]);
                if (dist === null) continue;
                if (dist < FLEE_DISTANCE) {
                    stillMustFlee = true;
                    break;
                }
            }
        }

        if (!chasing && !stillMustFlee) {
            if (fleeingFrom.length) fleeingFrom = [];
            trigger('wander');
        } else {
            // log('Need to take action.');
            if (chasing) {
                // Try tossing out an attack.
                var dist = getDistance(chasing);
                if (dist === null || dist > FLEE_DISTANCE) {
                    trigger('stopChasing');
                    reevaluateBehavior();
                    return;
                }
                if (trigger('doesAttack') && dist <= HURT_DISTANCE) {
                    sendEvent(
                        'dak',
                        trigger('getX') + ' ' + trigger('getY') + ' ' + (
                            trigger('holdingWeapon') || 'null'
                        )
                    );
                }
                // If what we're chasing is in range, stop to try to attack it.
                if (dist < HURT_DISTANCE) {
                    trigger('stopMoving');
                    return;
                }
            }

            var bestDirection = getBestDirection();
            // log(bestDirection);
            if (!bestDirection) {
                // The best direction is to not move.
                trigger('stopMoving');
            } else {
                trigger('startMoving', bestDirection[0], bestDirection[1]);
            }
        }
    }

    return {
        setup: function(sup) {
            sup();
            defaultBehavior = trigger('getPreferredBehavior');
            levHeight = getLevHeight();
            levWidth = getLevWidth();
        },

        forget: function(sup, id) {
            if (chasing === id) trigger('stopChasing');
            var idx = fleeingFrom.indexOf(id);
            if (idx) {
                fleeingFrom.splice(idx, 1);
            }
        },
        flee: function(sup, id) {
            var dist = getDistance(id);
            if (dist === null) return;
            if (dist > FLEE_DISTANCE) return;
            var idx = fleeingFrom.indexOf(id);
            if (idx === -1) {
                fleeingFrom.push(id);
            }
            // log('Fleeing ' + id);
        },
        chase: function(sup, id) {
            if (chasing === id) return;
            chasing = id;
            // log('Chasing ' + id);
        },
        stopChasing: function(sup) {
            chasing = null;
        },
        wander: function(sup) {
            // If we're chasing or fleeing, don't start wandering.
            if (chasing || fleeingFrom.length) return;
            if (wandering) return;

            var bestDirection = getBestDirection(true);
            if (!bestDirection) return;
            wanderDir = bestDirection;
            wandering = true;
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
            if (chasing || fleeingFrom.length) {
                reevaluateBehavior();
            } else if (wandering) {
                var dirOk = isDirectionOk(
                    trigger('getX'), trigger('getY'),
                    1, 1, // TODO: Make these use legit values.
                    wanderDir[0], wanderDir[1]
                );
                if (!dirOk) {
                    var bestDirection = getBestDirection();
                    if (!bestDirection) {
                        trigger('stopMoving');
                        return;
                    }
                    wanderDir = bestDirection;
                    trigger('startMoving', bestDirection[0], bestDirection[1]);
                }
            }
        },

        stagePathElements: function() {
            if (chasing) {
                stageAttractor(chasing);
            }
            if (fleeingFrom.length) {
                for (var i = 0; i < fleeingFrom.length; i++) {
                    stageRepeller(fleeingFrom[i]);
                }
            }
        },

        getDirectionToBestTile: function() {
            return getDirectionToBestTile();
        }
    };
});
