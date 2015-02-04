jr-crop
======

A simple ionic plugin to crop your images, inspired by whatsapp and telegram.
* Specifiy width and height of target
* Doesn't actually scale the image, only returns a cropped version. Since the quality of images while scaling is inconsistent it's up to the developper to implement this, preferably on the server.
* Returns a canvas element with the new cropped image.

![example](/example.jpg)

## Simple enough, let's get started.
Import jr-crop.js and jr-crop.css in the head, no in the footer, no concat it,.. whatever, just throw it in somewhere.
Declare jrCrop as a dependency
```
.module('myModule', ['ionic', 'jrCrop'])
```
Inject jr-crop.
```
.controller('MyController', function($jrCrop) {
```

Call the crop function to open a new modal where the user can crop this image. Pass in the image url and targetsize. The function will return a promise that resolves when the user is done or fails when the user cancels.
```
$jrCrop.crop({
    url: url,
    width: 200,
    height: 200
}).then(function(canvas) {
    // success!
    var image = canvas.toDataURL();
}, function() {
    // User canceled or couldn't load image.
});
```

Additionally you can add a title in the footer.
```
$jrCrop.crop({
    url: url,
    width: 200,
    height: 200,
    title: 'Move and Scale'
});
```

## Examples please!!
I got ya. Run `bower install && npm install && npm test` and visit `localhost:8181`. Great, now you can visit this from your phone too. It works best when packaged in cordova, as how you should use ionic anyway.

## Support
Though I'm only supporting iOS, I did get reports that it's working well on Android. If it doesn't, feel free to fork and update my codebase. If you just want to leave your thoughts you can reply in the [ionic forum topic](http://forum.ionicframework.com/t/sharing-my-photo-crop-plugin/4961).
