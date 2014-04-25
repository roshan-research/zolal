
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
			version: 1,
			migrate: function (transaction, next) {
				transaction.db.createObjectStore('tafsirs');
				next();
			}
		}, {
			version: 2,
			migrate: function (transaction, next) {
				transaction.objectStore('tafsirs').clear();
				localStorage.clear();
				next();
			}
		}, {
			version: 3,
			migrate: function (transaction, next) {
				localStorage.clear();
				next();
			}
		}
	]
};


// models
var Aya = Backbone.Model.extend({
	insertPhrase: function(phrase) {
		key = phrase['lang'] +'_'+ phrase['words'];
		if (!this.get('phrases') || !(key in this.get('phrases'))) {
			item = {}; item[key] = phrase;
			this.set('phrases', $.extend(item, this.get('phrases')));
		}
	},
	localStorage: new Backbone.LocalStorage('Quran')
});

var Quran = Backbone.Collection.extend({
	model: Aya,
	loadPage: function(page, callback) {
		var collection = this;
		ayas = quran_pages[page];
		(new Aya({id: ayas[0]})).fetch({
			success: function() {
				for (a in ayas) {
					aya = new Aya({id: ayas[a]});
					aya.fetch();
					collection.add(aya);
				}
				if (callback) callback(page);
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
								collection.add(aya);
							}
						});
						if (callback) callback(this.page);
					},
					error: app.connectionError
				});
			}
		});
	}
});

var Bayan = Backbone.Model.extend({
	database: tafsirDb,
	storeName: 'tafsirs'
});


var Almizan = Backbone.Collection.extend({
	database: tafsirDb,
	storeName: 'tafsirs',
	model: Bayan,
	initialize: function() {
		this.loaded = [];
	},
	loadBayan: function(id, callback) {
		var almizan = this;
		var bayan = new Bayan({id: id});
		bayan.fetch({
			success: function (bayan) {
				almizan.extractPhrases(bayan);
				if (callback) callback(bayan);
			},
			error: $.proxy(function (bayan) {
				$.ajax({
					context: {id: bayan.get('id')},
					url: server +'almizan_'+ bayan.get('id'),
					success: function(item){
						bayan = new Bayan({id: this.id, content: item});
						bayan.save();
						almizan.extractPhrases(bayan);
						if (callback) callback(bayan);
					},
					error: app.connectionError
				});
			})
		});
	},
	extractPhrases: function(bayan) {
		if (this.loaded.indexOf(bayan.get('id')) < 0)
			this.loaded.push(bayan.get('id'));

		var almizan = this;
		$(bayan.get('content')).find('em[rel]').each(function() {
			parts = $(this).attr('rel').split('_'); key = parts[1] +'_'+ parts[2];
			aya = almizan.quran.get(key);
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
			aya.insertPhrase({words: parts[3], lang: parts[0], html: parent.html(), link: 'almizan_'+ parts[0] +'/'+ parts[1] +'_'+ parts[2] +'/'+ parts[3]});
		});
	}
});

// views
var AyaView = Backbone.View.extend({
	template: _.template('<span class="aya-text" rel="<%= sura %>_<%= aya %>"><span class="text"><%= html %></span> <span class="number"><%= aya %></span></span>'),
	render: function () {
		data = this.model.toJSON();
		text = data['text'];
		text = text.replace(/َٰ/g, 'ٰ').replace(/ُۢ/g, 'ٌ').replace(/[۪۫]/g, ''); // font refinement
		data['html'] = text.replace(/[ ]*([ۖۗۚۛۙۘ])[ ]*/g, '<span class="mark">\$1 </span>');
		this.setElement(this.template(data));
		return this;
	},
	events: {
		'click': 'click'
	},
	click: function() {
		aya = this.model.get('sura') +'_'+ this.model.get('aya');
		if (app.position.mode == 'quran') {
			if (this.$el.hasClass('active'))
				app.router.navigate('detail/'+ aya, {trigger: true});
			else
				app.router.navigate('quran/'+ aya, {trigger: true, replace: true});
		}
	}
});

var QuranView = Backbone.View.extend({
	el: $("#quran"),
	initialize: function() {
		this.collection = new Quran();

		// page indicator
		this.pageElement = new Draggabilly($('#page')[0], {axis: 'y', containment: true})
			.on('dragMove', function(instance) {
				instance.element.setAttribute('rel', offsetToPage(instance.position.y));
			}).on('dragEnd', function(instance) {
				app.router.navigate('quran/p'+ instance.element.getAttribute('rel'), {trigger: true});
			});
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
		this.$el.find('#page-style').html('#quran .page {width: '+ this.$el.outerWidth() +'px}');
		var quran = this;
		el = this.$el.find('.page[rel='+ this.position.page +']');
		pages = this.$el.find('#pages');
		front = pages.find('.front');
		el.addClass('front');
		if (front.attr('rel') != this.position.page)
			this.$el.stop().animate({scrollLeft: el.offset().left - pages.offset().left + parseInt(this.$el.css('padding-left'))}, (front.length ? 300 : 0), function() {
				front.removeClass('front');
				quran.$el.find('.page[rel='+ quran.position.page +']').addClass('front');
			});

		// page indicator
		indicator = this.$el.find('#page').attr('rel', this.position.page);
		indicator.css('top', pageToOffset(this.position.page));
	},
	renderPage: function(page) {
		var el = this.$el.find('.page[rel='+ page +'] .ayas');
		el.parent().removeClass('loading');
		_.each(this.collection.models, function (item) {
			if (item.get('page') == page) {
				var ayaView = new AyaView({model: item});
				if (item.get('aya') == 1) {
					el.append('<div class="sura header"><div class="right">سورة</div><div class="left">'+ quran_suras[item.get('sura')-1] +'</div></div>');
					if (item.get('sura') != 1 && item.get('sura') != 9)
						el.append('<div class="aya-text bism"><span class="text">بِسمِ اللَّهِ الرَّحمٰنِ الرَّحيمِ</span></div>');
				}
				el.append(ayaView.render().el, ' ');
			}
		});
		this.updateSelectedAya();
	},
	loadPage: function(page) {
		if (page > 604 || page < 1)
			return;

		// show loaded page
		if (this.isRendered(page)) {
			this.updateSelectedAya();
			return;
		}

		// add new page
		pages = this.$el.find('#pages');
		newPage = $('<div class="page loading" rel="'+ page +'"><div class="ayas"></div></div>');
		if (this.isRendered(page + 1)) {
			pages.append(newPage);
		} else if (this.isRendered(page - 1)) {
			first = pages.children().first();
			off = first.offset().left;
			pages.prepend(newPage);
			this.$el.scrollLeft(this.$el.scrollLeft() + first.offset().left - off);
		} else {
			pages.empty();
			pages.append(newPage);
		}

		this.collection.loadPage(page, $.proxy(this.renderPage, this));
	},
	updateSelectedAya: function() {
		active = this.$el.find('.active');

		if (this.position.aya != '') {
			// don't update it
			pos = this.position; last = this.lastPosition;
			if (last && pos.sura == last.sura && pos.aya == last.aya && pos.phrase == last.phrase)
				return;

			id = this.position.sura +'_'+ this.position.aya;
			aya = this.collection.get(id);
			active.removeClass('active');
			this.$el.find('.aya-text[rel='+ id +']').addClass('active');
		} else
			active.removeClass('active');

		this.lastPosition = $.extend({}, this.position);
	},
	isRendered: function(page) {
		return this.$el.find('.page[rel='+ page +']').length > 0;
	}
});

var TafsirView = Backbone.View.extend({
	el: $("#tafsir"),
	initialize: function() {
		this.sections = almizan_sections;
	},
	events: {
		'scroll': 'checkScroll'
	},
	render: function() {
		this.$el.find('.content').empty();
		this.trigger('updateAddress');
		this.loadSection();
	},
	renderBayan: function (bayan) {
		// content
		this.$el.find('.content').html(bayan.get('content'));
		this.$el.removeClass('loading');
		this.$el.scrollTop(0);

		// bold active part
		if (this.position.phrase)
			part = this.$el.find('em[rel='+ this.position.lang +'_'+ this.position.aya +'_'+ this.position.phrase +']').parent();
		else
			part = this.$el.find('code.aya[rel='+ this.position.aya +']').parent();

		if (part.length > 0) {
			this.$el.scrollTop(part.offset().top - this.$el.offset().top + this.$el.scrollTop());
			part.addClass('active');
		}

		// footnote
		this.$el.find('span.footnote').tooltip({html: true, placement: 'auto'});
		this.checkScroll();
	},
	loadSection: function() {
		var tafsir = this;
		var position = this.position;
		var prepare = Boolean(this['prepare']);

		if (prepare) {
			position = quranToTafsir(this['prepare'].quran);
			bid = position.lang +'/'+ position.section;
			if (this.almizan.loaded.indexOf(bid) >= 0)
				return;
		}

		// show loading element
		if (!prepare)
			this.$el.addClass('loading');

		this.almizan.loadBayan(position.lang +'/'+ position.section, prepare ? null : $.proxy(this.renderBayan, this));
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

		if (current_page) {
			parts = current_page.split(',');
			this.trigger('tafsir-scroll', {'volume': parts[0], 'page': parts[1]})
		}
	}
});

var AddressView = Backbone.View.extend({
	el: $("#header"),
	initialize: function() {
		var sura_select = this.$el.find('#sura');

		// sura selector
		var suraTokens = function(name) {
			name = name.replace('ي', 'ی').replace('ك', 'ک').replace('أ', 'ا').replace('إ', 'ا').replace('ؤ', 'و').replace('ة', 'ه');

			if (name[0] == '‌')
				name = name.substr(1);

			tokens = name.split('‌');
			tokens.push(name);
			tokens.push('‌'); // general token
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
					app.router.navigate('quran/'+ id +'_1', {trigger: true});
				sura_select.blur();
			}
		});
		sura_select.bind('typeahead:closed', function() {
			app.address.render();
		});
	},
	events: {
		'click .glyphicon': 'controlClick',
		'click .quran #sura': 'suraSelect',
	},
	render: function() {
		// clone position
		position = $.extend(true, {}, this.position);
		if (position.mode == 'quran') {
			page_sura = Number(quran_pages[position.quran.page][0].split('_')[0]);
			this.$el.find('#sura').val(quran_suras[page_sura-1]);
		} else if (position.mode == 'detail') {
			this.$el.find('.detail .left').text(position.detail.aya +' سوره '+ quran_suras[position.detail.sura-1]);
		} else if (position.mode == 'tafsir') {
			this.$el.find('.tafsir .left').text('المیزان');
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
			if (! position.quran.aya)
				track('Quran', position.quran);
		} else if (position.mode == 'detail')
			track('Detail', {aya: position.detail.sura +'_'+ position.detail.aya});
		else if (position.mode == 'tafsir')
			track('Almizan', position.tafsir);
	},
	controlClick: function(e) {
		this.trigger($(e.target).attr('rel'));
	},
	suraSelect: function() {
		this.$el.find('#sura').val(' ').trigger('input').val('‌').trigger('input').focus();
	},
	tafsirScroll: function(args) {
		if (args['volume'] && args['page'])
			this.$el.find('.tafsir .left').text('المیزان، ج'+ args['volume'] +' ص'+ args['page']);
	}
});

var AppView = Backbone.View.extend({
	el: $("body"),
	initialize: function() {
		this.address = new AddressView();
		this.quran = new QuranView();
		this.detail = new DetailView();
		this.tafsir = new TafsirView();

		this.tafsir.almizan = new Almizan();
		this.tafsir.almizan.quran = this.quran.collection;

		this.detail.quran = this.quran.collection;
		this.detail.almizan = this.tafsir.almizan;

		this.quran.on('updateAddress', this.address.render, this.address);
		this.tafsir.on('updateAddress', this.address.render, this.address);
		this.tafsir.on('tafsir-scroll', this.address.tafsirScroll, this.address);
		this.address.on('next-page', this.nextQuranPage, this);
		this.address.on('prev-page', this.prevQuranPage, this);
		this.address.on('show-tafsir', this.showTafsir, this);
		this.address.on('show-quran', this.showQuran, this);
		this.address.on('menu', this.showMenu, this);
		this.address.on('next-aya', this.nextAyaDetail, this);
		this.address.on('prev-aya', this.prevAyaDetail, this);

		// set position
		this.position = variables.position;
		this.quran.on('updateAddress', this.tafsir.loadSection, $.extend({}, this.tafsir, {prepare: this.position}));
	},
	events: {
		'keydown': 'navKey',
	},
	render: function() {
		this.quran.lastPosition = '';
		this.address.position = this.position;
		this.address.render();

		this.$el.find('#views > .front').removeClass('front');
		this.$el.find('#views > #'+ this.position.mode).addClass('front');

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
	connectionError: function() {
		$('body').find('.loading').removeClass('loading');
	},
	showTafsir: function() {
		tafsir = quranToTafsir(this.position.quran);
		this.router.navigate('almizan_'+ tafsir.lang +'/'+ tafsir.aya, {trigger: true});
	},
	showQuran: function() {
		if (this.position.mode == 'detail')
			this.router.navigate('quran/'+ this.position.detail.sura +'_'+ this.position.detail.aya, {trigger: true});
		else if (this.position.mode == 'tafsir') {
			quran = tafsirToQuran(this.position.tafsir);
			this.router.navigate('quran/'+ quran.sura +'_'+ quran.aya, {trigger: true});
		}
	},
	nextQuranPage: function() {
		page = this.position.quran.page;
		page += 1; if (page > 604) page = 604;
		this.router.navigate('quran/p'+ page, {trigger: true, replace: true});
	},
	prevQuranPage: function() {
		page = this.position.quran.page;
		page -= 1; if (page < 1) page = 1;
		this.router.navigate('quran/p'+ page, {trigger: true, replace: true});
	},
	nextQuranAya: function() {
		quran = this.position.quran;
		if (quran.aya == '') {
			first_aya = quran_pages[Number(quran.page)][0].split('_');
			quran.sura = Number(first_aya[0]);
			quran.aya = Number(first_aya[1]);
		}
		this.router.navigate('quran/'+ nextAya(quran.sura, quran.aya), {trigger: true, replace: true});
	},
	prevQuranAya: function() {
		quran = this.position.quran;
		if (quran.aya == '') {
			first_aya = quran_pages[Number(quran.page)][0].split('_');
			quran.sura = Number(first_aya[0]);
			quran.aya = Number(first_aya[1]);
		}
		this.router.navigate('quran/'+ prevAya(quran.sura, quran.aya), {trigger: true, replace: true});
	},
	nextAyaDetail: function() {
		detail = this.position.detail;
		this.router.navigate('detail/'+ nextAya(detail.sura, detail.aya), {trigger: true, replace: true});
	},
	prevAyaDetail: function() {
		detail = this.position.detail;
		this.router.navigate('detail/'+ prevAya(detail.sura, detail.aya), {trigger: true, replace: true});
	},
	showMenu: function() {
		this.$el.find('#menu').modal();
		show_tafsir_stats();
	},
	navKey: function(e) {
		if (e.target.tagName == 'INPUT' || $('.modal').is(':visible'))
			return;

		page_up = e.keyCode == 33;
		page_down = e.keyCode == 34;
		left_arrow = e.keyCode == 37;
		up_arrow = e.keyCode == 38;
		right_arrow = e.keyCode == 39;
		down_arrow = e.keyCode == 40;

		if (this.position.mode == 'quran') {
			if(left_arrow)
				this.nextQuranPage();
			else if(right_arrow)
				this.prevQuranPage();
			else if(up_arrow)
				this.prevQuranAya();
			else if(down_arrow)
				this.nextQuranAya();
			else
				return;
		}
		else if (up_arrow || down_arrow || page_up || page_down) {
			if (this.position.mode == 'detail')
				element = this.detail.$el;
			else if (this.position.mode == 'tafsir')
				element = this.tafsir.$el;
			else
				return;

			if (up_arrow)
				element.scrollTop(element.scrollTop() - 30);
			else if (down_arrow)
				element.scrollTop(element.scrollTop() + 30);
			else if (page_up)
				element.scrollTop(element.scrollTop() - element.height());
			else if (page_down)
				element.scrollTop(element.scrollTop() + element.height());
		}
		else if (this.position.mode == 'detail') {
			if(left_arrow)
				this.nextAyaDetail();
			else if(right_arrow)
				this.prevAyaDetail();
			else
				return;
		} else
				return;

		e.preventDefault();
	}
});

var AddressRouter = Backbone.Router.extend({
	routes: {
		'quran/p:page': 'quranPage',
		'quran/:aya': 'quranAya',
		'detail/:aya': 'ayaDetail',
		'almizan_:lang/:aya': 'almizanAya',
		'almizan_:lang/:aya/:phrase': 'almizanPhrase',
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
		this.almizanPhrase(lang, aya, '');
	},
	almizanPhrase: function(lang, aya, phrase) {
		if (!(aya in almizan_ayas))
			return;

		app.position.mode = 'tafsir';
		app.position.tafsir = {lang: lang, section: almizan_ayas[aya], aya: aya, phrase: phrase};
		app.render();
	}
});

var DetailView = Backbone.View.extend({
	el: $('#detail .content'),
	render: function () {
		id = this.position.sura +'_'+ this.position.aya;
		this.quran.loadPage(quran_ayas[id], $.proxy(this.renderDetails, this));

		// phrases
		this.$el.find('#phrases').empty();
		tafsir = quranToTafsir(this.position);
		bid = tafsir.lang +'/'+ tafsir.section;
		if (this.almizan.loaded.indexOf(bid) >= 0)
			this.renderPhrases();
		else
			this.almizan.loadBayan(bid, $.proxy(this.renderPhrases, this));
	},
	renderDetails: function() {
		this.aya = this.quran.get(id);

		ayaView = new AyaView({model: this.aya});
		this.$el.find('#aya').html(ayaView.render().el);

		if (variables.lang == 'fa')
			this.$el.find('#translation').text(this.aya.get('fa'));
		else
			this.$el.find('#translation').empty();
	},
	renderPhrases: function() {
		var words = this.aya.get('text').replace(/[ۖۗۚۛۙۘ]/g, '').split(' ');
		var detail = this;
		_.each(this.aya.get('phrases'), function (phrase) {
			if (phrase['lang'] != variables.lang)
				return;
			start = Number(phrase['words'].split('-')[0]); end = Number(phrase['words'].split('-')[1]);
			detail.$el.find('#phrases').append('<div class="phrase fill" rel="'+ phrase['lang'] +'_'+ phrase['words'] +'"><a href="#'+ phrase['link'] +'"><span class="aya-text fill"><span class="text">'+ words.slice(start-1, end).join(' ') +'</span></span></a>'+ phrase['html'] +'</div>');
		});
	}
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

var offsetToPage = function(offset) {
	height = $('.page').height() - $('#page').height();
	page = Math.round((offset / height) * 604);

	if (page > 604) return 604;
	if (page < 1) return 1;
	return page;
}
var pageToOffset = function(page) {
	height = $('.page').height() - $('#page').height();
	offset = height * (page / 604);
	return offset;
}


// track
var trackedData;
var track = function(title, data) {
	if (data != trackedData)
		mixpanel.track(title, data);
	trackedData = data;
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
