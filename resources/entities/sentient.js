define('sentient', ['harmable', 'animat'], function() {
    var defaultBehavior = 'flee';

    var fleeingFrom = [];
    var chasing = null;

    var doesAttack = false;
    var lastAttack = 0;
    var wandering = false;

    var bestDirX;
    var bestDirY;

    var FLEE_DISTANCE = 15;
    var HURT_DISTANCE = 1;

    var levWidth;
    var levHeight;

    function getBestDirection(weighted) {
        function testDirection(pos) {
            return !(pos[0] < 0 ||
                     pos[1] > levHeight ||
                     pos[0] > levWidth - trigger('getWidth') ||
                     pos[1] < trigger('getHeight'));
        }
        var usableDirections = DIRECTIONS.filter(function(dir) {
            var updatedPosition = trigger('_updatedPosition', dir);
            return testDirection(updatedPosition);
        });

        if (!usableDirections.length) {
            trigger('say', 'I am stuck!');
            return;
        }
        if (usableDirections.length === 1) return usableDirections[0];

        if (weighted) {
            var weights = usableDirections.map(getDirectionWeight);
            var bestWeight = weights[0];
            var bestWeightIndex = 0;
            for (var i = 1; i < weights.length; i++) {
                if (weights[i] > bestWeight) {
                    bestWeight = weights[i];
                    bestWeightIndex = i;
                }
            }

            // TODO: Randomize this if multiple directions have the same weight
            return usableDirections[bestWeightIndex];
        }

        return usableDirections[Math.random() * usableDirections.length | 0];
    }
    function behaviorChanged() {
        if (!velX && !velY) {
            var bestDirection = getBestDirection();
            if (!bestDirection) {
                trigger('stopMoving');
                trigger('wander');
                return;
            }
            trigger('startMoving', bestDirection[0], bestDirection[1]);
        }
        scheduleReevaluate();
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
            } else if (bestDirection[0] !== velX || bestDirection[1] !== velY) {
                trigger('startMoving', bestDirection[0], bestDirection[1]);
            }
        }

        scheduleReevaluate();
    }

    function scheduleReevaluate() {
        trigger('schedule', function() {
            reevaluateBehavior();
        }, (Math.random() * 2 + 5) / 11 * 1000 + 675);
        // This crazy formula comes from the legacy server. I don't remember
        // why it's so crazy.
    }

    function getDirectionWeight(direction) {
        var updatedPosition = trigger('_updatedPosition', direction);
        function fleeDelta() {
            var delta = 0;
            for (var id in fleeingFrom) {
                delta += getDistanceFrom(id, updatedPosition[0], updatedPosition[1]) - getDistance(id);
            }
            return delta;
        }
        function chaseDelta() {
            return -1 * Math.abs(getDistanceFrom(chasing, updatedPosition[0], updatedPosition[1]) - getDistance(chasing));
        }

        if (chasing && fleeingFrom.length) {
            if (defaultBehavior === 'flee') {
                return fleeDelta();
            } else {
                return chaseDelta();
            }
        } else if (fleeingFrom.length) {
            return fleeDelta();
        } else if (chasing) {
            return chaseDelta();
        }
        return 0;
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
            if (chasing || fleeingFrom.length) {
                reevaluateBehavior();
                return;
            }
            trigger('stopMoving');
            wandering = false;

            trigger('schedule', function() {
                trigger('wander');
            }, Math.random() * 2000 + 1000);
        },

        attacked: function(sup, from, distance, weapon) {},

        attack: function(sup, id) {}
    };
});
