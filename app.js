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
	template: _.template('<span rel="<%= sura %>-<%= aya %>"><%= text %> (<%= aya %>) </span>'),
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
			this.$el.append(ayaView.render().el);
		}, this);

		this.position.sura = page[0].attributes['sura'];
	},
	nextPage: function () {
		this.position.page += 1;
		if (this.position.page > 604)
			this.position.page = 604;
	},
	prevPage: function () {
		this.position.page -= 1;
		if (this.position.page < 1)
			this.position.page = 1;
	}
});

var TafsirView = Backbone.View.extend({
	el: $("#tafsir"),
	initialize: function() {
		this.collection = new Tafsir(bayans);
		this.sections = sections;
		this.isLoading = false;
	},
	render: function() {
		this.firstSection = this.position.section;
		this.lastSection = this.position.section-1;

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
			l = this.sections[s].split('-');
			m = l[1].split(':');
			if (l[0] == sura && (aya == 0 || (aya >= m[0] && aya <= m[1])))
				return s;
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
		if (position.mode == 'quran')
			position.quran.sura = suras[position.quran.sura-1];
		
		this.$el.html(this.template(position));
	}
});

var AppView = Backbone.View.extend({
	el: $("body"),
	initialize: function() {
		this.address = new AddressView();
		this.quran = new QuranView();
		this.tafsir = new TafsirView();

		// set heights
		margins = this.tafsir.$el.outerHeight(true) - this.tafsir.$el.outerHeight();
		pageHeight = $('#wrap').height() - $('#footer').height() - margins;
		this.quran.$el.height(pageHeight);
		this.tafsir.$el.height(pageHeight);

		// set position
		this.position = {'mode': 'quran', 'quran': {'page': 1, 'sura': 1, 'aya': 0}, 'tafsir': {'section': 0}};
		this.address.position = this.position;
		this.quran.position = this.position.quran;
		this.tafsir.position = this.position.tafsir;

		this.render();
	},
	render: function() {
		if (this.position.mode == 'quran') {
			this.quran.$el.show();
			this.tafsir.$el.hide();
			this.quran.render();
		} else {
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
		if (this.position.mode == 'quran') {
			if(e.keyCode == 37) // left arrow
				this.quran.nextPage();
			else if(e.keyCode == 39) // right arrow
				this.quran.prevPage();
			this.render();
		}
	}
});

window.app = new AppView();

});
