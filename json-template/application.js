require.setup({
    global: window,
    prefix: "lib/",
    system: {
        print: function print() {
            console.log(Array.prototype.join.call(arguments, " "));
        }
    }
}).main("main");
