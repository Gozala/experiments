/*
 * An implementation of the CommonJS Modules 1.0
 * Copyright (c) 2009 by Irakli Gozalishvili
 */
(function(exports, global, module) {
    var REQUIRE_MATCH = /require\s*\(('|")([\w\W]*?)('|")\)/mg;
    var COMMENTS_MATCH = /(\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\/)|(\/\/.*)/g;
    var modules = {};
    var factories = {};
    var sources = {};
    var waiting = [];
    var metadata = {};
    var main;

    function Promise() {}
    Promise.prototype.when = function() {};

    function sandbox(id, baseId) {
        id = loader.resolve(id, baseId);
        load(id);
        return modules[id];
    }
    function require(id) {
        return sandbox(id);
    }
    require.main = function(id) {
        main = metadata[id] = metadata[id] || {};
        sandbox(id);
        return modules[id];
    };
    function load(id) {
        var promise = new Promise();
        var path = id + ".js";
        if (factories[id] || sources[id]) {
            if (!factories[id]) {
                var require = Require(id);
                var exports = modules[id];
                var module = metadata[id] = metadata[id] || {};
                module.id = id;
                module.path = path;
                module.toString = function () {
                    return this.id;
                };
                var factory = factories[id] = eval(sources[id]);
                factory.call({}, require, exports, module);
            }
            setTimeout(function() {
                promise.when();
            }, 0);
        } else {
            modules[id] = {};
            waiting.push(id);
            loader.fetch(path).when = function(source) {
                var dependency, dependencies = depends(sources[id] = source);
                while (dependency = dependencies.shift()) {
                    dependency = loader.resolve(dependency, id);
                    if (waiting.indexOf(dependency) >= 0 || sources[dependency]) continue;
                    waiting.push(dependency);
                    load(dependency).when = (function(dependency) {
                        waiting.splice(waiting.indexOf(dependency), 1);
                        if (0 == waiting.length) {
                            load(id);
                            promise.when();
                        }
                    });
                }
                waiting.splice(waiting.indexOf(id), 1);
                promise.when();
            };
        }
        return promise;
    }
    function depends(source) {
        var source = source.replace(COMMENTS_MATCH, "");
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
            var promise = new Promise();
            var xhr = new XMLHttpRequest();
            xhr.open("GET", path, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if((xhr.status == 200 || xhr.status == 0) && xhr.responseText != "") {
                        var source = "(function(require, exports, module, system, print) { "
                                + xhr.responseText + "})\n//@ sourceURL=" + path;
                        promise.when(source);
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

    exports.require = require;
})(this, this)

