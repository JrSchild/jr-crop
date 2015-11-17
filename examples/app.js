var fs = require('fs');
var path = require('path');
var express = require('express');
var formidable = require('formidable');
var app = express();

app.use(express.static('./'));
app.use(express.static('./examples'));

var types = {
  'image/jpeg': 'jpg',
  'image/png': 'png'
};

// Upload the file to memory.
app.post('/upload', function (req, res) {

  // Parse the request. Any body-parser can be used for this.
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {

    // The key was set as 'image' on the formData object in the client.
    var file = files.image;

    if (!file) {
      return res.status(400).send('No image received');
    }

    var extension = types[file.type.toLowerCase()];

    // Make sure the extension is valid.
    if (!extension) {
      return res.status(400).send('Invalid file type');
    }

    // Target path is uploads directory relative to this file.
    var target = path.resolve(__dirname, 'uploads', Date.now() + '.' + extension);

    // Copy the file from the tmp folder to the uploads location
    fs.createReadStream(file.path)
      .pipe(fs.createWriteStream(target));

    res.status(200).send();
  });
});

var server = app.listen(8181, function () {
  console.log('Running jr-crop example server. Visit http://localhost:8181');
});