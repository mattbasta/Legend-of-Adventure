define('peaceful', ['sentient'], function() {
    return {
        getPreferredBehavior: function() {
            return 'flee';
        },
        attacked: function(sup) {}
    };
});
