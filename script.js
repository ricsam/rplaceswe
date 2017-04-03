
var __REMOTE_URL = "https://raw.githubusercontent.com/ricsam/rplaceswe/gh-pages/sweddit_target_20170403_1646.bmp";
var _user_random_start_index = true;
var _user_start_index;

_botStart = (function () {

	var modhash;
	if (window.reddit) {
		modhash = window.reddit.modhash;
	}

	var pixel_data;
	var properties;

	var color_map = [
		{
			"from": "255,0,255,255",
			"to": -1
		},
		{
			"from": "255,255,255,255",
			"to": 0
		},
		{
			"from": "228,228,228,255",
			"to": 1
		},
		{
			"from": "136,136,136,255",
			"to": 2
		},
		{
			"from": "34,34,34,255",
			"to": 3
		},
		{
			"from": "255,167,209,255",
			"to": 4
		},
		{
			"from": "229,0,0,255",
			"to": 5
		},
		{
			"from": "229,149,0,255",
			"to": 6
		},
		{
			"from": "160,106,66,255",
			"to": 7
		},
		{
			"from": "229,217,0,255",
			"to": 8
		},
		{
			"from": "148,224,68,255",
			"to": 9
		},
		{
			"from": "2,190,1,255",
			"to": 10
		},
		{
			"from": "0,211,221,255",
			"to": 11
		},
		{
			"from": "0,131,199,255",
			"to": 12
		},
		{
			"from": "0,0,234,255",
			"to": 13
		},
		{
			"from": "207,110,228,255",
			"to": 14
		},
		{
			"from": "130,0,128,255",
			"to": 15
		}
	];




	function getContext(w, h) {

		let canvas = $("#placebot-canvas-buffer").get(0);
		canvas.width = w;
		canvas.height = h;

		return canvas.getContext('2d');
	}

	function reload(cb) {
		$('#placebot-canvas-buffer').remove();
		$('#placebot-image-buffer').remove();
		loadData(cb);
	}

	function loadData(cb) {

		let html = $(`
<canvas id='placebot-canvas-buffer' style='display: none;'></canvas>
<img crossOrigin="Anonymous" src="${__REMOTE_URL}" alt="" id='placebot-image-buffer' style='display: none;'>`);


		$(document.body).append(html);

		$('#placebot-image-buffer').on('load', (function (cb) {
			return () => {setSizes(cb)}
		}(cb)));

	}

	function setSizes(cb) {

		let w = $("#placebot-image-buffer").width(),
			h = $("#placebot-image-buffer").height();

		let ctx = getContext(w, h);

		ctx.drawImage($("#placebot-image-buffer").get(0), 0, 0);

		properties = crop(ctx, w, h);

		ctx = getContext(properties.size.x, properties.size.y);

		ctx.drawImage($("#placebot-image-buffer").get(0),
			properties.offset.x,
			properties.offset.y,
			properties.size.x,
			properties.size.y,
			0, 0,
			properties.size.x,
			properties.size.y
		);


		pixel_data = ctx.getImageData(0, 0, properties.size.x, properties.size.y);
		_user_start_index = Math.floor(Math.random()*((properties.size.x*properties.size.y)+1));

		cb();
	}

	function crop(ctx, w, h) {

		var imageData = ctx.getImageData(0, 0, w, h),
			data = imageData.data,
			getRBG = function(x, y) {
				return {
					red:   data[(w*y + x) * 4],
					green: data[(w*y + x) * 4 + 1],
					blue:  data[(w*y + x) * 4 + 2]
				};
			},
			pinkRegion = function (rgb) {
				return rgb.red == 255 && rgb.green == 0 && rgb.blue == 255;
			},
			scanY = function (fromTop) {
				var offset = fromTop ? 1 : -1;

				for(var y = fromTop ? 0 : h - 1; fromTop ? (y < h) : (y > -1); y += offset) {

					for(var x = 0; x < w; x++) {
						if (!pinkRegion(getRBG(x, y))) {
							return y;                        
						}      
					}
				}
				return null; 
			},
			scanX = function (fromLeft) {
				var offset = fromLeft? 1 : -1;

				for(var x = fromLeft ? 0 : w - 1; fromLeft ? (x < w) : (x > -1); x += offset) {

					for(var y = 0; y < h; y++) {
						if (!pinkRegion(getRBG(x, y))) {
							return x;                        
						}      
					}
				}
				return null; 
			};

		var cropTop = scanY(true),
			cropBottom = scanY(false),
			cropLeft = scanX(true),
			cropRight = scanX(false);

		return {
			offset: {
				x: cropLeft,
				y: cropTop
			},
			size: {
				x: cropRight - cropLeft,
				y: cropBottom - cropTop
			}
		};
	}

	function mapToPlaceColor(index) {
		let color = [
			pixel_data.data[index * 4 + 0],
			pixel_data.data[index * 4 + 1],
			pixel_data.data[index * 4 + 2],
			pixel_data.data[index * 4 + 3]
		];

		color = color.join(",");


		let i = 0,
			len = color_map.length;
		while (i < len && color !== color_map[i].from ) {
			i++;
		}


		if (i === len) {
			console.log(color, 'not found');
			return -1;
		}

		return color_map[i].to;
	}

	function getRandomIndex() {
		const w = pixel_data.width,
			h = pixel_data.height;
		
		return Math.floor(Math.random()*((w*h)+1));
	}



	function find_error(index) {
		const local_x = index % pixel_data.width,
			local_y = Math.floor(index / pixel_data.width),
			remote_x =  local_x + properties.offset.x,
			remote_y = local_y + properties.offset.y;

		$.get("https://www.reddit.com/api/place/pixel.json?x=" + remote_x + "&y=" + remote_y, (data, status, d) => {

			let remote_color = data.color,
				local_color = mapToPlaceColor(index, pixel_data);

			d.repeat = true;

			if (remote_color !== local_color && local_color >= 0) {
				placeColor(remote_x, remote_y, local_color, remote_color, index);
				d.repeat = false;
			}


		}).always((data, status, d) => {
			if (d.repeat) {
				find_error(index+1);
				console.log("Everything is correct at (https://www.reddit.com/r/place/#x=" + remote_x + "&y=" + remote_y + ")");
			} else {
				console.log('done');
			}
		});
	}


	function placeColor(x, y, c, rc, index) {
		console.log("%c Drawing color numer: " + c + " at " + x + ", " + y + " (https://www.reddit.com/r/place/#x=" + x + "&y=" + y + ")");

		console.log('From:');
		console.log("%c■", "color: rgba(" + color_map[rc + 1].from + ")");

		console.log('To:');
		console.log("%c■", "color: rgba(" + color_map[c + 1].from + ")");
		try {
			modhash = window.reddit.modhash;
		} catch (e) {/* ignore */ }
		$.ajax({ url: "https://www.reddit.com/api/place/draw.json", type: "POST",
			headers: { "x-modhash": modhash }, data: { x: x, y: y, color: c }
		}).done(() => {

			let time_left = 5 * 60 * 1000 + 5000;

			let int = setInterval(() => {

				time_left = time_left - 1000;

				console.log((time_left) / 1000 + ' sec')

			}, 1000);

			setTimeout(() => {
				window.clearInterval(int);
				if (_user_random_start_index) {
					_user_start_index = getRandomIndex();
				}
				find_error(_user_start_index);
			}, time_left);

			console.log('Laddar ny data sålänge');

			reload(() => {
				console.log('ny data inläst');
			});



		}).error(() => {
			console.log('error, prövar igen om 3 sekunder...');
			setTimeout(() => {
				if (pixel_data.width * pixel_data.height <= index) {
					index = -1;
				}
				find_error(index + 1);
			}, 3000);
		});

	}


	return () => {
		console.log('initializing...');
		loadData(() => {
			find_error(_user_start_index);
		});
	};

}());
_botStart();