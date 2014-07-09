define('hostile', ['sentient'], function() {

    var chasing = null;

    return {
        getPreferredBehavior: function() {
            return 'chase';
        },
        attacked: function(sup, from) {
            sup();
            trigger('chase', from);
        },
        stopChasing: function(sup) {
            sup();
            chasing = null;
        },
        chase: function(sup, chase) {
            sup();
            chasing = chase;
        },
        seenEntity: function(sup, id, update, dist) {
            sup();
            if (!chasing) {
                trigger('chase', id);
            }
        },

        doesAttack: function() {
            return true;
        }
    };
});
