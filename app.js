$(document).ready(function() {

var Aya = Backbone.Model.extend({});

var Quran = Backbone.Collection.extend({
	model: Aya
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
		this.quran.render()
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

var app = new AppView();

});
