$(document).ready(function() {

var Aya = Backbone.Model.extend({});

var Bayan = Backbone.Model.extend({});

var Quran = Backbone.Collection.extend({
	model: Aya
});

var Tafsir = Backbone.Collection.extend({
	model: Bayan
});

var AyaView = Backbone.View.extend({
	template: _.template('<span rel="<%= sura %>-<%= aya %>"><%= html %></span>'),
	render: function () {
		this.setElement(this.template(this.model.toJSON()));
		return this;
	}
});

var QuranView = Backbone.View.extend({
	el: $("#quran"),
	initialize: function() {
		this.collection = new Quran(ayas);
	},
	render: function() {
		this.$el.html('');

		page = _.filter(this.collection.models, function (item) {
			return item.get('page') === this.position.page;
		}, this);

		_.each(page, function (item) {
			var ayaView = new AyaView({model: item});
			if (item.get('aya') == 1) {
				this.$el.append('<div class="sura"><span>'+ suras[item.get('sura')-1] +'</span></div>');
				if (item.get('sura') != 1 && item.get('sura') != 9)
					this.$el.append('<div class="bism"><span>بِسمِ اللَّهِ الرَّحمٰنِ الرَّحيمِ</span></div>');
			}
			this.$el.append(ayaView.render().el, ' ');
		}, this);

		this.position.sura = page[0].attributes['sura'];
	},
	nextPage: function () {
		this.position.page += 1;
		if (this.position.page > 604) {
			this.position.page = 604;
			return false;
		}
		return true;
	},
	prevPage: function () {
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
		this.collection = new Tafsir(bayans);
		this.sections = sections;
		this.isLoading = false;
	},
	render: function() {
		sectionIndex = _.indexOf(this.sections, this.position.section);
		this.firstSection = sectionIndex;
		this.lastSection = sectionIndex-1;

		this.$el.empty();
		this.$el.scrollTop(0);
		this.appendLast();
		this.prependFirst();
	},
	events: {
		'scroll': 'checkScroll'
	},
	getSection: function(section) {
		return this.collection.get(this.sections[section]).get('content');
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
	prependFirst: function() {
		if (this.firstSection > 0) {
			this.firstSection -= 1;
			fixOff = 10;

			topOff = this.$el.scrollTop() + fixOff;
			section = $(this.getSection(this.firstSection));
			this.$el.prepend(section);
			this.$el.scrollTop(topOff + section.height());
		}
	},
	appendLast: function() {
		if (this.lastSection < this.sections.length-1) {
			this.lastSection += 1;
			this.$el.append(this.getSection(this.lastSection));
		}
	},
	checkScroll: function () {
		triggerOff = 300;

		// this.position.section
		var focus = ''; var focusTop = -100000; var elHeight = this.$el.height() * 0.9;
		this.$el.find('div').each(function(i, item) {
			off = $(item).offset().top;
			if (off > focusTop && off < elHeight) {
				focusTop = off;
				focus = $(item).attr('rel');
			}
		});
		if (focus !== '' && focus != this.position.section) {
			this.position.section = focus;
			this.trigger('updateAddress');
		}

		if(!this.isLoading && this.el.scrollTop < triggerOff)
			this.prependFirst();

		if(!this.isLoading && this.el.scrollTop + this.el.clientHeight + triggerOff > this.el.scrollHeight)
			this.appendLast();
	}
});

var AddressView = Backbone.View.extend({
	el: $("#address"),
	template: _.template($("#addressTemplate").html()),
	render: function() {
		// clone position
		position = $.extend(true, {}, this.position);
		if (position.mode == 'quran') {
			app.router.navigate('quran/p'+ this.position.quran.page, false);
			position.quran.sura = suras[position.quran.sura-1];
		}
		else if (position.mode == 'tafsir') {
			app.router.navigate('almizan/'+ this.position.tafsir.section, false)
			parts = sectionToAddress(position.tafsir.section);
			position.tafsir = {'sura': suras[parts[0]-1], 'mi': parts[1], 'ma': parts[2]}
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
		this.tafsir.on('updateAddress', this.address.render, this.address);


		// set heights
		margins = this.tafsir.$el.outerHeight(true) - this.tafsir.$el.outerHeight();
		pageHeight = $('#wrap').height() - $('#footer').height() - margins;
		this.quran.$el.height(pageHeight);
		this.tafsir.$el.height(pageHeight);

		// set position
		this.position = {'mode': 'quran', 'quran': {'page': 1, 'sura': 1, 'aya': 0}, 'tafsir': {'section': '2-1:5'}};
		this.address.position = this.position;
		this.quran.position = this.position.quran;
		this.tafsir.position = this.position.tafsir;
	},
	render: function() {
		if (this.position.mode == 'quran') {
			this.quran.$el.show();
			this.tafsir.$el.hide();
			this.quran.render();
		} else if (this.position.mode == 'tafsir') {
			this.quran.$el.hide();
			this.tafsir.$el.show();
			this.tafsir.render();
		}
		this.address.render();
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
		'almizan/:section': 'almizanSection'
	},
	quranPage: function (page) {
		app.position.mode = 'quran';
		app.position.quran.page = Number(page);
		app.render();
	},
	almizanSection: function (section) {
		app.position.mode = 'tafsir';
		app.position.tafsir.section = section;
		app.render();
	}
});

var app = new AppView();

// setup router
app.router = new AddressRouter();
Backbone.history.start();

app.render();

});
