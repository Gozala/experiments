(function(global) {
    var ABSOLUTE_MATCH = /^\S+:\/\//;
    var EXTENSION_MATCH = /\.[^\/]+$/;
    var SOURCE_FILENAME = /(?:\@sourceURL(%20)*)([^*]+)/;
    var EMPTY = "";
    /**
     * A lookup table of module top level identifiers to module factories.
     * These are predifined or constructed by calling
     * importScripts("data:text/javascript,.....")
     */
    var factories = {};
    /**
     * A lookup table of module top level identifiers to module exports objects.
     * These are constructed by calling the module factory with (require, exports, ...).
     */
    var modules = {};
    /**
     * Print function - postsMessage to the main thread where sandbox mirror
     * passes data to the system's print function.
     */
    function print(message) {
        postMessage(message)
    }
    /**
     * Temporry used module loader which loads modules only from predefined factories.
     * @param {String} topId            module top level identifier
     * @returns {Object}                Dictionary of module exported values
     */
    var require = global.require = function require(topId) {
        if (!modules[topId]) {
            if (!factories[topId]) throw new Error("require error: couldn't find \"" + topId + "\"");
            var exports = modules[topId] = {};
            factories[topId](require, exports, {id: topId}, system, system.print);
        }
        return modules[topId];
    }
    /**
     * Function used to register fetched module factories.
     * @param {String} topId            module top level identifier
     * @param {Function} factory        module factory function
     */
    require.register = function(topId, factory) {
        factories[topId] = factory;
    }
    /**
     * Predefined error handler module.
     */
    factories.error = function(require, exports, module, system, print) {
        /**
         * Error wrapper function that wraps module exceptions in a way
         * that wrapped exceprion dispalys coorect file name & line number
         * of code that caused the exception. Values can be overrided with
         * optional arguments.
         * @param {Error} e                 Exception to be wrapped
         * @param {String} message          Human-readable description of the error
         * @param {String} fileName         The name of the file containing the code that caused the exception
         * @param {Number} lineNumber       The line number of the code that caused the exception
         */
        exports.wrap = function(e, message, fileName, lineNumber) {
            fileName = decodeURIComponent(fileName || e.fileName || e.filename || e.sourceURL);
            fileName = fileName.match(SOURCE_FILENAME)[2];
            lineNumber = lineNumber || e.lineno || e.line || e.lineNumber;
            var e = e.stack ? e : {__proto__: e};
            e.filename = e.fileName = e.sourceURL = fileName;
            e.lineno = e.line = e.lineNumber = lineNumber;
            return e;
        }
    };
    /**
     * Predefined sandbox module factory
     */
    factories.sandbox = function(require, exports, module, system, print) {
        exports.Loader = function (options) {
            var loader = {};
            var factories = options.factories || {};
            var paths = options.paths;
            var sources = options.sources || {};
            var extensions = options.extensions || [".js"];
            var debug = options.debug;
            loader.resolve = exports.resolve;
            loader.find = function (topId) {
                if (ABSOLUTE_MATCH.test(topId)) return topId.replace(EXTENSION_MATCH, EMPTY) + extensions[0];
                return loader.resolve(topId, system.prefix) + extensions[0];
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
                ].join(EMPTY);
            };
            loader.evaluate = function (text) {
                importScripts("data:text/javascript," + encodeURIComponent(text));
            };
            loader.load = function (topId) {
                if (!Object.prototype.hasOwnProperty.call(factories, topId)) loader.reload(topId);
                var factory = factories[topId];
                factory.path = loader.find(topId);
                return factory;
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
            var loader = options.loader || exports.Loader(options);
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
                        var debugAcc = EMPTY;
                        for (var i = 0; i < debugDepth; i++) debugAcc += "+";
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
                        var debugAcc = EMPTY;
                        for (var i = 0; i < debugDepth; i++) debugAcc += "-";
                        print(debugAcc + " " + id, 'module');
                        debugDepth--;
                    }
                } else {
                    if (sandbox.debug) {
                        var debugAcc = EMPTY;
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
        exports.resolve = function (id, baseId) {
            if (!baseId) return id;
            var topId = baseId.split("/");
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

    var sandbox;
    global.onmessage = function onmessage(event) {
        try {
            var options = eval("(" + event.data + ")");
            if (!sandbox) {
                global.system = options.system;
                system.print = print;
                options.factories = factories;
                sandbox = require("sandbox").Sandbox(options);
            }
            if (options.main) sandbox = sandbox.main(options.main);
            if (options.force) sandbox.force(options.force);
        } catch(error) {
            try {
                var e = require("error").wrap(error);
            } catch(e) {
                throw error;
            }
            throw e;
        }
    }
})(this);

