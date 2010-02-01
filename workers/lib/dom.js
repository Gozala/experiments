require("../json");
var queue = require("queue");

exports.$ = function(selector, callback) {
    queue.add(callback);
    postMessage(JSON.parse({
        method: "$"
        params: [selector]
    }));
}