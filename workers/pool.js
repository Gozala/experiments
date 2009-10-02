var messages = [];
var worker = new Worker("bootstrap2.js");
worker.onmessage = function(e) {
    messages.unshift(e.data)
    console.log(e.data);
}
worker.onerror = function(e) {
    console.error(e instanceof Error)
}

worker.postMessage('({main: "module", debug: true})')

var worker2 = new Worker("worker2.js");
worker2.onmessage = function(e) {
    messages.unshift(e.data)
    console.log(e.data);
}
worker2.onerror = function(e) {
    console.error(e instanceof Error)
}
//worker2.postMessage('module');