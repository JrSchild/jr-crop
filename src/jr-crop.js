/**
 * jr-crop - A simple ionic plugin to crop your images.
 * @version 1.0.0
 * @link https://github.com/JrSchild/jr-crop
 * @author Joram Ruitenschild
 * @license MIT
 */
angular.module('jrCrop', [])

.factory('$jrCrop', [
  '$ionicModal',
  '$rootScope',
  '$q',
function($ionicModal, $rootScope, $q) {

  
  var headerHTML = '<div class="bar bar-header bar-dark jr-crop-footer">' +
	  		         '<button class="button button-clear" ng-click="cancel()">{{cancelText}}</button>' +
	  		         '<div class="title">{{title}}</div>' +
	  		         '<button class="button button-clear" ng-click="crop()">{{chooseText}}</button>' +
	  		       '</div>';
  
  var centerHTML = '<div class="jr-crop-center-container">' +
                      '<div class="jr-crop-img" ng-style="{width: width + \'px\', height: height + \'px\'}"></div>' +
                    '</div>' +
                    '<div class="jr-crop-center-container">' +
                      '<div class="jr-crop-select" style="overflow: hidden" ng-style="{width: width + \'px\', height: height + \'px\'}"></div>' +
                    '</div>';
  
  var footerHTML = '<div class="bar bar-footer bar-dark jr-crop-footer">' +
                     '<button class="button button-clear" ng-click="cancel()">{{cancelText}}</button>' +
                     '<div class="title">{{title}}</div>' +
                     '<button class="button button-clear" ng-click="crop()">{{chooseText}}</button>' +
                   '</div>';
  
	/**
	 * resize a canvas using the resample_hermite algorithm
	 * Courtesy of viliusle
	 * https://github.com/viliusle/Hermite-resize
	 */
	function resize(canvas, W, H, W2, H2){
		var time1 = Date.now();
		W2 = Math.round(W2);
		H2 = Math.round(H2);
		var img = canvas.getContext("2d").getImageData(0, 0, W, H);
		var img2 = canvas.getContext("2d").getImageData(0, 0, W2, H2);
		var data = img.data;
		var data2 = img2.data;
		var ratio_w = W / W2;
		var ratio_h = H / H2;
		var ratio_w_half = Math.ceil(ratio_w/2);
		var ratio_h_half = Math.ceil(ratio_h/2);
		for(var j = 0; j < H2; j++){
			for(var i = 0; i < W2; i++){
				var x2 = (i + j*W2) * 4;
				var weight = 0;
				var weights = 0;
				var weights_alpha = 0;
				var gx_r = gx_g = gx_b = gx_a = 0;
				var center_y = (j + 0.5) * ratio_h;
				for(var yy = Math.floor(j * ratio_h); yy < (j + 1) * ratio_h; yy++){
					var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
					var center_x = (i + 0.5) * ratio_w;
					var w0 = dy*dy //pre-calc part of w
					for(var xx = Math.floor(i * ratio_w); xx < (i + 1) * ratio_w; xx++){
						var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
						var w = Math.sqrt(w0 + dx*dx);
						if(w >= -1 && w <= 1){
							//hermite filter
							weight = 2 * w*w*w - 3*w*w + 1;
							if(weight > 0){
								dx = 4*(xx + yy*W);
								//alpha
								gx_a += weight * data[dx + 3];
								weights_alpha += weight;
								//colors
								if(data[dx + 3] < 255)
									weight = weight * data[dx + 3] / 250;
								gx_r += weight * data[dx];
								gx_g += weight * data[dx + 1];
								gx_b += weight * data[dx + 2];
								weights += weight;
							}
						}
					}
				}
				data2[x2] = gx_r / weights;
				data2[x2 + 1] = gx_g / weights;
				data2[x2 + 2] = gx_b / weights;
				data2[x2 + 3] = gx_a / weights_alpha;
			}
		}
		console.log("hermite = "+(Math.round(Date.now() - time1)/1000)+" s");
		canvas.getContext("2d").clearRect(0, 0, Math.max(W, W2), Math.max(H, H2));
		canvas.width = W2;
		canvas.height = H2;
		canvas.getContext("2d").putImageData(img2, 0, 0);
	};
  
  var jrCropController = ionic.views.View.inherit({

    promise: null,
    imgWidth: null,
    imgHeight: null,

    // Elements that hold the cropped version and the full
    // overlaying image.
    imgSelect: null,
    imgFull: null,

    // Values exposed by scaling and moving. Needed
    // to calculate the result of cropped image
    posX: 0,
    posY: 0,
    scale: 1,
	rotate: 0,

    last_scale: 1,
    last_posX: 0,
    last_posY: 0,
	last_rotate: 0,

    initialize: function(options) {
      var self = this;

      self.options = options;
      self.promise = $q.defer();
      self.loadImage().then(function(elem) {
        self.imgWidth = elem.naturalWidth;
        self.imgHeight = elem.naturalHeight;

        self.options.modal.el.querySelector('.jr-crop-img').appendChild(self.imgSelect = elem.cloneNode());
        self.options.modal.el.querySelector('.jr-crop-select').appendChild(self.imgFull = elem.cloneNode());

        self.bindHandlers();
        self.initImage();
      });

      // options === scope. Expose actions for modal.
      self.options.cancel = this.cancel.bind(this);
      self.options.crop = this.crop.bind(this);
    },

    /**
     * Init the image in a center position
     */
    initImage: function() {
      if (this.options.height < this.imgHeight || this.options.width < this.imgWidth) {
        var imgAspectRatio = this.imgWidth / this.imgHeight;
        var selectAspectRatio = this.options.width / this.options.height;

        if (selectAspectRatio > imgAspectRatio) {
          this.scale = this.last_scale = this.options.width / this.imgWidth;
        } else {
          this.scale = this.last_scale = this.options.height / this.imgHeight;
        }
      }

      var centerX = (this.imgWidth - this.options.width) / 2;
      var centerY = (this.imgHeight - this.options.height) / 2;

      this.posX = this.last_posX = -centerX;
      this.posY = this.last_posY = -centerY;

      this.setImageTransform();
    },

    cancel: function() {
      var self = this;

      self.options.modal.remove().then(function() {
        self.promise.reject('canceled');
      });
    },

    /**
     * This is where the magic happens
     */
    bindHandlers: function() {
      var self = this,

          min_pos_x = 0, min_pos_y = 0,
          max_pos_x = 0, max_pos_y = 0,
          transforming_correctX = 0, transforming_correctY = 0,

          scaleMax = 1, scaleMin,
          image_ratio = self.imgWidth / self.imgHeight,
          cropper_ratio = self.options.width / self.options.height;

      if (cropper_ratio < image_ratio) {
        scaleMin = self.options.height / self.imgHeight;
      } else {
        scaleMin = self.options.width / self.imgWidth;
      }

      function setPosWithinBoundaries() {
        calcMaxPos();
        if (self.posX > min_pos_x) {
          self.posX = min_pos_x;
        }
        if (self.posX < max_pos_x) {
          self.posX = max_pos_x;
        }
        if (self.posY > min_pos_y) {
          self.posY = min_pos_y;
        }
        if (self.posY < max_pos_y) {
          self.posY = max_pos_y;
        }
      }

      /**
       * Calculate the minimum and maximum positions.
       * This took some headaches to write, good luck
       * figuring this out.
       */
      function calcMaxPos() {
        // Calculate current proportions of the image.
        var currWidth = self.scale * self.imgWidth;
        var currHeight = self.scale * self.imgHeight;

        // Images are scaled from the center
        min_pos_x = (currWidth - self.imgWidth) / 2;
        min_pos_y = (currHeight - self.imgHeight) / 2;
        max_pos_x = -(currWidth - min_pos_x - self.options.width);
        max_pos_y = -(currHeight - min_pos_y - self.options.height);
      }

      // Based on: http://stackoverflow.com/questions/18011099/pinch-to-zoom-using-hammer-js
      var options = {
        prevent_default_directions: ['left','right', 'up', 'down']
      };
      var validGestures = "touch transform drag dragstart dragend";
      if(self.options.allowRotation){
    	  validGestures = validGestures + " rotate";
      };
      
      ionic.onGesture(validGestures, function(e) {
        switch (e.type) {
          case 'touch':
            self.last_scale = self.scale;
            self.last_rotate = self.rotate;
            break;
          case 'drag':
            self.posX = self.last_posX + e.gesture.deltaX - transforming_correctX;
            self.posY = self.last_posY + e.gesture.deltaY - transforming_correctY;
            setPosWithinBoundaries();
            break;
          case 'transform':
            self.scale = Math.max(scaleMin, Math.min(self.last_scale * e.gesture.scale, scaleMax));
            setPosWithinBoundaries();
            break;
          case 'dragend':
            self.last_posX = self.posX;
            self.last_posY = self.posY;
            break;
          case 'dragstart':
            self.last_scale = self.scale;

            // After scaling, hammerjs needs time to reset the deltaX and deltaY values,
            // when the user drags the image before this is done the image will jump.
            // This is an attempt to fix that.
            if (e.gesture.deltaX > 1 || e.gesture.deltaX < -1) {
              transforming_correctX = e.gesture.deltaX;
              transforming_correctY = e.gesture.deltaY;
            } else {
              transforming_correctX = 0;
              transforming_correctY = 0;
            }
            break;
          case 'rotate':
         	self.rotate = self.last_rotate + e.gesture.rotation;
        	break;
       }

        self.setImageTransform();

      }, self.options.modal.el, options);
    },

    setImageTransform: function() {
      var self = this;

      var transform =
        'translate3d(' + self.posX + 'px,' + self.posY + 'px, 0) ' +
        'scale3d(' + self.scale + ',' + self.scale + ', 1)' +
        'rotate(' + self.rotate + 'deg)';

      self.imgSelect.style[ionic.CSS.TRANSFORM] = transform;
      self.imgFull.style[ionic.CSS.TRANSFORM] = transform;
    },

    /**
     * Calculate the new image from the values calculated by
     * user input. Return a canvas-object with the image on it.
     * 
     * Note: It doesn't actually downsize the image, it only returns
     * a cropped version. Since there's inconsistenties in image-quality
     * when downsizing it's up to the developer to implement this. Preferably
     * on the server.
     */
    crop: function() {
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');

      // Canvas size is original proportions but scaled down.
      canvas.width = this.options.width / this.scale;
      canvas.height = this.options.height / this.scale;

      // The full proportions 
      var currWidth = this.imgWidth * this.scale;
      var currHeight = this.imgHeight * this.scale;

      // Because the top/left position doesn't take the scale of the image in
      // we need to correct this value.
      var correctX = (currWidth - this.imgWidth) / 2;
      var correctY = (currHeight - this.imgHeight) / 2;

      var sourceX = (this.posX - correctX) / this.scale;
      var sourceY = (this.posY - correctY) / this.scale;

      //see http://creativejs.com/2012/01/day-10-drawing-rotated-images-into-canvas/
      //move the origin  
      context.translate(sourceX, sourceY);
      //move to center and rotate
      context.translate(this.imgWidth/2, this.imgHeight/2); 
      context.rotate(this.rotate*Math.PI/180);
      
      context.drawImage(this.imgFull, this.imgWidth/2 * -1, this.imgHeight/2 * -1);
      
      //resize the final canvas if the user specified the according options
      //this may reduce the size dramatically
      if(this.options.resizeWidth || this.options.resizeHight){
    	  var resizeWidth = this.options.resizeWidth;
    	  var resizeHight = this.options.resizeHight;
    	  if(!resizeWidth){
    		  resizeWidth = resizeHight;
    	  };
    	  if(!resizeHight){
    		  resizeHight = resizeWidth;
    	  };
    	  
		  console.log("before: canvas width = " + canvas.width + " height = " + canvas.height + " length = " + canvas.toDataURL().length);
    	  resize(canvas, canvas.width, canvas.height, resizeWidth, resizeHight);
		  console.log("after: canvas width = " + canvas.width + " height = " + canvas.height + " length = " + canvas.toDataURL().length);
      };

      this.options.modal.remove();
      this.promise.resolve(canvas);
    },

    /**
     * Load the image and return the element.
     * Return Promise that will fail when unable to load image.
     */
    loadImage: function() {
      var promise = $q.defer();
      
      // Load the image and resolve with the DOM node when done.
      angular.element('<img />')
        .bind('load', function(e) {
          promise.resolve(this);
        })
        .bind('error', promise.reject)
        .prop('src', this.options.url);

      // Return the promise
      return promise.promise;
    }
  });

  return {
    defaultOptions: {
      width: 0,
      height: 0,
      aspectRatio: 0,
      cancelText: 'Cancel',
      chooseText: 'Choose',
      allowRotation: false,
      buttonLocation: 'footer'
    },

    crop: function(options) {
      options = this.initOptions(options);

      var scope = $rootScope.$new(true);

      ionic.extend(scope, options);

      //construct the template regarding the options.
      var template = '<div class="jr-crop modal">';
      if(options.buttonLocation == "header"){
    	  template = template + headerHTML;
      };
      template = template + centerHTML;
      if(options.buttonLocation == "footer"){
    	  template = template + footerHTML;
      };
      template = template + '</div>';
      
      scope.modal = $ionicModal.fromTemplate(template, {
        scope: scope
      });

      // Show modal and initialize cropper.
      return scope.modal.show().then(function() {
        return (new jrCropController(scope)).promise.promise;
      });
    },

    initOptions: function(_options) {
      var options;

      // Apply default values to options.
      options = ionic.extend({}, this.defaultOptions);
      options = ionic.extend(options, _options);

      if (options.aspectRatio) {

        if (!options.width && options.height) {
          options.width = 200;
        }

        if (options.width) {
          options.height = options.width / options.aspectRatio;
        } else if (options.height) {
          options.width = options.height * options.aspectRatio;
        }
      }

      return options;
    },
    
	/**
	 * Expose the rezise function as a public method of this module.
	 * Resize a canvas using the resample_hermite algorithm
	 * Courtesy of viliusle
	 * https://github.com/viliusle/Hermite-resize
	 */
	resize: function(canvas, W, H, W2, H2){
		return resize(canvas, W, H, W2, H2);
	}

  };
}]);