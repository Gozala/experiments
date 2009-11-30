/**
 * Module loader should ignore commented calls on require
 var test = require("fake");
 */
 require("bar");
 exports.hi = function() {
    return "Hello World!!";
 }