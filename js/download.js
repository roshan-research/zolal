
var request_url = function(urls, index, store_data, progress_bar) {
	if (progress_bar)
		var progress = function(percent) { progress_bar.find('div').css({width: percent+'%'}) };

	if (index >= urls.length) {
		if (progress_bar) {
			progress(100);
			progress_bar.hide();
		}
		return;
	}

	if (progress_bar) progress_bar.show();
	$.ajax({
		context: {url: urls[index]},
		url: server + urls[index],
		success: function(data) {
			store_data(this.url, data);
			if (progress_bar) progress(100*index/urls.length);
			request_url(urls, index+1, store_data, progress_bar);
		},
		error: app.connectionError
	});
};


var download_quran = function() {
	var store_data = function(url, data) {
		_.each(data.split('\n'), function(item) {
			if (item) {
				item = $.parseJSON(item);
				aya = new Aya(item);
				aya.save();
			}
		});
	}

	urls = [];
	_.each(quran_pages, function(ayas, page) {
		(new Aya({id: ayas[0]})).fetch({
			error: function () {
				urls.push('quran/p'+ page);
			}
		});
	});

	request_url(urls, 0, store_data, false);
};


var download_tafsir = function() {
	var store_data = function(url, data) {
		bayan = new Bayan({id: url.substr(8), content: data});
		bayan.save();
	}

	urls = [];
	_.each(almizan_sections, function(section) {
		var bayan = new Bayan({id: variables.lang +'/'+ section});
		bayan.fetch({
			error: function () {
				urls.push('almizan_'+ bayan.get('id'));
			}
		});
	});

	request_url(urls, 0, store_data, $('#download-progress'));
};
