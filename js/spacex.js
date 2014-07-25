$(function(){
	var canvas = $('canvas'),
		ctx = canvas[0].getContext('2d'),
		width = canvas.width(),
		height = canvas.height(),

		now = new Date(),
		startDate = new Date("2010-05-14"),
		horizontalScale = 500 / (365 * 24 * 60 * 60 * 1000), // 100 pixels per year

		_images = {};

	canvas[0].width = width;
	canvas[0].height = height;

	ctx.fillStyle = "#919EAA";
	ctx.fillRect(0, 0, width, height);

	$.get("launches.json", function(launches){
		launches.forEach(function(launch){
			var date = new Date(launch.date),
				x = (date - startDate) * horizontalScale,
				y = 600;

			img("vehicles/"+launch.image).then(function(img){
				var h = img.height;

				ctx.save();

				if(date > now){
					ctx.globalAlpha = 0.25;
				}

				ctx.drawImage(img, x, y - h);

				ctx.restore();
			});
		})
	});

	function img(name){
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
