/*
 * An implementation of the CommonJS Modules 1.0
 * Copyright (c) 2009 by Irakli Gozalishvili
 */
var require = function require(id) { // wiil be replaced by require.setup
    return require.setup({ global: window })(id);
};
require.main = function main(id) { // wiil be replaced by require.setup
    return require.setup({ global: window }).main(id);
}
require.setup = function setup(properties) {
    var REQUIRE_MATCH = /require\s*\(('|")([\w\W]*?)('|")\)/mg;
    var COMMENTS_MATCH = /(\/\*([^*]|[\r\n]|(\*+([^*\/]|[\r\n])))*\*+\/)|((^|\n)[^\'\"\n]*\/\/[^\n]*)/g;
    var global = properties.global || {};
    var prefix = properties.prefix || "";
    var packages = properties.packages || {};
    var modules = properties.modules || {};
    var factories = properties.factories || {};
    var sources = properties.sources || {};
    var print = properties.print || function print() {};
    factories[prefix + "system"] = function(require, exports, module, print) {
        var args = [];
        var env = {};
        var params = window.location.search.substr(1).split("&");
        for (var i = 0, l = params.length; i < l; i++) {
            var parts = params[i].split("=");
            var key = decodeURIComponent(parts[0]);
            if (key) {
                args.push(key);
                var value = parts[1];
                if (value) args.push(env[key] = decodeURIComponent(value));
            }
        }
        params = null;
        function stdio() {
            var buffer = [];
            return {
                write: function(text) {
                    buffer.push(text.toString());
                    return this;
                },
                flush: function() {
                    print(buffer.splice(0).join(""));
                    return this;
                }
            }
        }
        exports.stdin  = null; /* TODO */
        exports.stdout = stdio();
        exports.stderr = stdio();
        exports.args = args;
        exports.print = print;
        exports.env  = env;
    };

    function Promise() {}
    Promise.prototype.when = function() {};
    var waiting = [], metadata = {}, main;
    
    function sandbox(id, baseId) {
        id = loader.resolve(id, baseId);
        load(id);
        return modules[id];
    }
    var requirer = function require(id) {
        return sandbox(id);
    }
    requirer.main = function(id) {
        id = loader.resolve(id, prefix);
        requirer.main = main = metadata[id] = metadata[id] || {};
        load(id);
        return modules[id];
    };
    requirer.setup = setup;
    function load(id) {
        var promise = new Promise();
        var packageId = id.split("/")[0];
        var path = ((packageId in packages) ? packages[packageId] + id.substr(packageId.length) : id) + ".js";
        var factory = factories[id];
        var source = sources[id];
        var module = modules[id];
        if (factory || source || module) {
            try {
                if (!factory && source) {
                    factory = factories[id] = eval(sources[id]);
                }
                if (factory) {
                    var require = Require(id);
                    var exports = modules[id] || (modules[id] = {});
                    module = metadata[id] || (metadata[id] = {});
                    module.id = id;
                    module.path = path;
                    factory.call({}, require, exports, module, print);
                }
            } catch(e) {
                var lineNumber = lineNumber || e.lineno || e.line || e.lineNumber;
                e.lineno = e.line = e.lineNumber = lineNumber;
                e.filename = e.fileName = e.sourceURL = path;
                throw e;
            }
            setTimeout(function() { promise.when(); }, 0);
        } else {
            modules[id] = {};
            waiting.push(id);
            loader.fetch(path).when = function(source, text) {
                var dependency, dependencies = depends(text);
                sources[id] = source;
                while (dependency = dependencies.shift()) {
                    dependency = loader.resolve(dependency, id);
                    if (waiting.indexOf(dependency) >= 0 || sources[dependency]
                        || factories[dependency] || modules[dependency]) continue;
                    waiting.push(dependency);
                    load(dependency).when = (function(dependency) {
                        waiting.splice(waiting.indexOf(dependency), 1);
                        if (!waiting.length) {
                            load(id);
                            promise.when();
                        }
                    });
                }
                waiting.splice(waiting.indexOf(id), 1);
                if (!waiting.length) load(id);
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
            if (0 < id.indexOf("://")) return id;
            var part, parts = id.split("/");
            var root = parts[0];
            if (root.charAt(0) != ".") return prefix + id;
            baseId = baseId || prefix;
            var base = baseId.split("/");
            base.pop();
            
            while (part = parts.shift()) {
                if (part == ".") continue;
                if (part == ".." && base.length) base.pop();
                else base.push(part);
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
                        var text = xhr.responseText;
                        var source = "(function(require, exports, module, print) { "
                                + text + "\n//*/\n})\n//@ sourceURL=" + path;
                        promise.when(source, text);
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
    // overriding global require in case if it' pre setuped one
    if (requirer.toString() != require.toString()) require = requirer;
    return requirer;
};
