
var server = 'http://zolal-files.ap01.aws.af.cm/';

// read variables
appStorage = new Backbone.LocalStorage('App');
if (!appStorage.find({id: 'variables'})) {

	defaults = {
		id: 'variables',
		lang: 'fa',
		position: {mode: 'quran', quran: {page: 1, sura: 1, aya: ''}, tafsir: {section: '1_1-5'}}
	};

	appStorage.update(defaults);

	// detect user language
	$.get('http://zolal.herokuapp.com/language', function(language) {
		defaults['lang'] = language;
		appStorage.update(defaults);
		track('Default Language', {'lang': language});
	});
}

variables = appStorage.find({id: 'variables'});

var tafsirDb = {
	id: 'tafsirs',
	migrations:[
		{
			version: '1.0',
			migrate: function (transaction, next) {
				transaction.db.createObjectStore('tafsirs');
				next();
			}
		}
	]
};


// models
var Aya = Backbone.Model.extend({
	defaults: {'phrases': {}},
	insertPhrase: function(phrase) {
		key = phrase['lang'] +'_'+ phrase['words'];
		if (! (key in this.get('phrases'))) {
			item = {}; item[key] = phrase;
			this.set('phrases', $.extend(item, this.get('phrases')));
		}
	},
	localStorage: new Backbone.LocalStorage('Quran')
});

var Quran = Backbone.Collection.extend({
	model: Aya
});

var Bayan = Backbone.Model.extend({
	database: tafsirDb,
	storeName: 'tafsirs'
});


// views
var AyaView = Backbone.View.extend({
	template: _.template('<span class="aya" rel="<%= sura %>_<%= aya %>"><span class="detail"></span><span class="text"><%= html %></span> <span class="number"><%= aya %></span></span>'),
	initialize: function () {
		this.model.on('change', this.render, this);
	},
	render: function () {
		data = this.model.toJSON();
		data['html'] = data['text'].replace(/[ ]*([ۖۗۚۛۙۘ])[ ]*/g, '<span class="mark">\$1 </span>');

		if (Object.keys(data['phrases']).length) {
			html = data['html'];
			parts = data['text'].replace(/[ۖۗۚۛۙۘ]/g, '').split(' ');

			_.each(data['phrases'], function (phrase) {
				if (phrase['lang'] != variables.lang)
					return;

				key = phrase['words'].split('-');
				f = Number(key[0])-1; t = Number(key[1])-1;
				b = html.indexOf(parts[f]); e = html.indexOf(parts[t], b);
				if (t >= 0 && t in parts) e += parts[t].length;
				if (b >= 0 && e > b)
					html = [html.slice(0, b), '<span class="phrase" rel="'+ phrase['lang'] +'_'+ phrase['words'] +'">', html.slice(b, e), '</span> ', html.slice(e)].join('').trim();
			});

			data['html'] = html;
			if (this.el.tagName == 'SPAN') {
				this.$el.find('.text').html(html);
				return this;
			}
		}

		this.setElement(this.template(data));
		return this;
	},
	events: {
		'click': 'click'
	},
	click: function(e) {
		target = $(e.target);

		aya = this.model.get('sura') +'_'+ this.model.get('aya');
		if (app.position.mode == 'quran') {
			if (target.hasClass('detail'))
				app.router.navigate('detail/'+ aya, true);
			else
				app.router.navigate('quran/'+ aya, true);
		}
	}
});

var QuranView = Backbone.View.extend({
	el: $("#quran"),
	initialize: function() {
		this.collection = new Quran();
	},
	render: function() {
		this.loadPage(this.position.page);

		// update address
		if (this.position.aya == '')
			this.position.sura = Number(quran_pages[this.position.page][0].split('_')[0]);
		this.trigger('updateAddress');

		// prepare pages
		this.loadPage(this.position.page-1);
		this.loadPage(this.position.page+1);

		// show page
		this.$el.find('#page-style').html('#quran .page {width: '+ this.$el.width() +'px}');
		var quran = this;
		el = this.$el.find('.page[rel='+ this.position.page +']');
		pages = this.$el.find('#pages');
		front = pages.find('.front');
		el.addClass('front');
		if (front.attr('rel') != this.position.page)
			this.$el.stop().animate({ scrollLeft: el.offset().left - pages.offset().left }, (front.length ? 400 : 0), function() {
				front.removeClass('front');
				quran.$el.find('.page[rel='+ quran.position.page +']').addClass('front');
			});
	},
	loadPage: function(page) {
		if (page > 604 || page < 1)
			return;

		// functions
		var quran = this;
		var doesExist = function(p) {
			return quran.$el.find('.page[rel='+ p +']').length > 0;
		};
		var updateSelectedAya = function() {
			active = quran.$el.find('.active');

			if (quran.position.aya != '') {
				// don't update it
				pos = quran.position; last = quran.lastPosition;
				if (last && pos.sura == last.sura && pos.aya == last.aya && pos.phrase == last.phrase)
					return;

				id = quran.position.sura +'_'+ quran.position.aya;
				aya = quran.collection.get(id);
				active.removeClass('active');
				quran.$el.find('.aya[rel='+ id +']').addClass('active');

				if (quran.position.phrase != '' && quran.position.phrase in aya.get('phrases')) {
					quran.$el.find('.aya[rel='+ id +'] .phrase[rel="'+ quran.position.phrase +'"]').addClass('active');

					phr = aya.get('phrases')[quran.position.phrase];
					html = phr['html'];
					if ('head' in phr)
						html = phr['head'] + html;

					app.message(html, 'note', '#'+ phr['link']);

					msg = $('#message #content');
					if (msg.children().length == 2)
						msg.children().first().addClass('header');

				} else if (variables.lang == 'fa' && aya.get('trans'))
					app.message(aya.get('trans'), 'note', '');

			} else
				active.removeClass('active');

			quran.lastPosition = $.extend({}, quran.position);
		};

		// show loaded page
		if (doesExist(page)) {
			updateSelectedAya();
			return;
		}

		// add new page
		pages = this.$el.find('#pages');
		newPage = $('<div class="page loading" rel="'+ page +'"><div class="ayas"></div></div>');
		if (doesExist(page + 1)) {
			pages.append(newPage);
		} else if (doesExist(page - 1)) {
			first = pages.children().first();
			off = first.offset().left;
			pages.prepend(newPage);
			this.$el.scrollLeft(this.$el.scrollLeft() + first.offset().left - off);
		} else {
			pages.empty();
			pages.append(newPage);
		}

		var renderPage = function(page) {
			el = quran.$el.find('.page[rel='+ page +'] .ayas');
			el.parent().removeClass('loading');
			_.each(quran.collection.models, function (item) {
				if (item.get('page') == page) {
					var ayaView = new AyaView({model: item});
					if (item.get('aya') == 1) {
						el.append('<div class="sura header"><div class="right">سورة</div><div class="left">'+ quran_suras[item.get('sura')-1] +'</div></div>');
						if (item.get('sura') != 1 && item.get('sura') != 9)
							el.append('<div class="aya bism"><span class="text">بِسمِ اللَّهِ الرَّحمٰنِ الرَّحيمِ</span></div>');
					}
					el.append(ayaView.render().el, ' ');
				}
			});
			el.children().hide().fadeIn();
			updateSelectedAya();
		};

		ayas = quran_pages[page];
		(new Aya({id: ayas[0]})).fetch({
			success: function() {
				for (a in ayas) {
					aya = new Aya({id: ayas[a]});
					aya.fetch();
					quran.collection.add(aya);
				}
				renderPage(page);
			},
			error: function () {
				$.ajax({
					context: {page: page},
					url: server +'quran/p'+ page,
					success: function(data){
						_.each(data.split('\n'), function(item) {
							if (item) {
								item = $.parseJSON(item);
								aya = new Aya(item);
								aya.save();
								quran.collection.add(aya);
							}
						});
						renderPage(this.page);
					},
					error: app.connectionError
				});
			}
		});
	}
});

var TafsirView = Backbone.View.extend({
	el: $("#tafsir"),
	initialize: function() {
		this.sections = almizan_sections;
		this.prepared = [];
	},
	render: function() {
		this.$el.empty();
		this.trigger('updateAddress');
		this.loadSection();
	},
	events: {
		'scroll': 'checkScroll'
	},
	loadSection: function() {
		var tafsir = this;
		var position = this.position;
		var prepare = Boolean(this['prepare']);

		if (prepare) {
			position = quranToTafsir(this['prepare'].quran);
			bid = position.lang +'/'+ position.section;
			if (this.prepared.indexOf(bid) >= 0) return;
			this.prepared.push(bid);
		}

		// show loading element
		if (!prepare && this.$el.children().length == 0)
			this.$el.addClass('loading');

		var loadBayan = function (bayan, prepare) {
			if (prepare) {
				// phrases
				var quran = app.quran;
				$(bayan.get('content')).find('em[rel]').each(function() {
					parts = $(this).attr('rel').split('_'); key = parts[1] +'_'+ parts[2];
					aya = quran.collection.get(key);
					if (! aya) return;

					var page, head;
					parent = $(this).parent();
					parent.prevAll().each(function(){
						if (!head && $(this)[0].tagName == 'H3')
							head = '<h3>'+ $(this).html() +'</h3>';
						if (!page && $(this).find('.page').length)
							page = $(this).find('.page').attr('rel');
						if (page && head)
							return false;
					});
					html = parent.html();
					if (parent[0].tagName == 'H3') {
						head = '<h3>'+ parent.html() +'</h3>';
						html = '';
					}
					aya.insertPhrase({words: parts[3], lang: parts[0], head: (head ? head : ''), html: html, link: 'almizan_'+ parts[0] +'/'+ parts[1] +'_'+ parts[2]});
				});
			} else {
				// content
				tafsir.$el.html(bayan.get('content'));
				tafsir.$el.removeClass('loading');
				tafsir.$el.scrollTop(0);

				container = tafsir.$el;
				part = tafsir.$el.find('code.aya[rel='+ position.aya +']').parent();

				// bold selected phrase
				quran = app.position.quran;
				if (quran.phrase) {
					parts = quran.phrase.split('_');
					part = $('#tafsir em[rel='+ parts[0] +'_'+ quran.sura + '_'+ quran.aya +'_'+ parts[1] +']').parent();
				}

				if (part.length > 0) {
					container.scrollTop(part.offset().top - container.offset().top + container.scrollTop());
					part.addClass('active');
				}

				// footnote
				tafsir.$el.find('span.footnote').tooltip({html: true, placement: 'auto'});
				tafsir.checkScroll();
			}
		};

		bayan = new Bayan({id: position.lang +'/'+ position.section});
		bayan.fetch({
			success: function (bayan) {
				loadBayan(bayan, prepare);
			},
			error: $.proxy(function (bayan) {
				$.ajax({
					context: {id: bayan.get('id')},
					url: server +'almizan_'+ bayan.get('id'),
					success: function(item){
						bayan = new Bayan({id: this.id, content: item});
						bayan.save();
						loadBayan(bayan, prepare);
					},
					error: app.connectionError
				}, {prepare: prepare});
			})
		});
	},
	checkScroll: function () {
		var current_page;
		base = this.$el.position().top;
		this.$el.find('code.page').each(function() {
			if ($(this).position().top > base) {
				current_page = $(this).attr('rel');
				return false;
			}
		})

		parts = current_page.split(',');
		this.trigger('tafsir-scroll', {'volume': parts[0], 'page': parts[1]})
	}
});

var AddressView = Backbone.View.extend({
	el: $("#header"),
	initialize: function() {
		var sura_select = this.$el.find('#sura');

		// sura selector
		var suraTokens = function(name) {
			name = name.replace('ي', 'ی').replace('ك', 'ک').replace('أ', 'ا').replace('إ', 'ا').replace('ؤ', 'و').replace('ة', 'ه');

			tokens = name.split('‌');
			tokens.push(name);
			if (name.substr(0, 2) == 'ال')
				tokens.push(name.substr(2));
			return tokens;
		}
		sura_items = new Bloodhound({
			local: _.map(quran_suras, function(item, i) { return {name: item, id: i+1}; }),
			datumTokenizer: function(d) { return suraTokens(d.name); },
			queryTokenizer: suraTokens,
			limit: 1000
		});
		sura_items.initialize();
		sura_select.typeahead({hint: false, autoselect: true, minLength: 0}, {
			name: 'sura',
			displayKey: 'name',
			source: sura_items.ttAdapter()
		});

		// selector events
		sura_select.bind('typeahead:selected', function(t, selected, name) {
			if (name == 'sura') {
				id = selected.id;
				if (id > 0 && id != app.position.quran.sura)
					app.router.navigate('quran/'+ id +'_1', true);
				sura_select.blur();
			}
		});
		sura_select.bind('typeahead:closed', function() {
			app.address.render();
		});
	},
	events: {
		'click .control': 'controlClick',
		'click .quran #sura': 'suraSelect',
	},
	render: function() {
		// clone position
		position = $.extend(true, {}, this.position);
		if (position.mode == 'quran') {
			page_sura = Number(quran_pages[position.quran.page][0].split('_')[0]);
			this.$el.find('#sura').val(quran_suras[page_sura-1]);
			// el.find('#page').val(position.quran.page);
		} else if (position.mode == 'detail') {
			this.$el.find('.detail .left').text(position.detail.aya +' سوره '+ quran_suras[position.detail.sura-1]);
		} else if (position.mode == 'tafsir') {
			this.$el.find('.tafsir .left').text('');
		}

		this.$el.find('.front').removeClass('front');
		this.$el.find('.'+ position.mode).addClass('front');

		// set page title
		title = '';
		if (position.mode == 'quran') {
			if (position.quran.aya != '')
				title = 'سوره '+ quran_suras[position.quran.sura-1] +'، آیه '+ refine(position.quran.aya);
			else
				title = 'صفحه '+ refine(position.quran.page);
		} else if (position.mode == 'tafsir') {
			parts = sectionToAddress(position.tafsir.section);
			title = 'تفسیر سوره '+ quran_suras[parts[0]] +'، آیات '+ refine(String(parts[1])) +' تا '+ refine(String(parts[2]));
		}
		$(document).attr('title', 'زلال' +' | '+ title);

		// store position
		variables.position = this.position;
		appStorage.update(variables);

		// metrics
		position = this.position;
		if (position.mode == 'quran') {
			if (position.quran.aya) {
				if (position.quran.phrase)
					track('Quran Phrase', position.quran);
			} else
				track('Quran', position.quran);
		}
		else if (position.mode == 'tafsir')
			track('Almizan', position.tafsir);
	},
	controlClick: function(e) {
		this.trigger($(e.target).attr('rel'));
	},
	suraSelect: function() {
		this.$el.find('#sura').val('').trigger('input').focus();
	},
	tafsirScroll: function(args) {
		this.$el.find('.tafsir .page').text('جلد '+ args['volume'] +' صفحه '+ args['page']);
	}
});

var AppView = Backbone.View.extend({
	el: $("body"),
	initialize: function() {
		this.address = new AddressView();
		this.quran = new QuranView();
		this.detail = new DetailView();
		this.tafsir = new TafsirView();

		this.quran.on('updateAddress', this.address.render, this.address);
		this.tafsir.on('updateAddress', this.address.render, this.address);
		this.tafsir.on('tafsir-scroll', this.address.tafsirScroll, this.address);
		this.address.on('next-page', this.quran.nextPage, this.quran);
		this.address.on('prev-page', this.quran.prevPage, this.quran);
		this.address.on('show-tafsir', this.showTafsir, this);
		this.address.on('show-quran', this.showQuran, this);
		this.address.on('next-aya', this.nextAyaDetail, this);
		this.address.on('prev-aya', this.prevAyaDetail, this);

		// message
		$('#message .close').click(function() {
			$('#message').hide();
		});

		// set position
		this.position = variables.position;
		this.quran.on('updateAddress', this.tafsir.loadSection, $.extend({}, this.tafsir, {prepare: this.position}));
	},
	events: {
		'keydown': 'navKey',
	},
	render: function() {
		$('#message').hide();
		this.quran.lastPosition = '';
		this.address.position = this.position;
		this.address.render();

		this.$el.find('#views > .front').removeClass('front');
		this.$el.find('#views #'+ this.position.mode).addClass('front');

		if (this.position.mode == 'quran') {
			this.quran.position = this.position.quran;
			this.quran.render();
		} else if (this.position.mode == 'detail') {
			this.detail.position = this.position.detail;
			this.detail.render();
		} else if (this.position.mode == 'tafsir') {
			this.tafsir.position = this.position.tafsir;
			this.tafsir.render();
		}
	},
	message: function(html, mode, link) {
		msg = $('#message #content');
		msg.removeClass('alert-block alert-error alert-success alert-info');

		msg.html(html);
		msg.addClass('alert-'+ mode);

		if (link) {
			msg.parent().attr('href', link);
			msg.parent().addClass('link');
		}
		else {
			msg.parent().removeAttr('href');
			msg.parent().removeClass('link');
		}

		box = $('#message');
		box.removeClass('top').show();
		aya = $('.aya.active');
		if (aya && aya.offset().top + aya.height() - box.offset().top + 10 > 0)
			box.addClass('top');

		box.find('#content').dotdotdot({ellipsis : ' ... '});
		if (box.find('h3').length)
			box.find('h3').dotdotdot({ellipsis : ' ... '});
	},
	connectionError: function() {
		$('body').find('.loading').removeClass('loading');
		app.message('خطا در اتصال به شبکه.', 'error', '');
	},
	showTafsir: function() {
		tafsir = quranToTafsir(this.position.quran);
		this.router.navigate('almizan_'+ tafsir.lang +'/'+ tafsir.aya, true);
	},
	showQuran: function() {
		quran = tafsirToQuran(this.position.tafsir);
		this.router.navigate('quran/'+ quran.sura +'_'+ quran.aya, true);
	},
	nextQuranPage: function() {
		page = this.position.quran.page;
		page += 1; if (page > 604) page = 604;
		this.router.navigate('quran/p'+ page, true);
	},
	prevQuranPage: function() {
		page = this.position.quran.page;
		page -= 1; if (page < 1) page = 1;
		this.router.navigate('quran/p'+ page, true);
	},
	nextQuranAya: function() {
		quran = this.position.quran;
		if (quran.aya == '') {
			first_aya = quran_pages[Number(quran.page)][0].split('_');
			quran.sura = Number(first_aya[0]);
			quran.aya = Number(first_aya[1]);
		}
		this.router.navigate('quran/'+ nextAya(quran.sura, quran.aya), true);
	},
	prevQuranAya: function() {
		quran = this.position.quran;
		if (quran.aya == '') {
			first_aya = quran_pages[Number(quran.page)][0].split('_');
			quran.sura = Number(first_aya[0]);
			quran.aya = Number(first_aya[1]);
		}
		this.router.navigate('quran/'+ prevAya(quran.sura, quran.aya), true);
	},
	nextAyaDetail: function() {
		detail = this.position.detail;
		this.router.navigate('detail/'+ nextAya(detail.sura, detail.aya), true);
	},
	prevAyaDetail: function() {
		detail = this.position.detail;
		this.router.navigate('detail/'+ prevAya(detail.sura, detail.aya), true);
	},
	navKey: function(e) {
		if (e.target.tagName == 'INPUT' || $('.modal').is(':visible'))
			return;

		prevent = true;
		if (this.position.mode == 'quran') {
			if(e.keyCode == 37) // left arrow
				this.nextQuranPage();
			else if(e.keyCode == 39) // right arrow
				this.prevQuranPage();
			else if(e.keyCode == 38) // up arrow
				this.prevQuranAya();
			else if(e.keyCode == 40) // down arrow
				this.nextQuranAya();
			else
				prevent = false;
		}
		else if (this.position.mode == 'detail') {
			if(e.keyCode == 37) // left arrow
				this.nextAyaDetail();
			else if(e.keyCode == 39) // right arrow
				this.prevAyaDetail();
			else
				prevent = false;
		} else
			prevent = false;

		if (prevent)
			e.preventDefault();
	}
});

var AddressRouter = Backbone.Router.extend({
	routes: {
		'quran/p:page': 'quranPage',
		'quran/:aya': 'quranAya',
		'quran/:aya/:phrase': 'quranPhrase',
		'detail/:aya': 'ayaDetail',
		'almizan_:lang/:aya': 'almizanAya'
	},
	quranPage: function(page) {
		if (isNaN(page) || page < 0 || page > 605)
			return;

		app.position.mode = 'quran';
		app.position.quran = {'page': Number(page), 'sura': '', 'aya': ''};
		app.render();
	},
	quranAya: function(aya) {
		if (!(aya in quran_ayas))
			return;

		app.position.mode = 'quran';
		app.position.quran = {'page': quran_ayas[aya], 'sura': Number(aya.split('_')[0]), 'aya': Number(aya.split('_')[1])};
		app.render();
	},
	ayaDetail: function(aya) {
		if (!(aya in quran_ayas))
			return;

		app.position.mode = 'detail';
		app.position.detail = {sura: Number(aya.split('_')[0]), aya: Number(aya.split('_')[1])};
		app.render();
	},
	almizanAya: function(lang, aya) {
		if (!(aya in almizan_ayas))
			return;

		app.position.mode = 'tafsir';
		app.position.tafsir = {lang: lang, aya: aya, section: almizan_ayas[aya]};
		app.render();
	}
});

var DetailView = Backbone.View.extend({
	el: $('#detail'),
	initialize: function () {
		//
	},
	render: function () {
		id = this.position.sura +'_'+ this.position.aya;
		var aya = new Aya({id: id});
		aya.fetch();

		var ayaView = new AyaView({model: aya});

		this.$el.empty();
		this.$el.append(ayaView.render().el);
		this.$el.append('<div>'+ aya.get('trans') +'</div>');
	},
});


// helpers
var numchars = {'0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹'};
var refine = function(str) {
	return String(str).replace(/[0-9]/g, function(c) { return numchars[c]; });
};
var renumchars = {'۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'};
var rerefine = function(str) {
	return String(str).replace(/[۰-۹]/g, function(c) { return renumchars[c]; });
};

var sectionToAddress = function(section) {
	tmp = section.replace('-', '_');
	parts = tmp.split('_');
	if (parts.length == 2)
		parts.push(parts[1]);
	return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
};
var quranToTafsir = function(quran) {
	var aya;
	if (quran.aya == '')
		aya = quran.sura +'_'+ quran_pages[quran.page][0].split('_')[1];
	else
		aya = quran.sura +'_'+ quran.aya;
	return {lang: variables.lang, aya: aya, section: almizan_ayas[aya]};
};
var tafsirToQuran = function(tafsir) {
	parts = tafsir.aya.split('_');
	return {sura: parts[0], aya: parts[1]};
};

var nextAya = function(sura, aya) {
	if (aya < sura_ayas[sura])
		aya += 1;
	else if (aya == sura_ayas[sura] && sura < quran_suras.length) {
		sura += 1;
		aya = 1;
	}
	return sura +'_'+ aya;
}
var prevAya = function(sura, aya) {
	if (aya > 1)
		aya -= 1;
	else if (aya == 1 && sura > 1) {
		sura -= 1;
		aya = sura_ayas[sura];
	}
	return sura +'_'+ aya;
}

var track = function(title, data) {
	mixpanel.track(title, data);
}


// aya inverted index
var quran_ayas = {}, sura_ayas = {}, almizan_ayas = {};
_.each(quran_pages, function(page, p) {
	for (aya in page) {
		quran_ayas[page[aya]] = Number(p);
		sura_ayas[Number(page[aya].split('_')[0])] = Number(page[aya].split('_')[1]);
	}
});
_.each(almizan_sections, function(section) {
	parts = sectionToAddress(section);
	for (i = parts[1]; i <= parts[2]; i++)
		almizan_ayas[parts[0]+'_'+i] = section;
});
