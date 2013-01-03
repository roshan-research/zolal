var store = true;

// models
var Aya = Backbone.Model.extend({
	localStorage: new Backbone.LocalStorage('Quran')
});

var Page = Backbone.Collection.extend({
	model: Aya
});

var Bayan = Backbone.Model.extend({
	localStorage: new Backbone.LocalStorage('Almizan')
});

// views
var AyaView = Backbone.View.extend({
	template: _.template('<span class="aya" rel="<%= sura %>-<%= aya %>"><%= html %></span>'),
	render: function () {
		this.setElement(this.template(this.model.toJSON()));
		return this;
	},
	events: {
		'click': 'click'
	},
	click: function(e) {
		// update quran address
		app.quran.position.aya = this.model.get('aya');
		app.quran.position.sura = this.model.get('sura');
		app.quran.render();
	}
});

var QuranView = Backbone.View.extend({
	el: $("#quran"),
	initialize: function() {
		this.collection = new Page();
		this.renderedPage = -1;
	},
	render: function() {
		if (this.position.aya != '')
			this.position.page = quran_ayas[this.position.sura+ '-'+ this.position.aya];
		this.queuePage(this.position.page);
	},
	loadPage: function(page) {
		var quran = this;

		var updateSelectedAya = function() {
			if (quran.position.aya != '') {
				aya = quran.collection.get(quran.position.sura +'-'+ quran.position.aya);
				quran.$el.find('.active').removeClass('active');
				quran.$el.find('.aya[rel='+ aya.get('id') +']').addClass('active');
				if (aya.get('trans'))
					app.message(aya.get('trans'), 'block');
			}

			quran.trigger('updateAddress');
		};

		if (this.position.page == this.renderedPage) {
			updateSelectedAya();
			return;
		}

		var renderPage = function() {
			el = quran.$el;
			el.html('');
			_.each(quran.collection.models, function (item) {
				var ayaView = new AyaView({model: item});
				if (item.get('aya') == 1) {
					el.append('<div class="sura"><span>'+ quran_suras[item.get('sura')-1] +'</span></div>');
					if (item.get('sura') != 1 && item.get('sura') != 9)
						el.append('<div class="bism"><span>بِسمِ اللَّهِ الرَّحمٰنِ الرَّحيمِ</span></div>');
				}
				el.append(ayaView.render().el, ' ');
			});
			quran.renderedPage = quran.position.page;
			if (quran.position.aya == '')
				quran.position.sura = quran.collection.models[0].attributes['sura'];
			updateSelectedAya();
		};

		ayas = quran_pages[page];
		(new Aya({id: ayas[0]})).fetch({
			success: function() {
				quran.collection.reset();
				for (a in ayas) {
					aya = new Aya({id: ayas[a]});
					aya.fetch();
					quran.collection.add(aya);
				}
				renderPage();
			},
			error: function() {
				$.get('files/quran/p'+ quran.position.page, function(data) {
					quran.collection.reset();
					_.each(data.split('\n'), function(item) {
						item = $.parseJSON(item);
						if (item) {
							aya = new Aya(item);
							if (store) aya.save();
							quran.collection.add(aya);
						}
					});
					renderPage();
				}).error(app.connectionError);
			}
		});
	},
	queuePage: function(page) {
		var quran = this;
		this.$el.queue(function() {
			quran.loadPage(page);
			quran.$el.dequeue();
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
		if (this.position.aya == '')
			this.position.aya = this.collection.models[0].attributes['aya'];
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
		if (this.position.aya == '')
			this.position.aya = this.collection.models[0].attributes['aya'];
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

		this.$el.empty();
		this.elements = {};
		this.$el.scrollTop(0);

		this.trigger('updateAddress');
		this.queueSection(this.lastSection, 'append');
	},
	events: {
		'scroll': 'checkScroll'
	},
	addElements: function(currentId, flag) {
		currentId = Number(currentId);
		toLoad = 20;
		append = flag == 'append';

		if (append)
			lastId = currentId + toLoad;
		else
			lastId = currentId - toLoad;

		if (!(lastId in this.elements)) {
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

		if (!append) {
			topOff = this.$el.scrollTop();
			firstChild = this.$el.children().first().next();
			if (firstChild.length)
				firstChildTop = firstChild.position().top;
		}

		if (append) {
			for (i = currentId; i < lastId; i++)
				if (i in this.elements)
					this.$el.append(this.elements[String(i)]);
		} else {
			if (currentId == 0) currentId = -1;
			for (i = currentId; i > lastId; i--)
				if (i in this.elements)
					this.$el.prepend(this.elements[String(i)]);
		}
				
		// todo: delete rendered this.elements[i];

		if (!append && firstChild.length) {
			extraHeight = firstChild.position().top - firstChildTop;
			if (extraHeight > 0)
				this.$el.scrollTop(topOff + extraHeight);
		}
	},
	queueSection: function(section, flag) {
		var tafsir = this;
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

			data = $('<code class="section"'+ pid +'>'+ bayan.get('id') +'</code>'+ bayan.get('content'));
			append = flag == 'append';

			lastKey = 0;
			order = append ? 1 : -1;

			for (key in tafsir.elements)
				if ((append && (Number(key) > lastKey)) || (!append && (Number(key) < lastKey)))
					lastKey = Number(key);

			startKey = append ? lastKey : lastKey - data.length;

			data.each(function(i, item) {
				item = $(item).attr('i', startKey+i);
				tafsir.elements[String(startKey+i)] = item;
			});

			tafsir.addElements(lastKey, flag);
			if (append && lastKey == 0 && tafsir.firstSection > 0)
				tafsir.addElements(-1, 'prepend');

			tafsir.isLoading = false;
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
					url: 'files/almizan/'+ bayan.get('id'),
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

		triggerOff = 300;
		focus = '';

		if (focusCode.length) {
			if (focusCode.position().top - triggerOff <= 0)
				focus = focusCode.prev().text();
			else
				focus =focusCode.prev().attr('prev');
		}

		if (focus != '' && focus != this.position.section) {
			this.position.section = focus;
			this.trigger('updateAddress');
		}
		
		// scroll event
		if(!this.isLoading && this.el.scrollTop < triggerOff)
			this.addElements(this.$el.children().first().attr('i'), 'prepend');

		if(!this.isLoading && this.el.scrollTop + this.el.clientHeight + triggerOff > this.el.scrollHeight)
			this.addElements(this.$el.children().last().attr('i'), 'append');
	}
});

var AddressView = Backbone.View.extend({
	el: $("#address"),
	initialize: function() {
		var sura_select = this.$el.find('select#sura'), aya_select = sura_select.parent().find('select#aya');
		_.each(quran_suras, function(item, i) {
			sura_select.append('<option value="'+ (i+1) +'">&nbsp'+ item +'</option>');
		});
		sura_select.change(function() {
			aya_select.html('<option value=""></option>');
			number = sura_ayas[sura_select.val()];
			for(i = 1; i <= number; i++)
				aya_select.append('<option value="'+ i +'">'+ i +'</option>');
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
	},
	render: function() {
		// clone position
		position = $.extend(true, {}, this.position);
		if (position.mode == 'quran') {
			if (position.quran.aya != '')
				app.router.navigate('quran/'+ position.quran.sura +'-'+ position.quran.aya, false);
			else
				app.router.navigate('quran/p'+ position.quran.page, false);

			this.$el.find('.tafsir-address').hide();
			el = this.$el.find('.quran-address');
			el.show();
			
			el.find('#sura').val(position.quran.sura).change();
			el.find('#aya').val(position.quran.aya);
			el.find('#text').text(position.quran.page);
		}
		else if (position.mode == 'tafsir') {
			app.router.navigate('almizan/'+ this.position.tafsir.section, false);
			parts = sectionToAddress(position.tafsir.section);
			position.tafsir = {'sura': quran_suras[parts[0]-1], 'mi': parts[1], 'ma': parts[2]};

			this.$el.find('.quran-address').hide();
			el = this.$el.find('.tafsir-address');
			el.show();
			el.find('#sura').text(position.tafsir['sura']);
			el.find('#mi').text(position.tafsir['mi']);
			el.find('#ma').text(position.tafsir['ma']);
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

		// set position
		this.position = {mode: 'quran', quran: {page: 1, sura: 1, aya: ''}, tafsir: {section: '2-1:5'}};
	},
	render: function() {
		$('#message').hide();
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
	message: function(text, mode) {
		msg = $('#message');
		msg.removeClass('alert-block alert-error alert-success alert-info');

		msg.text(text);
		msg.addClass('alert-'+ mode);
		msg.show().dotdotdot().css('margin-top', -(msg.height() + 40));
	},
	connectionError: function() {
		app.message('خطا در اتصال به شبکه.', 'error');
	},
	events: {
		'keydown': 'navKey',
		'click #navigator a': 'navigate'
	},
	navigate: function(e) {
		e.preventDefault();

		lastMode = this.position.mode;
		this.position.mode = $(e.target).attr('rel');
		if (lastMode == 'quran' && this.position.mode == 'tafsir')
			this.position.tafsir.section = this.tafsir.findSection(this.position.quran);

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
		'almizan/:section': 'almizanSection'
	},
	quranPage: function (page) {
		if (isNaN(page) || page < 0 || page > 605)
			return;

		app.position.mode = 'quran';
		app.position.quran = {'page': Number(page), 'sura': '', 'aya': ''};
		app.render();
	},
	quranAya: function (sura, aya) {
		key = sura +'-'+ aya;
		if (!(key in quran_ayas))
			return;

		app.position.mode = 'quran';
		app.position.quran = {'page': '', 'sura': Number(sura), 'aya': Number(aya)};
		app.render();
	},
	almizanSection: function (section) {
		if (_.indexOf(almizan_sections, section) < 0)
			return;

		app.position.mode = 'tafsir';
		app.position.tafsir.section = section;
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
