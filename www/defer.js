(function() {

var slice = function(arr) {return Array.prototype.slice.call(arr, 0)};

var PENDING = 'pending';
var RESOLVED = 'resolved';
var REJECTED = 'rejected';

function defer(beforeStart) {
    var _this = this;
    var state = PENDING;

    var doneCBs = [];
    var failCBs = [];

    var closedArgs = [];

    function execute(funcs, args, ctx) {
        for (var i = 0, e; e = funcs[i++];) {
            if (Array.isArray(e)) {
                execute(e, args, ctx);
            } else {
                e.apply(ctx || _this, args);
            }
        }
    }

    function closer(list, new_state, ctx) {
        return function() {
            if (state !== PENDING) {
                return;
            }
            state = new_state;
            var args = slice(arguments);
            execute(list, closedArgs = ctx ? args.slice(1) : args, ctx ? args[0] : _this);
            return _this;
        };
    }

    this.resolve = closer(doneCBs, RESOLVED);
    this.resolveWith = closer(doneCBs, RESOLVED, true);
    this.reject = closer(failCBs, REJECTED);
    this.rejectWith = closer(failCBs, REJECTED, true);

    var promise = this.promise = function(obj) {
        obj = obj || {};
        function wrap(instant, cblist) {
            return function(arglist) {
                var args = slice(arguments);
                if (state === instant) {
                    execute(args, closedArgs);
                } else if (state === PENDING) {
                    for (var i = 0, e; e = args[i++];) {
                        cblist.push(e);
                    }
                }
                return obj;
            };
        }
        obj.promise = promise;
        obj.state = function() {return state;};
        obj.done = wrap(RESOLVED, doneCBs);
        obj.fail = wrap(REJECTED, failCBs);
        obj.then = function(doneFilter, failFilter) {
            var def = new defer();
            obj.done(function() {
                var args = slice(arguments);
                def.resolveWith.apply(this, [this].concat(doneFilter ? doneFilter.apply(this, args) : args));
            });
            obj.fail(function() {
                var args = slice(arguments);
                def.rejectWith.apply(this, [this].concat(failFilter ? failFilter.apply(this, args) : args));
            });
            return def.promise();
        };
        obj.always = function() {
            _this.done.apply(_this, arguments).fail.apply(_this, arguments);
            return obj;
        };
        return obj;
    };

    this.promise(this);

    if (beforeStart) {
        beforeStart.call(this, this);
    }
}

function Deferred(func) {
    return new defer(func);
}

Deferred.when = function() {
    var args = slice(arguments);
    if (args.length === 1 && args[0].promise) {
        return args[0].promise();
    }
    var out = [];
    var def = Deferred();
    var count = 0;
    for (var i = 0, e; e = args[i];) {
        if (!e.promise) {
            out[i++] = e;
            continue;
        }
        count++;
        (function(i) {
            e.fail(def.reject).done(function() {
                count--;
                out[i] = slice(arguments);
                if (!count) {
                    def.resolve.apply(def, out);
                }
            });
        })(i++);
    }
    if (!count) {def.resolve.apply(def, out);}
    return def.promise();
};

if (this.define !== undefined && define.amd) {
    define('defer', [], function() {return Deferred;});
} else {
    var exports = this.exports || this;
    exports.Deferred = Deferred;
    exports.when = Deferred.when;
}

}).call(this);
