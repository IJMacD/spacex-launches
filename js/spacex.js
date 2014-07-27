$(function(){
		/*
		 * DOM
		 */
	var canvas = $('canvas'),
		ctx = canvas[0].getContext('2d'),

		downloadBtn = $('#download-btn'),
		widthRange = $('#width-range'),
		widthText = $('#width-value'),
		heightRange = $('#height-range'),
		heightText = $('#height-value'),
		futureCheck = $('#future-check'),
		tooltip = $("<div class='tooltip top in'><div class='tooltip-inner'></div></div>").hide().appendTo('body'),

		/*
		 * Configuration
		 */
		option = {
			width: canvas.width() * 2,
			height: canvas.height() * 2,
			showFuture: true,
			spaceGradient: true
		},

		/*
		 * Parameters
		 */
		now = new Date(),
		startDate = new Date("2010-05-14"), // approx one monthe before first falcon 9 flight
		endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), // one year from today's date
		horizontalScale, // (px / ms) pixels per millisecond, x-axis time scale
		postLogScale, // vertical scaling of space at top of image
		spaceAltitude = 245, // (km) base of space in km, pre-log translation
		spaceHeight = 450, // (px) pixels to the base of space from the bottom of the image
		groundHeight = 50, // (px) pixels to the top of the ground from the bottom of the image,

		/*
		 * General placeholder orbits if we don't have better information
		 */
		orbits = {
			"LEO": 250,
			"Polar": 1000,
			"GTO": 40000
		},

		/*
		 * Holds a map of promises for image loading
		 */
		_images = {},

		/*
		 * Promise for loading of launch manifest
		 */
		_launches = Promise.resolve($.get("launches.json")),

		/*
		 * Cache of drawn objects for tooltip hover
		 */
		_drawingIndex = [],

		/*
		 * Used for tooltip
		 */
		_previousPoint;

	_launches.then(draw);

	widthRange.add(widthText).val(option.width);
	heightRange.add(heightText).val(option.height);

	/*
	 * Event Handlers
	 */

	canvas.on('mousemove', function (event) {
		var eventX = event.offsetX,
			eventY = event.offsetY,
			hit = getHover(eventX, eventY),
			launch;
		if(hit) {
			launch = hit.launch;
			if (_previousPoint != launch) {
				_previousPoint = launch;
				var tip = launch.date;
				tooltip.show().children(0).text(tip);
			}
			tooltip.css({top:event.pageY + 10, left:event.pageX + 10});
		} else {
			tooltip.hide();
			_previousPoint = null;
		}

	});

	widthRange.on("change", function(){
		var val = widthRange.val();

		widthText.val(val);

		option.width = val;

		canvas.width(val/2);

		draw();
	});

	heightRange.on("change", function(){
		var val = heightRange.val();

		heightText.val(val);

		option.height = val;

		canvas.height(val/2);

		draw();
	});

	widthRange.on("input", function(){
		widthText.val(widthRange.val());
	});

	heightRange.on("input", function(){
		heightText.val(heightRange.val());
	});

	widthText.on("change", function(){
		var val = parseInt(widthText.val()),
			max = widthRange.attr("max");

		if(val){
			if(val > max){
				widthRange.attr("max", val);
			}
			widthRange.val(val);

			widthRange.trigger("change");
		}
	});

	heightText.on("change", function(){
		var val = parseInt(heightText.val()),
			max = heightRange.attr("max");

		if(val){
			if(val > max){
				heightRange.attr("max", val);
			}
			heightRange.val(val);

			heightRange.trigger("change");
		}
	});

	futureCheck.on("change", function(){
		option.showFuture = futureCheck.is(":checked");

		draw();
	});

	/*
	 * Drawing functions
	 */

	function draw(){

		var width = option.width,
			height = option.height;

		canvas[0].width = width;
		canvas[0].height = height;

		horizontalScale = option.width / (endDate - startDate);

		postLogScale = 30;

		Promise.all([
			_launches,
			getImg("img/stars.png")
		]).then(function(args){
			var launches = args[0],
				stars = args[1],
				grad;

			drawTiledBackground(stars, 0, 0, width, height - spaceHeight);

			if(option.spaceGradient){
				grad = ctx.createLinearGradient(0, height - spaceHeight, 0, height - spaceHeight + 20);
				grad.addColorStop(0, "#27303A");
				grad.addColorStop(1, "#919EAA");

				ctx.fillStyle = grad;
			}
			else {
				ctx.fillStyle = "#919EAA";
			}
			ctx.fillRect(0, height - spaceHeight, width, height - groundHeight);

			ctx.fillStyle = "#98BB71";
			ctx.fillRect(0, height - groundHeight, width, height);

			drawAxis();

			_drawingIndex.length = 0;

			return Promise.all(
				launches.map(function(launch){
					var date = new Date(launch.date),
						x = (date - startDate) * horizontalScale,
						y = height - groundHeight;

					return getImg("img/vehicles/"+launch.image).then(function(img){
						var w = img.width,
							h = img.height,
							vehicleX = x - w/2,
							numPayloads = launch.payloads.length,
							done;

						ctx.save();


						if(date > now){

							if(!option.showFuture){
								return;
							}

							ctx.globalAlpha = 0.25;
							done = Promise.resolve();
						}
						else {
							done = Promise.all(
								launch.payloads.map(function(payload, index){
									var alt = orbits[payload.orbit] - spaceAltitude,
										pxY = Math.log(alt) * postLogScale,
										y = height - spaceHeight - pxY,
										payloadOffset = (index - (numPayloads - 1) / 2) * 5,
										lineX = ((x + payloadOffset) |0) - 0.5;

									if(payload.orbit == "fail"){
										ctx.strokeStyle = "#EF8037";
										y = height - spaceHeight + 50;
									} else {
										ctx.strokeStyle = "#83D85F";
									}
									ctx.lineWidth = 5;
									ctx.beginPath();
									ctx.moveTo(lineX, height - h/2);
									ctx.lineTo(lineX, y);
									ctx.stroke();

									return getImg("img/vehicles/"+payload.image).then(function(img){
										var w = img.width,
											h = img.height,
											payloadX = x + payloadOffset - w/2,
											payloadY = y - h/2;
										ctx.drawImage(img, payloadX |0, payloadY |0);
									});
								})
							);
						}

						_drawingIndex.push({
							top: (y - h)/2,
							right: (vehicleX + w)/2,
							bottom: y/2,
							left: vehicleX/2,
							launch: launch
						});

						ctx.drawImage(img, vehicleX |0, (y - h) |0);

						ctx.restore();

						return done;
					}).catch(function(error){
						console.error(error && error.stack);
					});
				})
			);
		}).then(function(){
			downloadBtn.attr("href", ctx.canvas.toDataURL());
		});
	}

	function drawTiledBackground(img, left, top, right, bottom){
		var imgWidth = img.width,
			imgHeight = img.height,
			x, y;

		ctx.save();

		ctx.rect(left, top, right - left, bottom - top);

		ctx.clip();

		for(y = top; y < bottom; y += imgHeight){
			for(x = left; x < right; x += imgWidth){
				ctx.drawImage(img, x, y);
			}
		}

		ctx.restore();
	}

	function drawAxis(){
		var year = startDate.getFullYear(),
			yearStart = new Date(year, 0, 1),
			markerStart = (yearStart - startDate) * horizontalScale,
			markerWidth = horizontalScale * (365 * 24 * 60 * 60 * 1000),
			markerEnd = markerStart + markerWidth,
			flip = false;

		ctx.save();

		ctx.lineWidth = 2;

		for (; markerStart <= option.width; markerStart += markerWidth) {
			ctx.strokeStyle = flip ? "#000000" : "#ffffff";
			ctx.beginPath();
			ctx.moveTo(markerStart, option.height - groundHeight);
			ctx.lineTo(markerStart + markerWidth, option.height - groundHeight);
			ctx.stroke();

			ctx.fillStyle = "#3E4D2E";
			ctx.font = "20px monospace";
			ctx.fillText(year, markerStart, option.height - groundHeight + 20);

			flip = !flip;
			year++;
		};

		ctx.restore();
	}

	/*
	 * Helper functions
	 */

	function getImg(name){
		if(!_images[name]){
			_images[name] = new Promise(function(resolve, reject){
				var i = new Image();

				i.onload = function(){
					resolve(i);
				};

				i.onerror = function(e){
					console.warn("Couldn't load image: " + name);
					reject(e);
				}

				i.src = name;
			});
		}

		return _images[name];
	}

	function getHover(x, y){
		var result;
		_drawingIndex.forEach(function(item){
			if(x > item.left && x <= item.right
				&& y > item.top && y <= item.bottom){
				result = item;
				return false;
			}
		});
		return result;
	}
});
