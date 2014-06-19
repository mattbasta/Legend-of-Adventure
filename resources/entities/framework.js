(function(self) {

var type = self.type;

var defined = {};

self.define = function define(name, inherits, body) {
    if (!body) {
        body = inherits;
        inherits = [];
    }
    defined[name] = [inherits, body(), name];
};


self.trigger = function trigger(event, args) {
    var didRun = false;
    function run(current) {
        if (event in current[1]) {
            didRun = true;
            function yield() {
                return doTrigger(current[2]);
            }
            return current[1][event].apply(null, [yield].concat(args));
        } else if (current[0].length) {
            return doTrigger(current[2]);
        }
    }
    function doTrigger(current) {
        var parents = defined[current][0];
        var output;
        for (var i = 0; i < parents.length; i++) {
            output = run(defined[parents[i]]);
            if (didRun) {
                return output;
            }
        }
    }
    run(defined[type]);
};

}(this));
