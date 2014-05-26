define('load', ['defer', 'events'], function(defer, events) {

    var dependencyBus = new events.EventTarget();

    return {
        startTask: function(dependencies, callback) {
            var promise = defer.when.apply(null,
                dependencies.map(function(dependency) {
                    var def = defer();
                    dependencyBus.one(dependency, def.resolve);
                    return def;
                })
            );
            if (callback) {
                promise.done(callback);
            }
            return promise;
        },
        completeTask: dependencyBus.fire
    };
});
