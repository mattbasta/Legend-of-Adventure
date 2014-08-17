define('harmable', [], function() {

    var health;
    var accumulatedDamage = 0;

    return {
        setup: function(sup) {
            sup();
            health = trigger('getHealth');
        },

        attacked: function(sup, origin, damage) {
            var x = trigger('getX');
            var y = trigger('getY');
            trigger('bloodSpatter');
            accumulatedDamage += damage;
            say("I have " + (health - accumulatedDamage) + " health remaining!");
            if (accumulatedDamage >= health) {
                trigger('beforeDie');
                die();
            }
        },

        // This is the default health provider.
        getHealth: function() {
            return 20;
        },

        bloodSpatter: function() {
            sendEvent('pma',  '0.5 0 bloodspatter 5 ' + ID);
        }
    };
});
