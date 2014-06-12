define('events', [], function() {
    'use strict';

    function EventTarget() {
        var listeners = {};
        var oneListeners = {};

        function setDefault(name, type, toAdd) {
            if (!(name in type)) {
                type[name] = [];
            }
            type[name].push(toAdd);
        }

        this.fire = function(name) {
            var results = [];
            var result;
            var args = Array.prototype.slice.call(arguments, 1);
            var i;
            if (name in listeners) {
                for (i = 0; i < listeners[name].length; i++) {
                    result = listeners[name][i].apply(null, args);
                    if (result) results.push(result);
                }
            }
            if (name in oneListeners) {
                for (i = 0; i < oneListeners[name].length; i++) {
                    result = oneListeners[name][i].apply(null, args);
                    if (result) results.push(result);
                }
                delete oneListeners[name];
            }
            return results;
        };
        var on = this.on = function(name, listener) {
            setDefault(name, listeners, listener);
        };
        var one = this.one = function(name, listener) {
            setDefault(name, oneListeners, listener);
        };

        this.endpoint = function(obj) {
            obj = obj || {};
            obj.on = on;
            obj.one = one;
            return obj;
        };
    }

    return {
        EventTarget: EventTarget
    };
});
