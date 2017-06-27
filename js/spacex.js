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
		spreadRange = $('#spread-range'),
		spreadText = $('#spread-value'),
		logCheck = $('#log-check'),
		futureCheck = $('#future-check'),
		nowCheck = $('#now-check'),
		orbitCheck = $('#orbit-check'),
		scaleSelect = $('#scale-select'),
		scaleLayerFrontRadio = $('#scale-layer-front-radio'),
		scaleLayerBackRadio = $('#scale-layer-back-radio'),
		startDateText = $('#start-date'),
		endDateText = $('#end-date'),
		skyColourSelect = $('#sky-select'),
		altitudeCheck = $('#altitude-check'),
		tooltip = $("<div class='tooltip top in'><div class='tooltip-inner'></div></div>").hide().appendTo('body'),

		/*
		 * Parameters
		 */
		now = new Date(),
		frac, // factors to compute x axis positions
		horizontalPreScale,
		horizontalPostScale,
		postLogScale, // vertical scaling of space at top of image

		/*
		 * Configuration
		 */
		option = {
			width: canvas.width() * 2,
			height: canvas.height() * 2,

			showFuture: false,
			ghostOpacity: 0.25,
			showNowMarker: true,
			showOrbits: true,
			spaceGradient: true,
			scaleImage: false,
			scaleLayer: "front",
			skyColour: "night",
			showAltitudes: true,
			spread: 1.0,

			//startDate: parseDate("2006-01-01"), // before the first falcon 1 flight
			startDate: parseDate("2010-01-01"), // before the first falcon 9 flight
			endDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()), // one year from today's date

			spaceAltitude: 245, // (km) base of space in km, pre-log translation
			spaceHeight: 450, // (px) pixels to the base of space from the bottom of the image
			groundHeight: 50 // (px) pixels to the top of the ground from the bottom of the image
		},

		/*
		 * General placeholder orbits if we don't have better information (in km)
		 */
		orbits = {
			"LEO": 250,
			"SSO": 1000,
			"MEO": 10000,
			"GEO": 35000,
			"Polar": 40000,
			"GTO": 90000,
			"HEO": 120000,
			"Moon": 384400,
			"L1": 1.5e6,
			"Mars": 225e6 // Mean distance to Mars, 225 Million km
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
		_previousPoint,

		/*
		 * Cache of names and urls used for scale images
		 */
		_scaleImages;

	initControls();

	_launches.then(draw);

	/*
	 * Event Handlers
	 */

	canvas.on('mousemove', function (event) {
		var eventX = event.offsetX,
			eventY = event.offsetY,
			hit = getHover(eventX, eventY),
			target;
		if(hit) {
			target = hit.target;
			if (_previousPoint != target) {
				_previousPoint = target;
				var tip = target.name || target.date;
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

		draw();
	});

	heightRange.on("change", function(){
		var val = heightRange.val();

		heightText.val(val);

		option.height = val;

		draw();
	});

	spreadRange.on("change", function(){
		var val = spreadRange.val();

		spreadText.val(val);

		option.spread = val;

		draw();
	});

	widthRange.on("input", function(){
		widthText.val(widthRange.val());
	});

	heightRange.on("input", function(){
		heightText.val(heightRange.val());
	});

	spreadRange.on("input", function(){
		spreadText.val(spreadRange.val());
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

	spreadText.on("change", function(){
		var val = parseFloat(spreadText.val()),
			max = spreadRange.attr("max");

		if(val){
			if(val > max){
				spreadRange.attr("max", val);
			}
			spreadRange.val(val);

			spreadRange.trigger("change");
		}
	});

	futureCheck.on("click", function(){
		// opposite because class hasn't been changed yet
		option.showFuture = !futureCheck.hasClass("active");

		draw();
	});

	nowCheck.on("click", function(){
		// opposite because class hasn't been changed yet
		option.showNowMarker = !nowCheck.hasClass("active");

		draw();
	});

	orbitCheck.on("click", function(){
		// opposite because class hasn't been changed yet
		option.showOrbits = !orbitCheck.hasClass("active");

		draw();
	});

	scaleSelect.on("change", function(){
		var val = scaleSelect.val();

		if(!val || !val.length){
			option.scaleImage = false;
		}
		else {
			option.scaleImage = val;
		}

		draw();
	});

	startDateText.on("change", function(){
		option.startDate = parseDate(startDateText.val());

		draw();
	});

	endDateText.on("change", function(){
		option.endDate = parseDate(endDateText.val());

		draw();
	});

	skyColourSelect.on("change", function(){
		option.skyColour = skyColourSelect.val();

		draw();
	});

	scaleLayerFrontRadio.on("change", function(){
		option.scaleLayer = scaleLayerFrontRadio.is(":checked") ? "front" : "back";

		draw();
	});

	scaleLayerBackRadio.on("change", function(){
		option.scaleLayer = scaleLayerBackRadio.is(":checked") ? "back" : "front";

		draw();
	});

	altitudeCheck.on("click", function(){
		// opposite because class hasn't been changed yet
		option.showAltitudes = !altitudeCheck.hasClass("active");

		draw();
	});

	/*
	 * Drawing functions
	 */

	function draw(){

		var width = option.width,
			height = option.height;

		setCanvasSize(width, height);

		Promise.all([
			_launches,
			getImg("img/stars.png")
		]).then(function(args){
			var launches = args[0],
				stars = args[1];

			drawTiledBackground(stars, 0, 0, width, height - option.groundHeight);

			if(option.showOrbits){
				drawOrbits();
			}

			drawSky();

			drawGround();

			drawAxis();

			if(option.showNowMarker){
				drawNowMarker();
			}

			if(option.scaleLayer == "back"){
				drawScale();
			}

			_drawingIndex.length = 0;

			return Promise.all(launches.map(drawLaunch)).then(function(){
				if(option.scaleLayer == "front"){
					drawScale();
				}
			});

		}).then(function(){
			downloadBtn.attr("href", ctx.canvas.toDataURL());
		}).catch(function(err){
			console.error(error && error.stack);
		});
	}

	function fromDate(date){
		if (date < option.startDate) {
			return -1;
		} else if (date > option.endDate) {
			return option.width + 1;
		}
		x = (date - option.startDate) / (option.endDate - option.startDate);
		if (date < now) {
			return x ** (option.spread) * horizontalPreScale * option.width;
		} else {
			return (1 - (1 - x) ** (option.spread) * horizontalPostScale) * option.width;
		}
	}

	function setCanvasSize(width, height){

		canvas[0].width = width;
		canvas[0].height = height;

		canvas.width(width/2);
		canvas.height(height/2);

		frac = (now - option.startDate) / (option.endDate - option.startDate);
		horizontalPreScale = frac / frac ** (option.spread);
		horizontalPostScale = (1 - frac) / (1 - frac) ** (option.spread);

		if(height < 1000){
			postLogScale = (height - option.spaceHeight - 50) / Math.log(orbits.GEO);
		}
		else {
			postLogScale = (height - option.spaceHeight - 50) / Math.log(orbits.Mars);
		}
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

	function drawOrbits(){
		var orbit,
			altitude,
			y;

		ctx.save();

		ctx.strokeStyle = "rgba(255,255,255,0.137)";
		ctx.lineWidth = 4;

		ctx.fillStyle = "rgba(255,255,255,0.137)";
		ctx.font = "20px monospace";

		["LEO", "GEO", "Moon", "Mars"].forEach(function(orbit){
			if(orbits.hasOwnProperty(orbit)){
				y = (orbitToPixels(orbits[orbit]) |0);

				ctx.beginPath();

				dashedLine(0, y, option.width, y, 12);

				ctx.stroke();

				ctx.fillText(orbit, 10, y - 10);
			}
		});

		ctx.restore();
	}

	function drawSky(){
		var grad,
			gradHeight,
			gradFromColour;

		if(option.spaceGradient){

			if(option.skyColour == "day"){
				gradHeight = option.height - option.spaceHeight + 20;
				gradFromColour = "#27303A";
			}
			else if(option.skyColour == "twilight") {
				gradHeight = option.height - option.groundHeight;
				gradFromColour = "rgba(255,255,255,0)";
			}
			else if(option.skyColour == "midday") {
				gradHeight = option.height - option.groundHeight;
				gradFromColour = "#919EAA";
			}
			else if(option.skyColour == "midnight")  {
				gradHeight = option.height - option.spaceHeight;
				gradFromColour = "rgba(0,0,0,0)";
			}
			else {
				gradHeight = option.height - option.groundHeight;
				gradFromColour = "rgba(0,0,0,0)";
			}

			grad = ctx.createLinearGradient(0, option.height - option.spaceHeight, 0, gradHeight);
			grad.addColorStop(0, gradFromColour);
			grad.addColorStop(1, "#919EAA");

			ctx.fillStyle = grad;
		}
		else {
			ctx.fillStyle = "#919EAA";
		}
		ctx.fillRect(0, option.height - option.spaceHeight, option.width, option.height - option.groundHeight);
	}

	function drawGround(){
		ctx.fillStyle = "#98BB71";
		ctx.fillRect(0, option.height - option.groundHeight, option.width, option.height);
	}

	function drawAxis(){
		var flip = false,
			startYear = option.startDate.getFullYear(),
			endYear = option.endDate.getFullYear();

		ctx.save();

		ctx.lineWidth = 2;

		for (var year = startYear; year <= endYear; year++) {
			var start = new Date(year, 0, 1),
				end = new Date(year + 1, 0, 0);
			ctx.strokeStyle = flip ? "#000000" : "#ffffff";
			ctx.beginPath();
			ctx.moveTo(fromDate(start), option.height - option.groundHeight);
			ctx.lineTo(fromDate(end), option.height - option.groundHeight);
			ctx.stroke();

			var maxWidth = Math.max(fromDate(end) - fromDate(start), fromDate(start) - option.width);
			ctx.fillStyle = "#3E4D2E";
			ctx.font = "20px monospace";
			ctx.fillText(year, fromDate(start), option.height - option.groundHeight + 20, maxWidth);

			flip = !flip;
		};

		ctx.restore();
	}

	function drawNowMarker(){
		var x = fromDate(now),
			y = option.height - option.groundHeight;

		ctx.save();

		ctx.fillStyle = "#ff0000";

		ctx.translate(x, y);

		ctx.scale(5, 5);

		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(1, 2);
		ctx.lineTo(-1, 2);
		ctx.closePath();

		ctx.fill();

		ctx.restore();
	}

	function drawLaunch(launch){
		var date = parseDate(launch.date),
			x = fromDate(date),
			y = option.height - option.groundHeight;
		if (date < option.startDate || date > option.endDate){
			return;
		}

		return getImg("img/vehicles/"+launch.image).then(function(img){
			var w = img.width,
				h = img.height,
				vehicleX = x - w/2,
				vehicleY = y - h,
				numPayloads = launch.payloads.length,
				done;

			ctx.save();


			if(date > now){

				if(!option.showFuture){
					return;
				}

				ctx.globalAlpha = option.ghostOpacity;
			}

			done = Promise.all(launch.payloads.map(function(payload, index){
				var payloadOffset = (index - (numPayloads - 1) / 2) * 5,
					payloadX = x + payloadOffset;
				return drawPayload(payload, payloadX, date > now);
			}));


			// These are all divided by two to compensate for the fact
			// the canvas is scaled to half size for on-screen preview
			_drawingIndex.push({
				left: vehicleX/2,
				top: vehicleY/2,
				right: (vehicleX + w)/2,
				bottom: y/2,
				target: launch
			});

			// The '|0' trick is to convert to int i.e. Math.floor()
			ctx.drawImage(img, vehicleX |0, vehicleY |0);

			ctx.restore();

			return done;
		}).catch(function(error){
			console.error(error && error.stack);
		});
	}

	function drawPayload(payload, launchX, ghost){
		var alt = (option.showAltitudes && payload.altitude) || orbits[payload.orbit],
			y = orbitToPixels(alt),
			x = ((launchX - 0.5) |0) + 0.5;

		if(!y){
			y = option.height - option.spaceHeight + 50;
		}
		if(orbits[payload.orbit]) {
			ctx.strokeStyle = "#83D85F";
		} else {
			ctx.strokeStyle = "#EF8037";
		}
		ctx.lineWidth = 5;
		ctx.beginPath();
		if(ghost){
			dashedLine(x, option.height - option.groundHeight - 50, x, y, 10);
		} else {
			ctx.moveTo(x, option.height - option.groundHeight - 50);
			ctx.lineTo(x, y);
		}
		ctx.stroke();

		return getImg("img/vehicles/"+payload.image).then(function(img){
			var w = img.width,
				h = img.height,
				payloadX = x - w/2,
				payloadY = y - h/2;

			// These are all divided by two to compensate for the fact
			// the canvas is scaled to half size for on-screen preview
			_drawingIndex.push({
				left: payloadX/2,
				top: payloadY/2,
				right: (payloadX + w)/2,
				bottom: (payloadY + h)/2,
				target: payload
			});

			ctx.save();

			if(ghost){
				ctx.globalAlpha = option.ghostOpacity;
			}

			ctx.drawImage(img, payloadX |0, payloadY |0);

			ctx.restore();
		});
	}

	function drawScale(){
		var scaleImage = _scaleImages[option.scaleImage];
		if(scaleImage){
			getImg(scaleImage.url).then(function(img){
				var right = option.width - 20,
					left = right - img.width,
					bottom = option.height - option.groundHeight,
					top = bottom - img.height;

				ctx.drawImage(img, left, top);

				// These are all divided by two to compensate for the fact
				// the canvas is scaled to half size for on-screen preview
				_drawingIndex.push({
					left: left/2,
					top: top/2,
					right: right/2,
					bottom: bottom/2,
					target: scaleImage
				});
			});
		}
	}

	// http://stackoverflow.com/a/15968095/1228394
	function dashedLine(x1, y1, x2, y2, dashLen) {
		if (dashLen == undefined) dashLen = 2;
		ctx.moveTo(x1, y1);

		var dX = x2 - x1,
			dY = y2 - y1,
			dashes = Math.floor(Math.sqrt(dX * dX + dY * dY) / dashLen),
			dashX = dX / dashes,
			dashY = dY / dashes;

		var q = 0;
		while (q++ < dashes) {
			x1 += dashX;
			y1 += dashY;
			ctx[q % 2 == 0 ? 'moveTo' : 'lineTo'](x1, y1);
		}
		ctx[q % 2 == 0 ? 'moveTo' : 'lineTo'](x2, y2);
	}

	/*
	 * Helper functions
	 */

	 /**
	  * Make sure controls match up to javascript state
	  */
	function initControls(){
		widthRange.add(widthText).val(option.width);
		heightRange.add(heightText).val(option.height);

		futureCheck.toggleClass("active", option.showFuture);
		nowCheck.toggleClass("active", option.showNowMarker);
		orbitCheck.toggleClass("active", option.showOrbits);

		startDateText.val(formatDate(option.startDate));
		endDateText.val(formatDate(option.endDate));

		_scaleImages = {};
		scaleSelect.find("option").each(function(i,item){
			var $item = $(item),
				value = $item.attr("value"),
				name = $item.text(),
				url = "img/" + value + ".png";

			if(value){
				_scaleImages[value] = {name: name, url: url};
			}
		});

		skyColourSelect.val(option.skyColour);

		scaleLayerFrontRadio
			.parent().toggleClass("active", option.scaleLayer == "front")
			.end()[0].checked = option.scaleLayer == "front";

		scaleLayerBackRadio
			.parent().toggleClass("active", option.scaleLayer == "back")
			.end()[0].checked = option.scaleLayer == "back";


		altitudeCheck.toggleClass("active", option.showAltitudes);
	}

	function formatDate(date){
		return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
	}

	function pad(s){
		return s<10?"0"+s:s;
	}

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

	function orbitToPixels(altitude){
		var alt = altitude - option.spaceAltitude,
			pxY = Math.log(alt) * postLogScale,
			y = option.height - option.spaceHeight - pxY;
		return y;
	}

	/**
	 * Parse date using native code or otherwise in YYYY-MM-DD'T'HH:mm:ss format only
	 */
	function parseDate(str){
		var date = new Date(str),
			parts,
			y, m, d, h, i, s;

		if(!+date){
			parts = str.split(/[-T:]/g);

			y = parts.length > 0 ? parts[0] : (new Date()).getFullYear();
			m = parts.length > 1 ? parseInt(parts[1]) - 1 : 0;
			d = parts.length > 2 ? parts[2] : 1;
			h = parts.length > 3 ? parts[3] : 0;
			i = parts.length > 4 ? parts[4] : 0;
			s = parts.length > 5 ? parts[5] : 0;

			date = new Date(y, m, d, h, i, s);
		}

		return date;
	}
});
