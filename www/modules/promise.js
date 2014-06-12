define('promise', ['defer'], function(defer) {
    'use strict';

    function Promise(func) {
        var def = defer();
        func(def.resolve, def.reject);
        return def.promise();
    }

    Promise.when = defer.when;
    return Promise;
});
