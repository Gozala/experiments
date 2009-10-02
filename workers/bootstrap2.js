(function(global, evalGlobal) {
    var factories = {};
    var modules = {};

    global.require = function require(topId) {
        if (!modules[topId]) {
            if (!factories[topId]) throw new Error("require error: couldn't find \"" + topId + "\"");
            var path = topId + ".js"
            var exports = modules[topId] = {};
            try {
                factories[topId](require, exports, {id: topId, path: path}, system, system.print);
            } catch (e) {
                throw require("error").wrap(e, null, path);
            }
        }
        return modules[topId];
    }
    global.require.register = function(topId, factory) {
        factories[topId] = factory;
    }

    var system = {
        print: function() {
            if (typeof console != "undefined") console.log(Array.prototype.join.call(arguments, " "));
            postMessage(Array.prototype.join.call(arguments, " "))
        },
        engine: "browser",
        engines: ["browser"]
    };
    // module for wrapping errors
    factories.error = function(require, exports, module, system, print) {
        exports.wrap = function(e, message, fileName, lineNumber) {
            fileName = decodeURIComponent(fileName || e.fileName || e.filename || e.sourceURL);
            fileName = fileName.match(/(?:\@sourceURL(%20)*)([^*]+)/)[2];
            lineNumber = lineNumber || e.lineno || e.line || e.lineNumber;
            var e = e.stack ? e : {__proto__: e};
            e.filename = e.fileName = e.sourceURL = fileName;
            e.lineno = e.line = e.lineNumber = lineNumber;
            return e;
        }
    };
    // sandbox module
    factories.sandbox = function(require, exports, module, system, print) {
        exports.Loader = function (options) {
            var loader = {};
            var factories = options.factories || {};
            var paths = options.paths;
            var sources = options.sources || {};
            var extensions = options.extensions || [".js"];
            var timestamps = {};
            var debug = options.debug;
            loader.resolve = exports.resolve;
            loader.find = function (topId) {
                return topId + extensions[0];
            };
            loader.fetch = function (topId) {
                if (sources[topId]) return sources[topId];
                var path = loader.find(topId);
                var xhr = new XMLHttpRequest();
                xhr.open("GET", path, false);
                xhr.send(null);
                if (xhr.status != 200 && xhr.status != 0) throw xhr.statusText;
                return sources[topId] = [
                    '/*@sourceURL ', path, '*/',
                    'require.register("', topId, '", function(require, exports, module, system, print) {',
                            xhr.responseText,
                    '})'
                ].join("");
            };
            loader.evaluate = function (text) {
                importScripts('data:text/javascript,' + encodeURIComponent(text));
            };
            loader.load = function (topId) {
                if (!Object.prototype.hasOwnProperty.call(factories, topId)) loader.reload(topId);
                return factories[topId];
            };
            loader.reload = function (topId, path) {
                loader.evaluate(loader.fetch(topId, path), topId);
            };
            loader.paths = paths;
            loader.extensions = extensions;
            return loader;
        };
        exports.Sandbox = function (options) {
            options = options || {};
            var loader = options.loader;
            var subsystem = options.system || system || {};
            var sources = options.sources || {};
            var modules = options.modules || {};
            var debug = options.debug !== undefined ? !!options.debug : !!system.debug;

            // managed print free variable in the sandbox forwards
            // to system.print in the sandbox
            var subprint = options.print || function () {
                return subsystem.print.apply(subsystem, arguments);
            };
            var debugDepth = 0;
            var mainId;

            var sandbox = function (id, baseId, force, reload) {
                id = loader.resolve(id, baseId);
                /* populate memo with module instance */
                if (!Object.prototype.hasOwnProperty.call(modules, id) || force) {
                    if (sandbox.debug) {
                        debugDepth++;
                        var debugAcc = "";
                        for (var i = 0; i < debugDepth; i++) debugAcc += "\\";
                        print(debugAcc + " " + id, 'module');
                    }
                    var globals = {};
                    if (sandbox.debug) {
                        // record globals
                        for (var name in global)
                            globals[name] = true;
                    }
                    if (!Object.prototype.hasOwnProperty.call(modules, id) || reload)
                        modules[id] = {};
                    var exports = modules[id];
                    if (reload)
                        loader.reload(id);
                    var factory = null;
                    try {
                        factory = loader.load(id);
                    } finally {
                        // poor man's catch and rethrow (Rhino sets file/line to where the exception is thrown, not created)
                        if (!factory) {
                            delete modules[id];
                            if (sandbox.debug)
                                debugDepth--;
                        }
                    }
                    var require = Require(id);
                    var module = {
                        'id': id,
                        'path': factory.path
                    };
                    factory(require, exports, module, subsystem, subprint);
                    if (sandbox.debug) {
                        // check for new globals
                        for (var name in global)
                            if (!globals[name])
                                system.log.warn("NEW GLOBAL: " + name);
                    }
                    if (sandbox.debug) {
                        var debugAcc = "";
                        for (var i = 0; i < debugDepth; i++) debugAcc += "/";
                        print(debugAcc + " " + id, 'module');
                        debugDepth--;
                    }
                } else {
                    if (sandbox.debug) {
                        var debugAcc = "";
                        for (var i = 0; i < debugDepth; i++) debugAcc += "|";
                        print(debugAcc + "  " + id, 'module');
                    }
                }
                return modules[id];
            };
            var Require = function (baseId) {
                var require = function (id) {
                        return sandbox(id, baseId);
                };
                require.loader = loader;
                require.main = mainId;
                require.paths = loader.paths;
                require.extensions = loader.extensions;
                return require;
            };
            sandbox.force = function (id) {
                return sandbox(id, '', true);
            };
            sandbox.main = function (id) {
                mainId = id;
                return sandbox(id);
            };
            sandbox.loader = loader;
            sandbox.system = system;
            sandbox.paths = loader.paths;
            sandbox.extensions = loader.extensions;
            sandbox.debug = debug;
            return sandbox;
        };
        exports.PrefixLoader = function (prefix, loader) {
            var self = this || {};
            self.resolve = function (id, baseId) {
                return loader.resolve(id, baseId);
            };
            /**** evaluate
            */
            self.evaluate = function (text, topId) {
                return loader.evaluate(text, prefix + topId);
            };
            /**** fetch
            */
            self.fetch = function (topId) {
                return loader.fetch(prefix + topId);
            };
            /**** load
            */
            self.load = function (topId) {
                return loader.load(prefix + topId);
            };
            return self;
        };
        exports.sandbox = function(main, system, options) {
            options = options || {};
            var prefix = options['prefix'];
            var loader = options['loader'] || require.loader;
            var modules = options['modules'] || {};
            var print = options['print'];
            var debug = options['debug'];
            if (!loader) throw new Error(
                "sandbox cannot operate without a loader, either explicitly " +
                "provided as an option, or implicitly provided by the current " +
                "sandbox's 'loader' object."
            );
            if (prefix)
                loader = exports.PrefixLoader(prefix, loader);
            var sandbox = exports.Sandbox({
                modules: modules,
                loader: loader,
                system: system,
                print: print,
                debug: debug
            });
            return sandbox.main(main);
        };
        exports.resolve = function (id, baseId) {
                var topId = (baseId || "").split("/");
                topId.pop();
                var parts = id.split("/");
                var part;
                while (part = parts.shift()) {
                    if (part == ".") continue;
                    if (part == "..") topId.pop();
                    else topId.push(part)
                }
                return topId.join("/");
        };
    };

    // TODO do proper stuff
    global.onmessage = function onmessage(e) {
        try {
            var message = eval(e.data);
            if (message.main) {
                require("sandbox").sandbox(message.main, system, {
                    modules: modules,
                    debug: message.debug,
                    loader: require("sandbox").Loader({
                        factories: factories
                    })
                });
            }
        } catch(e) {
            throw require("error").wrap(e);
        }
    }
})(this, function() { return eval(arguments[0]); })
