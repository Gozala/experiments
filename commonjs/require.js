/*
 * An implementation of the CommonJS Modules 1.0
 * Copyright (c) 2009 by Irakli Gozalishvili
 */
(function(exports, global, module) {
    var modules = {};
    var factories = {};
    var metadata = {};
    var main;

    function sandbox(id, baseId, force, reload) {
        id = loader.resolve(id, baseId);
        if (!modules[id] || force) {
            if (reload) delete factories[id];
            var factory = loader.load(id);
            var require = Require(id);
            var exports = modules[id] = {};
            var module = metadata[id] = metadata[id] || {};
            module.id = id;
            module.path = factory.path;
            module.toString = function () {
                return this.id;
            };
            factory.call({}, require, exports, module);
        }
        return modules[id];
    }
    sandbox.main = function(id) {
        main = sandbox.main = metadata[id] = metadata[id] || {};
        sandbox(id);
        return main;
    };
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
            var xhr = new XMLHttpRequest();
            xhr.open("GET", path, false);
            xhr.send(null);
            if (xhr.status != 200 && xhr.status != 0) throw xhr.statusText;
            return "(function(require, exports, module, system, print) { " + xhr.responseText + "})\n//@ sourceURL=" + path;
        },
        load: function(id) {
            if (factories[id]) return factories[id];
            var path = id + ".js";
            var factory = factories[id] = eval(loader.fetch(path));
            factory.path = path;
            return factory;
        }
    };

    function Require(baseId) {
        function require(id, force, reload) {
            return sandbox(id, baseId, force, reload);
        }
        require.main = main;
        return require;
    }

    var require = exports.require = Require(module.path);
    require.main = sandbox.main;
})(this, this, (function() {
    var path = window.location.toString().split("#")[0];
    path = path.substr(0, path.lastIndexOf("/") + 1) + "require.js";
    return {
        id: "require",
        path: path
    };
})())

