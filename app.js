
var app;
var store = false;
var server = 'https://cloud.roshan-ai.ir/zolal/';
var chrome_app = 'chrome' in window && 'app' in chrome && chrome.app.isInstalled;
var android_app = 'cordova' in window;
var searchResultChars = android_app ? 25 : 50;
var partialRendering = false;


// apps
if (chrome_app || android_app)
	store = true;


// device events
document.addEventListener('deviceready', function() {
	navigator.splashscreen.hide();
	window.plugins.insomnia.keepAwake();

	$('a[target]').click(function(){
		window.open($(this).attr('href'), '_system');
		return false;
	});
}, false);

document.addEventListener('menubutton', function() {
	app.address.trigger('menu');
}, false);

document.addEventListener('backbutton', function(e) {
	// back on input
	focused = $(':focus');
	if (focused.length && focused[0].tagName == 'INPUT') {
		focused.blur().typeahead('close');
		app.address.render();
		e.preventDefault();
		return;
	}

	// back on modal
	if ($('.modal').is(':visible')) {
		$('.modal').modal('hide');
		return;
	}

	// up button
	if (app.position.mode == 'quran')
		navigator.app.exitApp();
	else {
		history.back();

		// back without history
		var last_position = $.extend({}, app.position);
		setTimeout(function() {
			if (JSON.stringify(last_position) == JSON.stringify(app.position))
				app.showQuran();
		}, 25);
	}
}, false);


if (chrome_app)
	$('#installation #chrome').hide()
if (android_app)
	$('#installation').hide()

$('[rel=menu]').show();
if (android_app)
	$('.quran [rel=menu]').hide();


// app initialization
var initApp = function() {
	$('#wrap').removeClass('loading');

	app = new AppView();
	app.router = new AddressRouter();
	Backbone.history.start();

	// navigate to previous location
	if (Backbone.history.getFragment() == '') {
		address = '';

		position = app.position;
		if (position.mode == 'quran') {
			if (position.quran.aya != '')
				address = 'quran/'+ position.quran.sura +'_'+ position.quran.aya;
			else
				address = 'quran/p'+ position.quran.page;
		} else if (position.mode == 'detail') {
			address = 'detail/'+ position.detail.sura +'_'+ position.detail.aya;
		} else if (position.mode == 'tafsir') {
			address = 'almizan_' + position.tafsir.lang +'/';
			if (position.tafsir.aya)
				address += position.tafsir.aya;
			else
				address += position.tafsir.section +'/i'+ position.tafsir.part;
		}

		app.router.navigate(address, {trigger: true});
	}

	download_quran(server +'quran/');

	if (store) {
		$('.storage').show();
		$('#download-tafsir').click(download_tafsir);
	}

	$(window).resize();
	track('Zolal');
}


// window
$(window).resize(function() {
	$('.twitter-typeahead .tt-dropdown-menu').css('max-height', $('#views').height());
});


// settings dialog
$('select#language').val(variables.lang).change(function() {
	$('#pages').html('');
	variables.lang = $(this).val();
	app.position.tafsir.lang = variables.lang;
	app.render();
	show_tafsir_stats();
});


// gestures
$("#views").swipe({
	tap: function(e) {
		if (e.type != 'mouseup') {
			$(e.target).click();

			if (e.target.id == 'page')
				$(e.target).toggleClass('active');
		}
	},
	swipeLeft: function() {
		app.$el.find('.front').find('.glyphicon-chevron-right').click();
	},
	swipeRight: function() {
		app.$el.find('.front').find('.glyphicon-chevron-left').click();
	}
});


// track
var trackedData;
var track = function(title, data) {
	if ('amplitude' in window && data != trackedData && navigator.onLine)
		amplitude.getInstance().logEvent(title, data);
	trackedData = data;
}


// download
var requestUrls = function(urls, index, isStored, storeData, progress) {
	if (index >= urls.length && progress)
		progress(100);

	isStored(urls[index], function() {
			if (progress) progress(100*index/urls.length);
			requestUrls(urls, index+1, isStored, storeData, progress);
		},	function() {
		settings = {
			context: {url: urls[index]},
			url: server + urls[index],
			success: function(data) {
				storeData(this.url, data);
				if (progress) progress(100*index/urls.length);
				requestUrls(urls, index+1, isStored, storeData, progress);
			},
			error : function(xhr, textStatus) {
				setTimeout(function() { $.ajax(this.settings); }, 1000);
				console.log('retry in 1 second ...');
			}
		};
		settings.context.settings = settings;
		$.ajax(settings);
	});
};

var tafsir_progress = function(percent) {
	if (percent == 100) {
		$('#download-state').hide();
		$('#complete-state').show();
		$('#download-progress').removeClass('active');
	}
	else {
		$('#download-state').show();
		$('#complete-state').hide();
	}

	$('#download-progress .progress-bar').width(Math.round(percent) +'%');
};

var download_tafsir = function() {
	$('#download-tafsir').attr('disabled', 'disabled');
	$('#download-progress').addClass('active');
	track('Almizan Download', {'lang': variables.lang});

	var storeData = function(url, data) {
		bayan = new Bayan({id: url.substr(8), content: data});
		bayan.save();
	}
	var isStored = function(url, success, error) {
		bayan = new Bayan({id: url.substr(8)});
		bayan.fetch({success: success, error: error});
	}

	urls = _.map(almizan_sections, function(section) { return 'almizan_'+ variables.lang +'/'+ section; });
	requestUrls(urls, 0, isStored, storeData, tafsir_progress);
};

var show_tafsir_stats = function() {
	almizan = new Almizan();
	almizan.fetch({
		success: function() {
			sections = almizan.models.filter(function(item) {
				return item.id.substr(0,2) == variables.lang;
			});
			tafsir_progress(100 * sections.length / almizan_sections.length);
		}
	});
}

var download_quran = function(origin) {
	if (!localStorage.Quran || localStorage.Quran.split(',').length < 6230) {

		request = $.when($.get(origin +'all'), $.getJSON(origin +'fa')).done(function(all, fa) {
			parse_quran(all[0], fa[0]);
		});

		if (!android_app) {
			$('#search').parent().addClass('loading');
			request.then(function() { $('#search').parent().removeClass('loading'); });
		}

		return request;
	}
	return $.Deferred().resolve();
}

var parse_quran = function(data, trans) {
	var ids = [], raws = '';
	data.split('\n').forEach(function(aya) {
		if (!aya) return;
		i = aya.indexOf('id'); r = aya.indexOf('raw');
		id = aya.substr(i + 6).slice(0, -2);
		raws += id + aya.substr(r+3, i-r-3);

		if (id in trans)
			aya = aya.substr(0, aya.length-1) +', "fa": "'+ trans[id] +'"}';

		localStorage['Quran-'+ id] = aya;
		ids.push(id);
	});
	localStorage.Quran = ids.join(',');
	localStorage.QuranTokens = normalize('{"'+ raws.slice(0, -3) +'}');
};


// main
if (!android_app || localStorage.Quran)
	initApp();
else {
	download_quran('').then(function() {
		initApp();
	});
}
