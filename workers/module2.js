exports.good = function(msg) {
    return exports.bad(msg)
}
exports.bad = function(msg) 

    throw new Error("Ooopps!!")
}