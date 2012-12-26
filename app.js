// aya inverted index
var quran_ayas = {};
_.each(quran_pages, function(page, p) {
	for (aya in page)
		quran_ayas[page[aya]] = Number(p);
});

var app;

$(document).ready(function() {

var Aya = Backbone.Model.extend({
	localStorage: new Backbone.LocalStorage('Quran')
});

var Page = Backbone.Collection.extend({
	model: Aya
});

var Bayan = Backbone.Model.extend({
	localStorage: new Backbone.LocalStorage('Almizan')
});

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
		this.renderedPage = -1;
	},
	render: function() {
		var quran = this;

		var updateSelectedAya = function() {
			if (quran.position.aya !== '') {
				id = quran.position.sura +'-'+ quran.position.aya;
				aya = new Aya({id: id});
				aya.fetch({success: function (aya) {
					quran.$el.find('.active').removeClass('active');
					quran.$el.find('.aya[rel='+ aya.get('id') +']').addClass('active');
					if (aya.get('trans'))
						app.message(aya.get('trans'), 'block');
				}});
			}

			quran.trigger('updateAddress');
		};

		if (this.position.page == this.renderedPage) {
			updateSelectedAya();
			return;
		}

		var loadPage = function (page) {
			el = quran.$el;
			el.html('');
			_.each(page.models, function (item) {
				var ayaView = new AyaView({model: item});
				if (item.get('aya') == 1) {
					el.append('<div class="sura"><span>'+ quran_suras[item.get('sura')-1] +'</span></div>');
					if (item.get('sura') != 1 && item.get('sura') != 9)
						el.append('<div class="bism"><span>بِسمِ اللَّهِ الرَّحمٰنِ الرَّحيمِ</span></div>');
				}
				el.append(ayaView.render().el, ' ');
			});
			quran.renderedPage = quran.position.page;
			quran.position.sura = page.models[0].attributes['sura'];
			updateSelectedAya();
		};

		ayas = quran_pages[quran.position.page];
		page = new Page();
		(new Aya({id: ayas[0]})).fetch({
			success: function() {
				for (a in ayas) {
					aya = new Aya({id: ayas[a]});
					aya.fetch();
					page.add(aya);
				}
				loadPage(page);
			},
			error: function() {
				$.get('files/quran/p'+ quran.position.page, function(data) {
					_.each(data.split('\n'), function(item) {
						item = $.parseJSON(item);
						if (item) {
							aya = new Aya(item);
							aya.save();
							page.add(aya);
						}
					});
					loadPage(page);
				}).error(connectionError);
			}
		});
	},
	nextPage: function () {
		this.position.aya = '';
		this.position.page += 1;
		if (this.position.page > 604) {
			this.position.page = 604;
			return false;
		}
		return true;
	},
	prevPage: function () {
		this.position.aya = '';
		this.position.page -= 1;
		if (this.position.page < 1) {
			this.position.page = 1;
			return false;
		}
		return true;
	}
});

var sectionToAddress = function(section) {
	tmp = section.replace(':', '-');
	parts = tmp.split('-');
	if (parts.length == 2)
		parts.push(parts[1]);
	return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
};

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
		this.loadSection(this.lastSection, 'append');
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
					this.loadSection(this.lastSection, flag);
				}
			} else {
				if (this.firstSection > 0) {
					this.firstSection -= 1;
					this.loadSection(this.firstSection, flag);
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
						bayan.save();
						loadBayan(bayan, this.flag);
					},
					error: connectionError
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

		if (focus !== '' && focus !== this.position.section) {
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
	template: _.template($("#addressTemplate").html()),
	render: function() {
		// clone position
		position = $.extend(true, {}, this.position);
		if (position.mode == 'quran') {
			if (position.quran.aya !== '')
				app.router.navigate('quran/'+ position.quran.sura +'-'+ position.quran.aya, false);
			else
				app.router.navigate('quran/p'+ position.quran.page, false);
			position.quran.sura = quran_suras[position.quran.sura-1];
		}
		else if (position.mode == 'tafsir') {
			app.router.navigate('almizan/'+ this.position.tafsir.section, false);
			parts = sectionToAddress(position.tafsir.section);
			position.tafsir = {'sura': quran_suras[parts[0]-1], 'mi': parts[1], 'ma': parts[2]};
		}
		
		this.$el.html(this.template(position));
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
			else if(e.keyCode == 39) // right arrow
				refresh = this.quran.prevPage();
		}

		if (refresh)
			this.render();
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
		app.position.quran = {'page': quran_ayas[key], 'sura': sura, 'aya': aya};
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

app = new AppView();

// setup router
app.router = new AddressRouter();
Backbone.history.start();

if (Backbone.history.getFragment() === '')
	app.render();

});

var connectionError = function() {
	app.message('خطا در اتصال به شبکه.', 'error');
};

// set heights
$(window).load(function() {
	margins = app.quran.$el.outerHeight(true) - app.quran.$el.height();
	pageHeight = $('#wrap').height() - $('#footer').height() - margins;
	app.quran.$el.height(pageHeight);
	app.tafsir.$el.height(pageHeight);
});
