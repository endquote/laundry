/* 
Settings file for use with enclose.js
Run with this command:
enclose --config enclose.js --output ./bin/laundry index.js
*/

module.exports = {
    scripts: "+(washers|items)/*.js",
    dirs: ["./washers/*.js", "./items/*.js"]
};