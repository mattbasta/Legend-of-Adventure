define('neutral', ['sentient'], function() {

    var chasing = null;

    return {
        getPreferredBehavior: function() {
            return 'chase';
        },
        attacked: function(sup, from) {
            sup();
            trigger('chase', from);
        },

        doesAttack: function() {
            return true;
        }
    };
});
