define('harmable', [], function() {

    var health;
    var accumulatedDamage = 0;

    return {
        setup: function(sup) {
            sup();
            health = trigger('getHealth');
        },

        attacked: function(sup, origin, damage) {
            trigger('wasHurt');
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

        wasHurt: function(sup) {
            trigger('bloodspatter');
            sup();
        },

        bloodspatter: function() {
            sendEvent('pma',  '0.5 0 bloodspatter 5 ' + ID);
        }
    };
});
