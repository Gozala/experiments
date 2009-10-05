(function(global) {
    // defining print function based on prowser capabilities
    var print;
    if (typeof console != "undefined") print = function(message) { console.log(message) }
    else if (typeof dump != "undefined") print = function(message) { dump(message); }
    else print = function() {};
    // defining root of the
    var SEPERATOR = "/";
    var EMPTY = "";
    var root = global.location.href.split(SEPERATOR);
    root.pop();
    root.push(EMPTY);
    root = root.join(SEPERATOR);
    //
    var ABSOLUTE_MATCH = /^\S+:\/\//;
    var BOOTSTRAP = "bootstrap.js";

    var Sandbox = global.Sandbox = function Sandbox(options) {
        if (!(this instanceof Sandbox)) return new Sandbox(options);
        var system = this.system = options.system || {};
        system.print = options.print || print;
        this.worker = new Worker(BOOTSTRAP);
        this._modules = system.modules || [];
        this.worker.onmessage = (function(self) { return function(event) {
            self._onmessage(event);
        }})(this);
        var engine = system.engine = system.engine || "browser";
        var prefix = options.prefix || EMPTY;
        if (!ABSOLUTE_MATCH.test(prefix)) prefix = [root, prefix].join(EMPTY);
        this.prefix = prefix;
        var paths = this.paths = options.paths || [];
        var sources = this.sources = options.sources;
        var extensions = this.extensions = options.extensions || [".js"];
        var debug = this.debug = options.debug;
        this.worker.postMessage(JSON.stringify({
            sources: sources,
            system: {
                engine: engine,
                engines: system.engines || [engine],
                prefix: prefix
            },
            extensions: extensions,
            paths: paths,
            debug: debug
        }));
    };
    Sandbox.prototype = {
        _modules: null,
        _onmessage: function(event) {
            var msg;
            try {
                msg = JSON.stringify(event.data);
            } catch(e) {
                msg = event.data;
            }
            if (typeof msg == "string") this.system.print(msg);
            else {
                var modules = this._modules;
                for (var i = 0, length = modules.length; i < length; i++ )
                    modules[i](data);
            }
        },
        main: function(topId) {
            this.worker.postMessage(JSON.stringify({
                main: topId
            }));
            return this;
        },
        force: function(id) {
            this.worker.postMessage(JSON.stringify({
                force: id
            }));
            return this;
        },
        system: null,
        paths: null,
        extensions: null,
        debug: null
    };
})(this);