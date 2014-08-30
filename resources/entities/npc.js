define('npc', ['animat'], function() {

    function clearPath(sup) {
        sup();
        clearStagedPath();
    }

    var phrases = [
        'Goodness gracious, look at the clouds!',
        'Where are you from, partner?',
        'This place stinks.',
        'I\'m late for a board meeting!',
        'Where did I leave my khakis?',
        'No more questions.',
        'Don\'t you have somewhere to be?',
        'Look at this mess!',
        'Big money, big women, big fun.',
        'Get out of here, geodude'
    ];

    var availablePhrases = phrases.filter(function() {
        return Math.random() < 0.5;
    });

    function saySomething() {
        if (!availablePhrases.length) return;
        say(availablePhrases[Math.random() * availablePhrases.length | 0]);
        trigger('schedule', function() {
            saySomething();
        }, Math.random() * 10000 + 4000);
    }

    return {
        setup: function(sup) {
            sup();
            if (trigger('silent')) return;
            trigger('schedule', function() {
                saySomething();
            }, Math.random() * 10000 + 4000);
        },

        getDirectionToBestTile: function(sup, wandering) {
            if (!wandering) {
                var path = pathToBestTile();
                if (path) {
                    return path;
                }
            }
            return getDirectionToBestTile();
        },
        chase: clearPath,
        stopChasing: clearPath,
        flee: clearPath,
        forget: clearPath  // TODO: We might not want this one.
    };
});
