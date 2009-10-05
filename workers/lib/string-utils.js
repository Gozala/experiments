var ltrim = exports.ltrim = function(text) {
    return text.replace(/^\s*/,"");
}
var rtrim = exports.rtrim = function(text) {
    return text.replace(/\s*$/,"");
}
exports.trim = function(text) {
    return rtrim(ltrim(text));
}
exports.error = function() {
    throw new Error("Ooopps!!")
}