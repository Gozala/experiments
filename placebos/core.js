(function(global) {
    var UNDEFINED = "undefined";
    var OBJECT = "object";
    var FUNCTION = "function";
    var CATCH_ALL = "::";
    function proxy(accessor, proto, key, value) {
        var keyType = typeof(key);
        var valueType = typeof(value);
        var catchall = proto[CATCH_ALL];
        var catchallType = typeof(catchall);
        if (keyType == UNDEFINED) {
            // new instance
        } else if (keyType == OBJECT) {
            // inherit
        } else if (valueType == UNDEFINED) {
            // get
            var property = proto[key];
            var type = typeof(property);
            if (type == FUNCTION) {             // invoker
                return function invoke() {
                    return proto[key].apply(accessor, arguments)
                };
            } else if (type == UNDEFINED) {     // catch all
                if (catchallType == FUNCTION) {
                    return catchall.call(accessor, key, value)
                }
            } else {                            // property
                return property;
            }
        } else {
            return proto[key] = value;
        }
    }
    global.Base = function Base(proto) {
        return function accessor(key, value) {
            return proxy(accessor, proto, key, value);
        }
    }
})(this)


// @example
var placebo = Base({
    name: null,
    hello: function() {
        return "Hello " + this("name");
    }
});
placebo("name", "Molko");                         // define property
placebo("hello")();                               // > Hello Molko
placebo("bye", function(name) {                   // define method
    return "Bye " + (name || this("name"));
});
placebo("bye")("Anonymus");                       // > Bye Anonymus
placebo("::", function catchAll(key, value) {
    return "property '" + key + "' is not defined";
})
placebo("willItThorw?")                            // > property 'willItThorw?' is not defined