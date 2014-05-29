var static = require('node-static');

var fileServer = new static.Server('../');

require('http').createServer(function (req, res) {
  req.addListener('end', function () {
    fileServer.serve(req, res);
  }).resume();
}).listen(8080);

console.log('Running jr-crop example server.');