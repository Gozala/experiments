/*
 * An implementation of the CommonJS Modules 1.0
 * Copyright (c) 2009 by Irakli Gozalishvili
 */
(function(exports, global, module) {
    var REQUIRE_MATCH = /require\s*\(('|")([\w\W]*?)('|")\)/mg;
    var COMMENTS_MATCH = /(\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\/)|(\/\/.*)/g;
    var modules = {};
    var factories = {};
    var metadata = {};
    var main;

    function Observable() {
        this.observers = {};
    };
    Observable.prototype = {
        constructor: Observable,
        observe: function(topic, observer, scope) {
            var observers = this.observers;
            observers = observers[topic] = observers[topic] || [];
            observers.push({
                observer: observer,
                scope: scope
            })
            return this;
        },
        notify: function(topic) {
            var observers = this.observers[topic];
            if (observers) {
                var args = Array.prototype.slice.call(arguments, 1);
                for (var i = 0, l = observers.length; i < l; i++) {
                    var observer = observers[i];
                    observer.observer.apply(observer.scope, args);
                }
            }
        }
    };

    function sandbox(id, baseId) {
        id = loader.resolve(id, baseId);
        load(id);
        return modules[id];
    }
    sandbox.main = function(id) {
        main = sandbox.main = metadata[id] = metadata[id] || {};
        sandbox(id);
        return modules[id];
    };
    function load(id) {
        var promise = new Observable();
        if (modules[id]) {
            setTimeout(function() {
                promise.notify("load");
            }, 0);
        } else {
            var require = Require(id);
            var exports = modules[id] = {};
            var module = metadata[id] = metadata[id] || {};
            module.id = id;
            module.path = id + ".js";
            module.toString = function () {
                return this.id;
            };
            loader.fetch(module.path).observe("receive", function(source) {
                var factory = factories[id] = eval(source);
                var dependcies = module.depends = depends(factory);
                var l = dependcies.length;
                var pending = l + 1;
                var next = (function next() {
                    pending --;
                    if (pending > 0) return next;
                    factory.call({}, require, exports, module);
                    promise.notify("load");
                })();
                while (l--) load(loader.resolve(dependcies[l], id)).observe("load", next);
            });
        }
        return promise;
    }
    function depends(module) {
        var source = module.toString().replace(COMMENTS_MATCH, "");
        var dependency, dependencies = [];
        while(depenedency = REQUIRE_MATCH.exec(source)) dependencies.push(depenedency[2]);
        return dependencies;
    }

    var loader = {
        resolve: function(id, baseId) {
            if (!baseId || 0 < id.indexOf("://")) return id;
            var base = baseId.split("/");
            base.pop();
            var part, parts = id.split("/");
            while (part = parts.shift()) {
                if (part == ".") continue;
                if (part == "..") base.pop();
                else base.push(part)
            }
            return base.join("/");
        },
        fetch: function (path) {
            var promise = new Observable();
            var xhr = new XMLHttpRequest();
            xhr.open("GET", path, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if((xhr.status == 200 || xhr.status == 0) && xhr.responseText != "") {
                        var source = "(function(require, exports, module, system, print) { "
                                + xhr.responseText + "})\n//@ sourceURL=" + path;
                        promise.notify("receive", source)
                    } else {
                        throw new Error("Cant fetch module from: " + path);
                    }
                }
            }
            xhr.send(null);
            return promise;
        }
    };

    function Require(baseId) {
        var require = function(id) {
            return sandbox(id, baseId);
        }
        require.main = main;
        return require;
    }

    exports.require = sandbox;
})(this, this)

