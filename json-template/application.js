require.init({
    global: window,
    prefix: "lib/",
    system: {
        print: function print() {
            console.log(Array.prototype.join.call(arguments, " "));
        }
    }
});
require.main("main");
