define('peaceful', ['sentient'], function() {
    return {
        getPreferredBehavior: function() {
            return 'flee';
        },
        attacked: function(sup, from) {
            // TODO: Is this necessary?
            trigger('flee', from);
        }
    };
});
