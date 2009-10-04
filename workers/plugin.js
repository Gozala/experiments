var Utils = require("string-utils");
exports.foo = function() {

}
exports.main = function() {
    print("Starting app!!");
    print(Utils.trim("  Now we'll trim this line useing module from other file!    "));
    print("Time to have exception in the required module and demo how nicely line numbers and filenames are reolved");
    Utils.error();
}

if (require.main == module.id) exports.main();

