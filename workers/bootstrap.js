function Sandbox(options) {
    var system = options.system || {};
    var print = system.print || (function() {
        return function() {
            var message = Array.prototype.join.call(arguments, "");
            if (typeof console != "undefined") console.log(message);
            else if (typeof dump != "undefined") dump(message);
        }
    })();

    var sources = options.sources;
    var sourcesJSON = [];
    if (sources) {
        for (var key in sources) {
            var source = sources[key];
            if (typeof source == "string") sourcesJSON.push([key, ":\"", source, "\""].join(""));
        }
    }
    var props = ["{",
            "system: {",
                "engine: '", (system.engine || "worker"), "',",
            "},",
            "sources: {",
                sourcesJSON.join(",\n"),
            "},",
            "debug: ", options.debug,
        "}"].join("");

    var worker = new Worker("narwhal.js");
    worker.onmessage = function(e) {
        var data = eval(e.data);
        switch(data.method) {
            case "print":
                print(data.args);
            default:

            ;
        }
    };
    return function (id, baseId, force, reload) {
        print(["([", props, ", '", id || baseId, "'])"].join(""));
        worker.postMessage(["([", props, ",'", id || baseId, "'])"].join(""));
    }
}

