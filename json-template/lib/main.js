//var Template = require("http://github.com/andychu/json-template/raw/master/lib/json-template").Template;
var Template = require("file:///Users/gozala/Projects/json-template/lib/json-template").Template;

// require("foo/bar")

var sourceView, dataView, outputView, preView;
exports.main = function() {
    global.document.getElementById("render").addEventListener("click", exports.render, false);
    sourceView = global.document.getElementById("template");
    dataView = global.document.getElementById("data")
    outputView = global.document.getElementById("output");
    preView = global.document.getElementById("preview");
}
exports.render = function() {
    var source = sourceView.value;
    var data = dataView.value;
    var template = new Template(source);
    var output = template.expand(JSON.parse(data));
    outputView.textContent = output;
    preView.src = "data:text/html," + encodeURIComponent(output);
}

if (require.main == module) exports.main();