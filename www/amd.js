(function(window) {

var defined = {};
var resolved = {};

function define(id, deps, module) {
    defined[id] = [deps, module];
}
define.amd = {jQuery: true};

function require(id) {

    if (!resolved[id]) {

        var definition = defined[id];

        if (!definition) {
            throw 'Attempted to resolve undefined module ' + id;
        }

        var deps = definition[0];
        var module = definition[1];

        if (typeof deps == 'function' && module === void 0) {
            module = deps;
            deps = [];
        }

        try {
            deps = deps.map(require);
        } catch(e) {
            window.console.error('Error initializing dependencies: ' + id);
            throw e;
        }
        try {
            resolved[id] = module.apply(window, deps);
        } catch(e) {
            window.console.error('Error initializing module: ' + id);
            throw e;
        }

    }
    return resolved[id];
}

require.config = function() {};

window.require = resolved.require = require;
window.define = define;

})(window);
