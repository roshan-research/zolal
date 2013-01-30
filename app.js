var store = false;
var refineNums = false;
var server = '/';

var numchars = {'0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹'};
var refine = function(str) {
	if (!refineNums) return str;
	return String(str).replace(/[0-9]/g, function(c) { return numchars[c]; });
};

// models
var Aya = Backbone.Model.extend({
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
	template: _.template('<span class="aya" rel="<%= sura %>-<%= aya %>"><span class="text"><%= html %></span><span class="number">(<%= aya %>)</span></span>'),
	render: function () {
		data = this.model.toJSON();
		html = refine(data['html']);
		text = $('<p>'+ data['html'] +'</p>').text();
		parts = text.replace(/[ۖۗۚۛۙۘ]/g, '').split(' ');
		for (key in data['phrases']) {
			f = Number(key.split('-')[0]);
			b = html.indexOf(parts[f]);
			t = Number(key.split('-')[1])-1;
			e = html.indexOf(parts[t]);
			if (t > 0 && t in parts) e += parts[t].length;
			if (b >= 0 && e >= 0)
				html = [html.slice(0, b), '<span class="phrase" rel="'+ key +'">', html.slice(b, e), '</span> ', html.slice(e)].join('').trim();
			else {
				// phrase display error
				// console.log(data['id'] +'/'+ key);
			}
		}

		data['html'] = html;
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
		if (target.hasClass('phrase'))
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
			this.position.page = quran_ayas[this.position.sura+ '-'+ this.position.aya];

		this.loadPage(this.position.page);

		// update address
		if (this.position.aya == '')
			this.position.sura = Number(quran_pages[this.position.page][0].split('-')[0]);
		this.trigger('updateAddress');

		// prepare pages
		this.loadPage(this.position.page-1);
		this.loadPage(this.position.page+1);

		// show page
		el = this.$el.find('.page[rel='+ this.position.page +']');
		pages = this.$el.find('#pages');
		if (pages.find('.front').attr('rel') != this.position.page) {
			pages.find('.page').removeClass('front');
			el.addClass('front');
			this.$el.animate({ scrollLeft: el.offset().left - pages.position().left });
		}
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

				id = quran.position.sura +'-'+ quran.position.aya;
				aya = quran.collection.get(id);
				active.removeClass('active');
				quran.$el.find('.aya[rel='+ id +']').addClass('active');

				if (quran.position.phrase != '' && quran.position.phrase in aya.get('phrases')) {
					quran.$el.find('.aya[rel='+ id +'] .phrase[rel='+ quran.position.phrase +']').addClass('active');

					phr = aya.get('phrases')[quran.position.phrase];
					html = phr['html'];
					if ('head' in phr)
						html = phr['head'] + html;

					app.message(html, 'note', '#almizan/'+ phr['rel']);

					msg = $('#message #content');
					msg.find('em').each(function() {
						rel = $(this).attr('rel');
						if (rel) $(this).wrap('<a href="#quran/'+ rel +'">');
					});

					if (msg.children().length == 2)
						msg.children().first().addClass('header');

					// activate selected phrase
					msg.find('em[rel="'+ aya.get('id') +'/'+ quran.position.phrase +'"]').addClass('active');

				} else if (aya.get('trans'))
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
		newPage = $('<div class="page loading" rel="'+ page +'"></div>');
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
			el = quran.$el.find('.page[rel='+ page +']');
			el.removeClass('loading');
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
							item = $.parseJSON(item);
							if (item) {
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
			this.position.aya = Number(this.$el.find('.front .aya').first().attr('rel').split('-')[1]);
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
			this.position.aya = Number(this.$el.find('.front .aya').first().attr('rel').split('-')[1]);
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
		this.isLoading = false;
	},
	render: function() {
		sectionIndex = _.indexOf(this.sections, this.position.section);
		this.firstSection = sectionIndex;
		this.lastSection = sectionIndex;
		this.topStack = [];
		this.bottomStack = [];
		this.$el.empty();

		this.trigger('updateAddress');
		this.queueSection(this.lastSection, 'append');
	},
	events: {
		'scroll': 'checkScroll'
	},
	pushScroll: function() {
		this.topOff = this.$el.scrollTop();
		this.firstChild = this.$el.children().first().next().next();
		this.firstChildTop = this.firstChild.position().top;
	},
	popScroll: function() {
		extraHeight = this.firstChild.position().top - this.firstChildTop;
		if (extraHeight > 0)
			this.$el.scrollTop(this.topOff + extraHeight);
	},
	addElements: function(flag) {
		toLoad = 20;
		append = flag == 'append';
		this.isLoading = true;

		if (this.$el.hasClass('loading'))
			this.$el.removeClass('loading');

		if (!append) this.pushScroll();

		var elm;
		if (append) {
			for (i = 0; i < toLoad; i++) {
				if (elm = this.bottomStack.shift())
					this.$el.append(elm);
				else break;
			}
		} else {
			for (i = 0; i < toLoad; i++) {
				if (elm = this.topStack.pop())
					this.$el.prepend(elm);
				else break;
			}
		}

		this.$el.find('.loading').each(function() {
			if ($(this).next().length && $(this).prev().length)
				$(this).remove();
		});

		// queue new sections
		if (!elm) {
			if (append) {
				if (this.lastSection < this.sections.length-1) {
					this.lastSection += 1;
					this.queueSection(this.lastSection, flag);
				}
			} else {
				if (this.firstSection > 0) {
					this.firstSection -= 1;
					this.queueSection(this.firstSection, flag);
				}
			}
		}

		if (!append) this.popScroll();
		this.isLoading = false;
	},
	queueSection: function(section, flag) {
		var tafsir = this;

		// show loading element
		if (this.$el.children().length == 0)
			this.$el.addClass('loading');

		// queue section
		this.$el.queue(function() {
			tafsir.loadSection(section, flag);
			tafsir.$el.dequeue();
		});
	},
	loadSection: function(section, flag) {
		var tafsir = this;

		var loadBayan = function (bayan, flag) {
			// retrieve prev section id
			pid = _.indexOf(tafsir.sections, bayan.get('id'));
			if (pid > 0) pid = ' prev="'+ tafsir.sections[pid-1] +'"'; else pid = '';

			data = $('<code p="0" class="section"'+ pid +'>'+ bayan.get('id') +'</code>'+ bayan.get('content'));
			append = flag == 'append';
			empty = append && tafsir.$el.children().length == 0;

			if (empty) {
				part = tafsir.position.part ? Number(tafsir.position.part) : 0;
				data.each(function(i, item) {
					if (part <= Number($(item).attr('p')))
						tafsir.bottomStack.push(item);
					else
						tafsir.topStack.push(item);
				});
			} else {
				stack = append ? tafsir.bottomStack : tafsir.topStack;
				data.each(function(i, item) {
					stack.push(item);
				});
			}

			// add loading element
			loadingElm = $('<div class="loading"></div>');
			if (empty || append)
				tafsir.bottomStack.push(loadingElm.clone());
			if (empty || !append)
				tafsir.topStack.unshift(loadingElm.clone());

			// add elements
			tafsir.addElements(flag);
			if (empty)
				tafsir.addElements('prepend');

			if (refineNums)
				tafsir.$el.find(':not(code)').replaceText(/[0-9]/g, function(c) { return numchars[c]; });
		};
		
		tafsir.isLoading = true;
		bayan = new Bayan({id: this.sections[section]});
		bayan.fetch({
			success: function (bayan) {
				loadBayan(bayan, flag);
			},
			error: $.proxy(function (bayan) {
				$.ajax({
					context: {section: bayan.get('id'), flag: flag},
					url: server +'files/almizan/'+ bayan.get('id'),
					success: function(item){
						bayan = new Bayan({id: this.section, content: item});
						if (store) bayan.save();
						loadBayan(bayan, this.flag);
					},
					error: app.connectionError
				});
			}, {flag: flag})
		});
	},
	findSection: function(quran) {
		sura = quran.sura; aya = quran.aya;
		for (s in this.sections) {
			section = this.sections[s];
			parts = sectionToAddress(section);
			if (parts[0] == sura && (aya == 0 || (aya >= parts[1] && aya <= parts[2])))
				return section;
		}
		return 0;
	},
	checkScroll: function () {
		// focused section
		var focusCode = this.$el.find('code.section').first().next(); // code element is hidden
		this.$el.find('code.section').each(function() {
			if (focusCode.position().top < 0 && $(this).next().position().top > focusCode.position().top)
				focusCode = $(this).next();
		});

		triggerOff = 100;
		focus = '';

		if (focusCode.length) {
			if (focusCode.position().top - triggerOff <= 0)
				focus = focusCode.prev().text();
			else
				focus =focusCode.prev().attr('prev');
		}

		if (focus != '' && focus != this.position.section) {
			this.position.section = focus;
			this.position.part = '';
			this.trigger('updateAddress');
		}
		
		// scroll event
		if(!this.isLoading && this.el.scrollTop < triggerOff)
			this.addElements('prepend');

		if(!this.isLoading && this.el.scrollTop + this.el.clientHeight + triggerOff > this.el.scrollHeight)
			this.addElements('append');
	}
});

var AddressView = Backbone.View.extend({
	el: $("#address"),
	initialize: function() {
		var sura_select = this.$el.find('select#sura'), aya_select = sura_select.parent().find('select#aya');
		_.each(quran_suras, function(item, i) {
			sura_select.append('<option value="'+ (i+1) +'">'+ item +'</option>');
		});
		sura_select.change(function() {
			aya_select.html('<option value=""></option>');
			number = sura_ayas[sura_select.val()];
			for(i = 1; i <= number; i++)
				aya_select.append('<option value="'+ i +'">'+ refine(i) +'</option>');
			aya_select.val('1');
		});
		sura_select.change(function() {
			if (sura_select.val() != app.position.quran.sura)
				app.router.navigate('quran/'+ sura_select.val() +'-'+ aya_select.val(), true);
		});
		aya_select.change(function() {
			app.router.navigate('quran/'+ sura_select.val() +'-'+ aya_select.val(), true);
		});

		this.$el.find('#next').click(function() {
			app.quran.nextPage();
			app.render();
		});
		this.$el.find('#prev').click(function() {
			app.quran.prevPage();
			app.render();
		});
		this.$el.find('#text').change(function() {
			page = $(this).val();
			if (page >= 1 && page <= 604)
				app.router.navigate('quran/p'+ page, true);
		});
	},
	render: function() {
		// clone position
		position = $.extend(true, {}, this.position);
		if (position.mode == 'quran') {
			if (position.quran.aya != '') {
				slug = position.quran.sura +'-'+ position.quran.aya;
				if (position.quran.phrase)
					slug += '/'+ position.quran.phrase;
				app.router.navigate('quran/'+ slug, false);
			}
			else
				app.router.navigate('quran/p'+ position.quran.page, false);

			this.$el.find('.tafsir-address').hide();
			el = this.$el.find('.quran-address');
			el.show();
			
			el.find('#sura').val(position.quran.sura).change();
			el.find('#aya').val(position.quran.aya);
			el.find('#text').val(refine(position.quran.page));
		}
		else if (position.mode == 'tafsir') {
			slug = this.position.tafsir.section;
			if (position.tafsir.part)
				slug += '/'+ position.tafsir.part;
			app.router.navigate('almizan/'+ slug, false);
			parts = sectionToAddress(position.tafsir.section);
			position.tafsir = {'sura': quran_suras[parts[0]-1], 'mi': parts[1], 'ma': parts[2]};

			this.$el.find('.quran-address').hide();
			el = this.$el.find('.tafsir-address');
			el.show();
			el.find('#sura').text(position.tafsir['sura']);
			el.find('#mi').text(refine(position.tafsir['mi']));
			el.find('#ma').text(refine(position.tafsir['ma']));
		}

		this.$el.show();
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
		this.position = {mode: 'quran', quran: {page: 1, sura: 1, aya: ''}, tafsir: {section: '2-1:5'}};
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

		msg.html(refine(html));
		msg.addClass('alert-'+ mode);

		if (link) {
			msg.parent().attr('href', link);
			msg.parent().addClass('link');
		}
		else {
			msg.parent().removeAttr('href');
			msg.parent().removeClass('link');
		}

		$('#message').show();
	},
	connectionError: function() {
		this.$el.find('.loading').removeClass('loading');
		app.message('خطا در اتصال به شبکه.', 'error', '');
	},
	events: {
		'keydown': 'navKey',
		'click #navigator a': 'navigate'
	},
	navigate: function(e) {
		e.preventDefault();

		lastMode = this.position.mode;
		this.position.mode = $(e.target).attr('rel');
		if (lastMode == 'quran' && this.position.mode == 'tafsir') {
			this.position.tafsir.section = this.tafsir.findSection(this.position.quran);
			this.position.tafsir.part = '';
		}

		if (lastMode != this.position.mode)
			this.render();
	},
	navKey: function(e) {
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
		'quran/:sura-:aya': 'quranAya',
		'quran/:sura-:aya/:phrase': 'quranPhrase',
		'almizan/:section': 'almizanSection',
		'almizan/:section/:part': 'almizanPart'
	},
	quranPage: function(page) {
		if (isNaN(page) || page < 0 || page > 605)
			return;

		app.position.mode = 'quran';
		app.position.quran = {'page': Number(page), 'sura': '', 'aya': ''};
		app.render();
	},
	quranAya: function(sura, aya) {
		this.quranPhrase(sura, aya, '');
	},
	quranPhrase: function(sura, aya, phrase) {
		key = sura +'-'+ aya;
		if (!(key in quran_ayas))
			return;

		app.position.mode = 'quran';
		app.position.quran = {'page': '', 'sura': Number(sura), 'aya': Number(aya), 'phrase': phrase};
		app.render();
	},
	almizanSection: function(section) {
		this.almizanPart(section, '');
	},
	almizanPart: function(section, part) {
		if (_.indexOf(almizan_sections, section) < 0)
			return;

		app.position.mode = 'tafsir';
		app.position.tafsir = {'section': section, 'part': part};
		app.render();
	}
});

var sectionToAddress = function(section) {
	tmp = section.replace(':', '-');
	parts = tmp.split('-');
	if (parts.length == 2)
		parts.push(parts[1]);
	return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
};

// aya inverted index
var quran_ayas = {}, sura_ayas = {};
_.each(quran_pages, function(page, p) {
	for (aya in page) {
		quran_ayas[page[aya]] = Number(p);
		sura_ayas[Number(page[aya].split('-')[0])] = Number(page[aya].split('-')[1]);
	}
});

$(window).resize(function() {
	margins = $('#quran').outerHeight(true) - $('#quran').height();
	pageHeight = document.body.clientHeight - $('#footer').height() - margins;
	$('#quran, #tafsir').height(pageHeight);
});

var app;
$(document).ready(function() {
	$(window).resize();

	app = new AppView();
	app.router = new AddressRouter();
	Backbone.history.start();

	if (Backbone.history.getFragment() == '')
		app.render();
});
