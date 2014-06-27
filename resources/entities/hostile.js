define('hostile', ['sentient'], function() {
    return {
        getPreferredBehavior: function() {
            return 'chase';
        },
        attacked: function(sup, from) {
            sup();
            trigger('chase', from);
        }
    };
});
