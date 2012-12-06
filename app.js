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
		this.page = 1;
		this.sura = 1;
		this.aya = '';
	},
	render: function() {
		this.$el.html('');

		page = _.filter(this.collection.models, function (item) {
			return item.get('page') === this.page;
		}, this);

		_.each(page, function (item) {
			var ayaView = new AyaView({model: item});
			this.$el.append(ayaView.render().el);
		}, this);

		this.sura = page[0].attributes['sura'];
		this.trigger('render');
	},
	nextPage: function () {
		this.page += 1;
		if (this.page > 604) this.page = 604;
		this.render();
	},
	prevPage: function () {
		this.page -= 1;
		if (this.page < 1) this.page = 1;
		this.render();
	}
});

var TafsirView = Backbone.View.extend({
	el: $("#tafsir"),
	initialize: function() {
		this.collection = new Tafsir(bayans);
		this.sections = sections;
		this.section = 20;
	},
	render: function() {
		this.firstSection = this.section;
		this.lastSection = this.section-1;

		this.$el.html('');
		this.appendLast();
		this.prependFirst();
	},
	events: {
		'scroll': 'checkScroll'
	},
	getSection: function(section) {
		return this.collection.get(this.sections[section]).get('content');
	},
	prependFirst: function() {
		if (this.firstSection > 0) {
			this.firstSection -= 1;
			fix_off = 10;

			topOff = this.el.scrollTop + fix_off;
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
		this.isLoading = false;
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
		this.$el.html(this.template(this.location));
	}
});

var AppView = Backbone.View.extend({
	el: $("body"),
	initialize: function() {
		this.address = new AddressView();
		
		this.quran = new QuranView();
		this.quran.on('render', this.updateAddress, this);
		// this.quran.render();

		this.tafsir = new TafsirView();
		this.tafsir.render();

	},
	events: {
		'keydown': 'navKey'
	},
	updateAddress: function() {
		this.address.location = {'mode': 'quran', 'page': this.quran.page, 'sura': suras[this.quran.sura-1], 'aya': this.quran.aya};
		this.address.render();
	},
	navKey: function(e) {
		if(e.keyCode == 37) // left arrow
			this.quran.nextPage();
		else if(e.keyCode == 39) // right arrow
			this.quran.prevPage();
	}
});

window.app = new AppView();

});
