(function() {

var topModule = null;
var defined = {};

this.define = function define(name, inherits, body) {
    if (!body) {
        body = inherits;
        inherits = [];
    }

    for (var i = 0; i < inherits.length; i++) {
        if (!defined[inherits[i]]) load(inherits[i]);
    }

    log('Defining ' + name);
    defined[name] = [inherits, body(), name];
};

this.trigger = function trigger(event) {
    log('Starting trigger for ' + event);
    var args = Array.prototype.slice.call(arguments, 1);
    var didRun = false;
    function run(current) {
        // log('Running ' + event + ' in ' + current[2]);
        if (event in current[1]) {
            didRun = true;
            function sup() {
                // log("Triggering super");
                return doTrigger(current[2]);
            }
            try {
                return current[1][event].apply(null, [sup].concat(args));
            } catch(e) {
                log(e + "; " + current[2]);
            }
        } else if (current[0].length) {
            // log('Looking to ' + current[2] + '\'s ancestors');
            return doTrigger(current[2]);
        }
    }
    function doTrigger(current) {
        log("Triggering inheritance for " + current);
        var parents = defined[current][0];
        var output;
        for (var i = 0; i < parents.length; i++) {
            output = run(defined[parents[i]]);
            if (didRun) {
                return output;
            }
        }
        // log("Inheritance returned nothing for " + current);
    }
    var output = run(defined[type]);
    log(JSON.stringify(output));
    return output;
};

}());
