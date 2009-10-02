(function(global) {
    var factories = {};
    var modules = {};
    var sources = {};
    global.require = function require(topId) {
        var path = topId + ".js";
        var xhr = new XMLHttpRequest();
        xhr.open("GET", path, false);
        xhr.send(null);
        if (xhr.status != 200 && xhr.status != 0) throw xhr.statusText;
        var source = sources[topId] = [
            '/*@sourceURL ', path, '*/',
            'require.register("', topId, '", function(require, exports, module, system, print) {',
                    xhr.responseText,
            '})'
        ].join("");
        importScripts('data:text/javascript,' + encodeURIComponent(source));
        //importScripts(encodeURIComponent(source));
        var exports = modules[topId] = {};
        var module = {
            id: topId,
            path: path
        }
        factories[topId](require, exports, module, {}, postMessage);
        return exports;
    }
    require.register = function(topId, factory) {
        factories[topId] = factory;
    }

    function wrap(e, message, fileName, lineNumber) {
            fileName = decodeURIComponent(fileName || e.fileName || e.filename || e.sourceURL);
            fileName = fileName.match(/(?:\@sourceURL(%20)*)([^*]+)/)[2];
            lineNumber = lineNumber || e.lineno || e.line || e.lineNumber;
            var e = e.stack ? e : {__proto__: e};
            e.filename = e.fileName = e.sourceURL = fileName;
            e.lineno = e.line = e.lineNumber = lineNumber;
            return e;
    };


    global.onmessage = function onmessage(e) {
        for (var key in global) postMessage(key);

        try {
            var module = require(e.data);
        } catch(e) {
            throw wrap(e);
        }
        for (var key in module) postMessage(key + " : " + module[key]);
    }
})(this)

for (var key in this) postMessage(key);