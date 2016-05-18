// Heroku insists on having a web role.
var http = require('http');
http.createServer(function(request, response) {}).listen(process.env.PORT || 5000);
