var messages = [];
var worker = new Worker("bootstrap.js");
worker.onmessage = function(e) {
    messages.unshift(e.data)
    console.log(e.data);
}
worker.onerror = function(e) {
    console.error(e instanceof Error)
}

worker.postMessage('({main: "module", debug: true})')