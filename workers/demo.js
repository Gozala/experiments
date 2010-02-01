var error;
try {
    var sandbox = Sandbox({
        prefix: "lib/",
        debug: true
    }).main("app");
} catch(e) {
    throw error = e;
}