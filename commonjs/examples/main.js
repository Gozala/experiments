var FOO = require("./foo");
var BAR = require("./bar");
exports.main = function() {
    console.log("hey I was loaded as main!!")
}
exports.foo = function() {
    return FOO.hi();
}

if (require.main == module) exports.main();