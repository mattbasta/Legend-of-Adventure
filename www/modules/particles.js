define('particles', [], function() {
    'use strict';

    function Particle(ticks, diameter, color) {
        this.ticksTillDeath = ticks;
        this.diameter = diameter;
        this.color = color;

        this.x = 0;
        this.y = 0;
        this.velX = 0;
        this.velY = 0;

        this.floor = null; // Pixels above y=0, or null

        this.accX = 0;
        this.accY = 0;
    }

    Particle.prototype.setPosition = function(x, y) {
        this.x = x;
        this.y = y;
    };

    Particle.prototype.tick = function() {
        this.velX += this.accX;
        this.velY += this.accY;
        this.x += this.velX;
        this.y += this.velY;

        if (this.floor !== null && this.y < this.floor) {
            this.y = this.floor;
            this.velY *= -1;
        }

        return !--this.ticksTillDeath;
    };

    Particle.prototype.draw = function(context, deltaX, deltaY) {
        context.fillStyle = this.color;
        context.fillRect(
            deltaX + this.x - this.diameter / 2,
            deltaY + this.y - this.diameter / 2,
            this.diameter,
            this.diameter
        );
    };

    return Particle;
});
