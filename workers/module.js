print("!!!!");

var test = require("./module2");

try {
    test.good();
} catch(e) {
    for (var key in e) print(key + " : " + e[key])
    throw e;
}

