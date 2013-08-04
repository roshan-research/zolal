var store = false;
var server = '/';


// functions
var numchars = {'0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹'};
var refine = function(str) {
	return String(str).replace(/[0-9]/g, function(c) { return numchars[c]; });
};
var renumchars = {'۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'};
var rerefine = function(str) {
	return String(str).replace(/[۰-۹]/g, function(c) { return renumchars[c]; });
};


// read variables
appStorage = new Backbone.LocalStorage('App');
if (!appStorage.find({id: 'variables'}))
	appStorage.update({
		id: 'variables',
		lang: 'fa',
		position: {mode: 'quran', quran: {page: 1, sura: 1, aya: ''}, tafsir: {section: '1-1:5'}}});

variables = appStorage.find({id: 'variables'});


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
	localStorage: new Backbone.LocalStorage('Almizan')
});


// views
var AyaView = Backbone.View.extend({
	template: _.template('<span class="aya" rel="<%= sura %>_<%= aya %>"><span class="text"><%= html %></span> <span class="number"><%= aya %></span></span>'),
	initialize: function () {
		this.model.on('change', this.render, this);
	},
	render: function () {
		data = this.model.toJSON();
		data['html'] = data['text'].replace(/[ ]*([ۖۗۚۛۙۘ])[ ]*/g, '<span class="mark"> \$1 </span>');

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
				// else console.log(data['id'] +'/'+ key);
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

		// update quran address
		app.quran.position.aya = this.model.get('aya');
		app.quran.position.sura = this.model.get('sura');
		if (target.hasClass('phrase') && target.parent().parent().hasClass('active'))
			app.quran.position.phrase = target.attr('rel');
		else
			app.quran.position.phrase = '';

		app.quran.render();
	}
});

var QuranView = Backbone.View.extend({
	el: $("#quran"),
	initialize: function() {
		this.collection = new Quran();
	},
	render: function() {
		if (this.position.aya != '')
			this.position.page = quran_ayas[this.position.sura+ '_'+ this.position.aya];

		this.loadPage(this.position.page);

		// update address
		if (this.position.aya == '')
			this.position.sura = Number(quran_pages[this.position.page][0].split('_')[0]);
		this.trigger('updateAddress');

		// prepare pages
		this.loadPage(this.position.page-1);
		this.loadPage(this.position.page+1);

		// show page
		var quran = this;
		el = this.$el.find('.page[rel='+ this.position.page +']');
		pages = this.$el.find('#pages');
		front = pages.find('.front');
		el.addClass('front');
		if (front.attr('rel') != this.position.page)
			this.$el.stop().animate({ scrollLeft: el.offset().left - pages.position().left }, 400, function() {
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
						el.append('<div class="sura"><span>'+ quran_suras[item.get('sura')-1] +'</span></div>');
						if (item.get('sura') != 1 && item.get('sura') != 9)
							el.append('<div class="bism"><span>بِسمِ اللَّهِ الرَّحمٰنِ الرَّحيمِ</span></div>');
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
					url: server +'files/quran/p'+ page,
					success: function(data){
						_.each(data.split('\n'), function(item) {
							if (item) {
								item = $.parseJSON(item);
								aya = new Aya(item);
								if (store) aya.save();
								quran.collection.add(aya);
							}
						});
						renderPage(this.page);
					},
					error: app.connectionError
				});
			}
		});
	},
	nextPage: function() {
		this.position.aya = '';
		this.position.page += 1;
		if (this.position.page > 604) {
			this.position.page = 604;
			return false;
		}
		return true;
	},
	prevPage: function() {
		this.position.aya = '';
		this.position.page -= 1;
		if (this.position.page < 1) {
			this.position.page = 1;
			return false;
		}
		return true;
	},
	nextAya: function() {
		this.position.phrase = '';
		if (this.position.aya == '')
			this.position.aya = Number(quran_pages[Number(this.position.page)][0].split('_')[1]);
		else if (this.position.aya < sura_ayas[this.position.sura])
			this.position.aya += 1;
		else if (this.position.aya == sura_ayas[this.position.sura] && this.position.sura < quran_suras.length) {
			this.position.sura += 1;
			this.position.aya = 1;
		} else
			return false;
		return true;
	},
	prevAya: function() {
		this.position.phrase = '';
		if (this.position.aya == '')
			this.position.aya = Number(this.$el.find('.front .aya').first().attr('rel').split('_')[1]);
		else if (this.position.aya > 1)
			this.position.aya -= 1;
		else if (this.position.aya == 1 && this.position.sura > 1) {
			this.position.sura -= 1;
			this.position.aya = sura_ayas[this.position.sura];
		} else
			return false;
		return true;
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
			position = this.quranToTafsir(this['prepare'].quran);
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
					part.css('background', '#FFFC99').animate({ backgroundColor: 'none' }, 1000);
					container.scrollTop(part.offset().top - container.offset().top + container.scrollTop());
				}

				// footnote
				tafsir.$el.find('span.footnote').hover(function() {
					app.message($(this).attr('content'), 'note');
				}, function() {
					$('#message').hide();
				});
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
					url: server +'files/almizan_'+ bayan.get('id'),
					success: function(item){
						bayan = new Bayan({id: this.id, content: item});
						if (store) bayan.save();
						loadBayan(bayan, prepare);
					},
					error: app.connectionError
				}, {prepare: prepare});
			})
		});
	},
	quranToTafsir: function(quran) {
		aya = quran.sura +'_'+ quran.aya;
		return {lang: variables.lang, aya: aya, section: almizan_ayas[aya]};
	},
	tafsirToQuran: function(tafsir) {
		parts = tafsir.aya.split('_');
		return {sura: parts[0], aya: parts[1]};
	},
	checkScroll: function () {
		// // focused section
		// var focusCode = this.$el.find('code.section').first().next(); // code element is hidden
		// this.$el.find('code.section').each(function() {
		// 	if (focusCode.position().top < 0 && $(this).next().position().top > focusCode.position().top)
		// 		focusCode = $(this).next();
		// });

		// triggerOff = 100;
		// focus = '';

		// if (focusCode.length) {
		// 	if (focusCode.position().top - triggerOff <= 0)
		// 		focus = focusCode.prev().text();
		// 	else
		// 		focus =focusCode.prev().attr('prev');
		// }

		// if (focus != '' && focus != this.position.section) {
		// 	this.position.section = focus;
		// 	this.position.part = '';
		// 	this.trigger('updateAddress');
		// }
	}
});

var AddressView = Backbone.View.extend({
	el: $("#address"),
	initialize: function() {

		var sura_select = this.$el.find('.quran-address #sura'), aya_select = this.$el.find('.quran-address #aya'), page_select = this.$el.find('.quran-address #page');
		numberData = function(num) {
			items = [];
			for (i = 1; i <= num; i++)
				items.push({value: i, tokens: [refine(String(i)), String(i)]});
			return items;
		};

		// sura selector
		sura_items = [];
		_.each(quran_suras, function(item, i) {
			name = item;
			tokens = [name, name.replace('أ', 'ا').replace('إ', 'ا').replace('ؤ', 'و')];
			if (item.indexOf('ال') == 0) {
				name = name.substr(2);
				tokens.push(name); tokens.push(name.replace('أ', 'ا').replace('إ', 'ا').replace('ؤ', 'و'));
			}
			sura_items.push({value: item, tokens: tokens});
		});
		this.$el.find('.quran-address #sura').typeahead({
			name: 'sura',
			local: sura_items
		});

		// page selector
		this.$el.find('.quran-address #page').typeahead({
			name: 'page',
			local: numberData(604)
		});

		// selector events
		sura_select.bind('typeahead:selected', function() {
			id = quran_suras.indexOf(sura_select.val())+1;
			if (id > 0) {
				aya_select.typeahead('destroy').typeahead({
					local: numberData(sura_ayas[id])
				});
				if (id != app.position.quran.sura)
					app.router.navigate('quran/'+ id +'_1', true);
			}
		});
		aya_select.bind('typeahead:selected', function() {
			aya = rerefine($(this).val());
			if (aya >= 1 && aya <= sura_ayas[app.position.quran.sura] && aya != app.position.quran.aya)
				app.router.navigate('quran/'+ app.position.quran.sura +'_'+ aya, true);
		});
		page_select.bind('typeahead:selected', function() {
			page = rerefine($(this).val());
			if (page >= 1 && page <= 604 && page != app.position.quran.page)
				app.router.navigate('quran/p'+ page, true);
		});

		menus = this.$el.find('.tt-dropdown-menu');
		this.$el.find('.quran-address').find('#sura, #aya, #page').keypress(function(e) {
			if(e.which == 13) {
				$(e.target).trigger('typeahead:selected');
				menus.hide();
			}
		});

		this.$el.find('input').click(function() {
			$(this).select();
		});
	},
	render: function() {
		controls = ['settings'];
		this.$el.find('#navigator li').hide();

		// clone position
		position = $.extend(true, {}, this.position);
		if (position.mode == 'quran') {
			if (position.quran.aya != '') {
				slug = position.quran.sura +'_'+ position.quran.aya;
				if (position.quran.phrase)
					slug += '/'+ position.quran.phrase;
				app.router.navigate('quran/'+ slug, {trigger: false, replace: true});
			}
			else
				app.router.navigate('quran/p'+ position.quran.page, false);

			controls.push('tafsir');
			this.$el.find('.tafsir-address').hide();
			el = this.$el.find('.quran-address');
			el.show();

			el.find('#sura').val(quran_suras[position.quran.sura-1]).change();
			el.find('#page').val(position.quran.page);
			el.find('#aya').val(position.quran.aya ? position.quran.aya : '...');
		}
		else if (position.mode == 'tafsir') {
			app.router.navigate('almizan_'+ position.tafsir.lang +'/'+ this.position.tafsir.aya, false);
			parts = sectionToAddress(position.tafsir.section);
			position.tafsir = {'sura': quran_suras[parts[0]-1], 'mi': parts[1], 'ma': parts[2]};

			controls.push('quran');
			this.$el.find('.quran-address').hide();
			el = this.$el.find('.tafsir-address');
			el.show();
			el.find('#sura').text(position.tafsir['sura']);
			el.find('#mi').text(position.tafsir['mi']);
			el.find('#ma').text(position.tafsir['ma']);
		}
		this.$el.show();

		// show controls
		_.each(controls, function(item) {
			$('#navigator .'+ item).show();
		});

		// set page title
		title = '';
		if (position.mode == 'quran') {
			if (position.quran.aya != '')
				title = 'سوره '+ quran_suras[position.quran.sura-1] +'، آیه '+ refine(position.quran.aya);
			else
				title = 'صفحه '+ refine(position.quran.page);
		} else if (position.mode == 'tafsir')
			title = 'تفسیر سوره '+ position.tafsir.sura  +'، آیات '+ refine(position.tafsir.mi) +' تا '+ refine(position.tafsir.ma);
		$(document).attr('title', 'زلال' +' | '+ title);

		// store position
		variables.position = this.position;
		appStorage.update(variables);

		// metrics
		position = this.position;
		if (position.mode == 'quran') {
			if (position.quran.aya) {
				if (position.quran.phrase)
					mixpanel.track('Quran Phrase', position.quran);
				else
					mixpanel.track('Quran Aya', position.quran);
			} else
				mixpanel.track('Quran', position.quran);
		}
		else if (position.mode == 'tafsir')
			mixpanel.track('Almizan', position.tafsir);
	}
});

var AppView = Backbone.View.extend({
	el: $("body"),
	initialize: function() {
		this.address = new AddressView();
		this.quran = new QuranView();
		this.tafsir = new TafsirView();
		this.quran.on('updateAddress', this.address.render, this.address);
		this.tafsir.on('updateAddress', this.address.render, this.address);

		// message
		$('#message .close').click(function() {
			$('#message').hide();
		});

		// set position
		this.position = variables.position;
		this.quran.on('updateAddress', this.tafsir.loadSection, $.extend({}, this.tafsir, {prepare: this.position}));
	},
	render: function() {
		$('#message').hide();
		this.quran.lastPosition = '';
		this.address.position = this.position;

		if (this.position.mode == 'quran') {
			this.quran.$el.show();
			this.tafsir.$el.hide();
			this.quran.position = this.position.quran;
			this.quran.render();
		} else if (this.position.mode == 'tafsir') {
			this.quran.$el.hide();
			this.tafsir.$el.show();
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
		box.find('h3').dotdotdot({ellipsis : ' ... '});
	},
	connectionError: function() {
		this.$el.find('.loading').removeClass('loading');
		app.message('خطا در اتصال به شبکه.', 'error', '');
	},
	events: {
		'keydown': 'navKey',
		'click #navigator a[rel]': 'navigate'
	},
	navigate: function(e) {
		e.preventDefault();

		lastMode = this.position.mode;
		this.position.mode = $(e.target).attr('rel');
		if (lastMode == 'quran' && this.position.mode == 'tafsir')
			this.position.tafsir = this.tafsir.quranToTafsir(this.position.quran);
		else if (lastMode == 'tafsir' && this.position.mode == 'quran') {
			quran = this.tafsir.tafsirToQuran(this.position.tafsir);
			if (quran.sura != this.position.quran.sura)
				this.position.quran = quran;
		}

		if (lastMode != this.position.mode)
			this.render();
	},
	navKey: function(e) {

		if (e.target.tagName == 'INPUT' || $('.modal').is(':visible'))
			return;

		refresh = false;
		if (this.position.mode == 'quran') {
			if(e.keyCode == 37) // left arrow
				refresh = this.quran.nextPage();
			else if(e.keyCode == 38) // up arrow
				refresh = this.quran.prevAya();
			else if(e.keyCode == 39) // right arrow
				refresh = this.quran.prevPage();
			else if(e.keyCode == 40) // down arrow
				refresh = this.quran.nextAya();
		}

		if (refresh) {
			e.preventDefault();
			this.render();
		}
	}
});

var AddressRouter = Backbone.Router.extend({
	routes: {
		'quran/p:page': 'quranPage',
		'quran/:aya': 'quranAya',
		'quran/:aya/:phrase': 'quranPhrase',
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
		this.quranPhrase(aya, '');
	},
	quranPhrase: function(aya, phrase) {
		if (!(aya in quran_ayas))
			return;

		app.position.mode = 'quran';
		app.position.quran = {'page': '', 'sura': Number(aya.split('_')[0]), 'aya': Number(aya.split('_')[1]), 'phrase': phrase};
		app.render();
	},
	almizanAya: function(lang, aya) {
		if (!(aya in almizan_ayas))
			return;

		app.position.mode = 'tafsir';
		app.position.tafsir = {'lang': lang, 'aya': aya, section: almizan_ayas[aya]};
		app.render();
	}
});

var sectionToAddress = function(section) {
	tmp = section.replace('-', '_');
	parts = tmp.split('_');
	if (parts.length == 2)
		parts.push(parts[1]);
	return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
};

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


$(window).resize(function() {
	$('#container').height($('#wrap').height() - $('#footer').height());
	$('#quran, #tafsir').height($('#container').height() - ($('#quran').outerHeight(true) - $('#quran').height()));
	$('#pages').height($('#quran').height() - 20);
	$('#wrap').css('margin-top', ($('body').height() - $('#wrap').height())/2);

	$('#page-style').html('#quran .page {width: '+ ($('#quran').width() - 20) +'px}');
	if ($('#quran .front').length)
		$('#quran').scrollLeft($('#quran .front').offset().left - $('#pages').position().left);
});

var app;
$(document).ready(function() {
	$(window).resize();

	app = new AppView();
	app.router = new AddressRouter();
	Backbone.history.start();

	if (Backbone.history.getFragment() == '')
		app.render();

	mixpanel.track('Zolal');
});

$(window).load($(window).resize);

// menu
$('#menu a').click(function() {
	$('.modal[rel='+ $(this).attr('rel') +']').modal();
}).hover(function() {
	$(this).stop().animate({'margin-right': -1*$(this).outerWidth() + 24}, 'fast');
}, function() {
	$(this).stop().animate({'margin-right': '0'}, 'fast');
});

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
