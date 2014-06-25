(function() {

var methods = {};

function addMethod(method, body) {
    if (!(method in methods)) methods[method] = [];
    methods[method].push(body[method]);
}

var defining = false;
var defineQueue = [];
this.define = function define(name, inherits, body) {
    if (!body) {
        body = inherits;
        inherits = [];
    }

    for (var i = 0; i < inherits.length; i++) {
        defineQueue.push(inherits[i]);
    }

    var main = body();
    for (var method in main) {
        if (!main.hasOwnProperty(method)) continue;
        addMethod(method, main);
    }

    if (!defining) {
        log('Initializing entity ' + name);
        defining = true;
        while (defineQueue.length) {
            load(defineQueue.shift());
        }
        defining = false;
    }
};

this.trigger = function trigger(event) {
    var args = Array.prototype.slice.call(arguments, 1);

    if (!(event in methods)) return;
    var chain = methods[event];
    var depth = 0;
    function run() {
        if (!chain[depth]) return;
        var method = chain[depth];
        depth++;
        try {
            return method.apply(null, args);
        } catch(e) {
            log("Error while executing '" + event + "' at depth ", depth);
            // log(method.toString());
            log(e);
        }
    }
    args.unshift(run);
    return run();
};

}());
