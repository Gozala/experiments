function live(ms) {
    return [
        "data:application/octet-stream,",
        "HTTP/1.1 200 OK\n",
        "Content-Type: text/html; charset=UTF-8\n",
        "Keep-Alive: ", ms,
        "\n\n",
        ", ", new Date().getTime()
    ].join("");
}
function sleep(ms) {
    var wakeup = new Date().getTime() + ms;
    while (wakeup > new Date().getTime()) {}
}
function suspend(ms) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", live + ms, false);
}
exports.main = function() {
    print("Going to sleep now for a 10 secs :" + new Date());
    sleep(10 * 1000);
    print("Wakeing up !!! :" + new Date());
}

if (module.id == require.main || true) exports.main();