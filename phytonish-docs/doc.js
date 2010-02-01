exports = exports || {};

Function.prototype.doc = function() {
    var source = this.toString();
    var l = source.length;
    source = source.replace(/^[^\n]*\s*\[/, "");
    return (l ==  source.length ? "" : source.replace(/["']\][\s\S]*/, "")
        .replace(/\\\n\s*/g, "\n").replace(/\s*\@/g, "\n@"));
}
Function.prototype.testdoc = function() {
    return this.toString().replace(/^[^\n]*\s*\[/, "");
}

exports.commenty = function commenty() {
    /*
    This is a function foo \
    which is supposed to do something.\
    \
    But the most important thing is that it has nice documentation integrated in it.\
    @param {String} a               first argument\
    @param {String} b               second argument\
    @returns {String}               computed string value"
    return stringy.doc();
    */
}

exports.stringy = function stringy() {
    "This is a function foo \
    which is supposed to do something.\
    \
    But the most important thing is that it has nice documentation integrated in it.\
    @param {String} a               first argument\
    @param {String} b               second argument\
    @returns {String}               computed string value"
    return stringy.doc();
}
exports.foo = function foo(a, b) {
["This is a function foo \
which is supposed to do something.\
\
But the most important thing is that it has nice documentation integrated in it.\
@param {String} a               first argument\
@param {String} b               second argument\
@returns {String}               computed string value"]
return [a, b].join(" ");
}

exports.bar = function bar(param) {
    ["''\
    This is another function that is documented pythonish way\
    but in slightly different manner -> a la js strict mode idea :)\
    \
    function itself is dummy so it just returns type of the passed argument\
    \
    @param {Object|String|Number} param\
    @returns {String}             type of the first argument\
    ''"]
    return typeof param
}

