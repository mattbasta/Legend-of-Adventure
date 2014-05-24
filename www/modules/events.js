define('events', [], function() {
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
            var args = Array.prototype.slice.call(arguments, 1);
            var i;
            if (name in listeners) {
                for (i = 0; i < listeners[name].length; i++) {
                    listeners[name][i].apply(null, args);
                }
            }
            if (name in oneListeners) {
                for (i = 0; i < oneListeners[name].length; i++) {
                    oneListeners[name][i].apply(null, args);
                }
                delete oneListeners[name];
            }
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
