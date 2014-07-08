define('harmable', [], function() {

    var health;
    var accumulatedDamage = 0;

    return {
        setup: function(sup) {
            sup();
            health = trigger('getHealth');
        },

        attacked: function(sup, origin, damage) {
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
        }
    };
});
