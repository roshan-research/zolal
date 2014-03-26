
$(window).resize(function() {
// 	$('#wrap').css('margin-top', ($('body').height() - $('#wrap').height())/2);

	$('#page-style').html('#quran .page {width: '+ $('#quran').width() +'px}');
});

var app;
$(document).ready(function() {
	$(window).resize();

	app = new AppView();
	app.router = new AddressRouter();
	Backbone.history.start();

	if (Backbone.history.getFragment() == '')
		app.render();

	if (store) {
		$('.store-display').show();
		$('.store-hide').hide();
		$('#download-tafsir').click(download_tafsir);

		if (!Boolean(localStorage.Quran) || localStorage.Quran.split(',').length < 6230) {
			download_quran();
		}
	}

	track('Zolal');
});

$(window).load($(window).resize);

// settings dialog
$('select#language').val(variables.lang);
$('#apply-settings').click(function() {
	$('#pages').html('');
	variables.lang = $('select#language').val();
	app.position.tafsir.lang = variables.lang;
	app.render();
});
$('a[data-toggle=tooltip]').tooltip();

// gestures
$(document).ready(function() {
	$('body').on( 'swipeleft', function () {
		if (app.position.mode == 'quran')
			if (app.quran.prevPage())
				app.render();
	});
	$('body').on( 'swiperight', function () {
		if (app.position.mode == 'quran')
			if (app.quran.nextPage())
				app.render();
	});
});


// download
var requestUrls = function(urls, index, isStored, storeData, progressBar) {
	if (progressBar)
		var progress = function(percent) { progressBar.attr('data-progrecss', Math.round(percent)) };

	if (index >= urls.length) {
		if (progressBar) {
			progress(100);
			progressBar.removeClass('progrecss');
		}
		return;
	}

	if (progressBar)
		progressBar.addClass('progrecss');

	isStored(urls[index], function() {
			if (progressBar) progress(100*index/urls.length);
			requestUrls(urls, index+1, isStored, storeData, progressBar);
		},	function() {
		settings = {
			context: {url: urls[index]},
			url: server + urls[index],
			success: function(data) {
				storeData(this.url, data);
				if (progressBar) progress(100*index/urls.length);
				requestUrls(urls, index+1, isStored, storeData, progressBar);
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

var download_quran = function() {
	var storeData = function(url, data) {
		_.each(data.split('\n'), function(item) {
			if (item) {
				item = $.parseJSON(item);
				aya = new Aya(item);
				aya.save();
			}
		});
	}

	var isStored = function(url, success, error) {
		aya = new Aya({id: quran_pages[Number(url.substr(7))][0]});
		aya.fetch({success: success, error: error});
	}

	urls = _.map(quran_pages, function(ayas, page) { return 'quran/p'+ page; });
	requestUrls(urls, 0, isStored, storeData, false);
};

var download_tafsir = function() {
	$('.modal').modal('hide');
	$('#download-tafsir').attr('disabled', 'disabled');
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
	requestUrls(urls, 0, isStored, storeData, $('html'));
};
