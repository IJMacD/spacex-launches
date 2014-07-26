$(function(){
	var canvas = $('canvas'),
		ctx = canvas[0].getContext('2d'),
		width = canvas.width() * 2,
		height = canvas.height() * 2,

		now = new Date(),
		startDate = new Date("2010-05-14"),
		horizontalScale = 600 / (365 * 24 * 60 * 60 * 1000), // 100 pixels per year
		spaceHeight = 500,

		orbits = {
			"LEO": 250,
			"Polar": 1000,
			"GTO": 40000
		},

		_images = {},
		_launches = Promise.resolve($.get("launches.json")),
		_drawingIndex = [];

	canvas[0].width = width;
	canvas[0].height = height;

	_launches.then(draw);

	var $tooltip = $("<div class='tooltip top in'><div class='tooltip-inner'></div></div>").hide().appendTo('body');
	var previousPoint = null;

	canvas.on('mousemove', function (event) {
		var eventX = event.offsetX,
			eventY = event.offsetY,
			hit = getHover(eventX, eventY),
			launch;
		if(hit) {
			launch = hit.launch;
			if (previousPoint != launch) {
				previousPoint = launch;
				var tip = launch.date;
				$tooltip.show().children(0).text(tip);
			}
			$tooltip.css({top:event.pageY + 10, left:event.pageX + 10});
		} else {
			$tooltip.hide();
			previousPoint = null;
		}

	});

	function draw(){
		Promise.all([
			_launches,
			getImg("img/stars.png")
		]).then(function(args){
			var launches = args[0],
				stars = args[1];

			drawTiledBackground(stars, 0, 0, width, height - spaceHeight);

			ctx.fillStyle = "#919EAA";
			ctx.fillRect(0, height - spaceHeight, width, height);

			_drawingIndex.length = 0;

			launches.forEach(function(launch){
				var date = new Date(launch.date),
					x = (date - startDate) * horizontalScale,
					y = height;

				getImg("img/vehicles/"+launch.image).then(function(img){
					var w = img.width,
						h = img.height,
						vehicleX = x - w/2,
						numPayloads = launch.payloads.length;

					_drawingIndex.push({
						top: (y - h)/2,
						right: (vehicleX + w)/2,
						bottom: y/2,
						left: vehicleX/2,
						launch: launch
					});

					ctx.save();

					if(date < now){
						launch.payloads.forEach(function(payload, index){
							var alt = orbits[payload.orbit] - 240,
								pxY = Math.log(alt) * 25,
								y = height - spaceHeight - pxY,
								payloadOffset = (index - (numPayloads - 1) / 2) * 5;

							if(payload.orbit == "fail"){
								ctx.strokeStyle = "#EF8037";
								y = height - spaceHeight + 50;
							} else {
								ctx.strokeStyle = "#83D85F";
							}
							ctx.lineWidth = 5;
							ctx.beginPath();
							ctx.moveTo(x + payloadOffset, height - h/2);
							ctx.lineTo(x + payloadOffset, y);
							ctx.stroke();

							getImg("img/vehicles/"+payload.image).then(function(img){
								var w = img.width,
									h = img.height,
									payloadX = x + payloadOffset - w/2,
									payloadY = y - h/2;
								ctx.drawImage(img, payloadX, payloadY);
							});
						});
					}
					else {
						ctx.globalAlpha = 0.25;
					}

					ctx.drawImage(img, vehicleX, y - h);

					ctx.restore();
				}).catch(function(error){
					console.error(error && error.stack);
				});
			});
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

	function getImg(name){
		if(!_images[name]){
			_images[name] = new Promise(function(resolve, reject){
				var i = new Image();

				i.onload = function(){
					resolve(i);
				};

				i.onerror = reject;

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
