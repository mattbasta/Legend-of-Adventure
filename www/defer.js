(function() {
    
this.Deferred = (function() {

    var slice = Array.prototype.slice.call;

    var PENDING = 'pending';
    var RESOLVED = 'resolved';
    var REJECTED = 'rejected';

    function defer(beforeStart) {
        var _this = this;
        var state = PENDING;
        this.state = function() {return state;};

        var doneCBs = [];
        var failCBs = [];

        var closedArgs = [];

        function execute(funcs, args, ctx) {
            ctx = ctx || _this;
            for (var i = 0, e; e = funcs[i++];) {
                e.apply(ctx, args);
            }
        }

        function closer(list, new_state, ctx) {
            return function() {
                if (state !== PENDING) {
                    return;
                }
                state = new_state;
                var args = slice(arguments, 0);
                closedArgs = ctx ? args.slice(1) : args;
                execute(list, args, ctx ? args[0] : _this);
            };
        }

        this.resolve = closer(doneCBs, RESOLVED);
        this.resolveWith = closer(doneCBs, RESOLVED, true);
        this.reject = closer(failCBs, REJECTED);
        this.rejectWith = closer(failCBs, REJECTED, true);

        function wrap(instant, cblist) {
            return function() {
                if (state === instant) {
                    execute(arguments, closedArgs);
                } else if (state === PENDING) {
                    var args = slice(arguments, 0);
                    for (var i = 0, e; e = args[i++];) {
                        cblist.push(e);
                    }
                }
                return _this;
            };
        }

        this.promise = function(obj) {
            obj = obj || {};
            obj.done = wrap(RESOLVED, doneCBs);
            obj.fail = wrap(REJECTED, failCBs);
            obj.then = function(doneFilter, failFilter) {
                var def = new defer();
                obj.done(function() {
                    def.resolveWith.apply(this, [this].concat(doneFilter.apply(this, arguments)));
                });
                obj.fail(function() {
                    def.rejectWith.apply(this, [this].concat(failFilter ? failFilter.apply(this, arguments) : slice(arguments, 0)));
                });
                return def.promise();
            };
            obj.always = function() {
                _this.done.apply(_this, arguments).fail.apply(_this, arguments);
            };
            return obj;
        };

        this.promise(this);

        if (beforeStart) {
            beforeStart.call(this, this);
        }
    }

    return function(func) {return new defer(func)};
})();

if (typeof define !== 'undefined' && define.amd) {
    define('defer', [], Deferred);
} else if (typeof exports !== 'undefined') {
    exports.Deferred = Deferred;
}

}).call(this);
