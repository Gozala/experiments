exports.good = function(msg) {
    return exports.bad(msg)
}
exports.test = "yei";
exports.bad = function(msg) {

    throw new Error("Ooopps!!")
}