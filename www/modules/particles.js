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

    var constructors = {
        bloodspatter: function(self) {
            self.velX = (Math.random() - 0.5) * 3;
            self.velY = 7 * Math.random() + 5;
            self.accY = -1;
            self.floor = self.y;
            self.x += 25;
            self.y += 5;
        },
        godmode: function(self) {
            self.velX = (Math.random() - 0.5) * 2;
            self.velY = (Math.random() - 0.5) * 2;
            self.x += 20 + Math.random() * 10;
            self.y -= 20 + Math.random() * 10;
        }
    };

    Particle.prototype.init = function(constructor) {
        if (constructor in constructors) {
            constructors[constructor](this);
        }
    };

    Particle.prototype.setPosition = function(x, y) {
        this.x = x;
        this.y = y;
    };

    Particle.prototype.tick = function() {
        this.velX += this.accX;
        this.velY += this.accY;
        this.x += this.velX;
        this.y -= this.velY;

        if (this.floor !== null && this.y > this.floor) {
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

    Particle.macro = function(command) {
        var par;
        switch (command) {
            case 'bloodspatter':
                par = new Particle(25, 5, 'red');
                break;
            case 'zombiesquish':
                par = new Particle(25, 5, '#7DCD77');
                par.init('bloodspatter');
                return par;
            case 'deathwakersquish':
                par = new Particle(25, 5, '#634A21');
                par.init('bloodspatter');
                return par;
            case 'godmode':
                par = new Particle(25, 5, '#F8FF9B');
                break;
        }
        par.init(command);
        return par;
    };

    return Particle;
});
