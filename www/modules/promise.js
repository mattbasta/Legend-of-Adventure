define('promise', ['defer'], function(defer) {
    function Promise(func) {
        var def = defer();
        func(def.resolve, def.reject);
        return def.promise();
    };

    Promise.when = defer.when;
    return Promise;
});
