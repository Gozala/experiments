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
    var paths = properties.paths || {};
    var modules = properties.modules || {};
    var factories = properties.factories || {};
    var sources = properties.sources || {};
    var system = modules[prefix + "system"] = properties.system || { print: function print() {} };
    var waiting = [], metadata = {}, main;

    function Promise() {}
    Promise.prototype.when = function() {};

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
        var path = id + ".js";
        if (factories[id] || sources[id] || modules[id]) {
            if (!factories[id] && sources[id]) {
                var require = Require(id);
                var exports = modules[id];
                var module = metadata[id] || (metadata[id] = {});
                module.id = id;
                module.path = path;
                module.toString = function () { return this.id; };
                try {
                    var factory = factories[id] = eval(sources[id]);
                    factory.call({}, require, exports, module, system, system.print);
                } catch(e) {
                    var lineNumber = lineNumber || e.lineno || e.line || e.lineNumber;
                    e.lineno = e.line = e.lineNumber = lineNumber;
                    e.filename = e.fileName = e.sourceURL = module.path;
                    throw e;
                }
            }
            setTimeout(function() {
                promise.when();
            }, 0);
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
            if (root.charAt(0) != ".") {
                if (root in paths) {
                    parts.shift();
                    return paths[root] + parts.join("/");
                }
                return prefix + id;
            }
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
                        var source = "(function(require, exports, module, system, print) { "
                                + text + "})\n//@ sourceURL=" + path;
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
