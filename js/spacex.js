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

		_images = {};

	canvas[0].width = width;
	canvas[0].height = height;

	ctx.fillStyle = "#919EAA";
	ctx.fillRect(0, 0, width, height);

	ctx.fillStyle = "#27303A";
	ctx.fillRect(0, 0, width, height - spaceHeight);

	$.get("launches.json", function(launches){
		launches.forEach(function(launch){
			var date = new Date(launch.date),
				x = (date - startDate) * horizontalScale,
				y = height;

			getImg("vehicles/"+launch.image).then(function(img){
				var w = img.width,
					h = img.height,
					vehicleX = x - w/2,
					numPayloads = launch.payloads.length;

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

						getImg("vehicles/"+payload.image).then(function(img){
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
		})
	});

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
});
