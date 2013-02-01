var appjs = require('appjs');

// serve static files from a directory
appjs.serveFilesFrom(__dirname + '/');

// create a window
var window = appjs.createWindow({
	width: 850,
	height: 700,
	icons  : __dirname + '/content/icons'
});

// prepare the window when first created
window.on('create', function(){
	window.frame.show().center();
});

// the window is ready when the DOM is loaded
window.on('ready', function(){
	window.process = process;
	window.module = module;

	// prevent right click event
	window.addEventListener('contextmenu', function(e){
		e.preventDefault();
	});
});
