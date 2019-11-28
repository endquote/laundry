const process = require('child_process');
const res = process.execSync(`php ${__dirname}/instagram.timeline.php "endquote" "%iH743o>fW7#3N%7"`);
const json = JSON.parse(res);
console.log(json);
