$(document).ready(function() {

var Aye = Backbone.Model.extend({});

var Quran = Backbone.Collection.extend({
	model: Aye
});

var AyeView = Backbone.View.extend({
	template: '<span rel="<%= soure %>-<%= num %>"><%= text %> (<%= num %>) </span>',
	render: function () {
		var tmpl = _.template(this.template);
		this.setElement(tmpl(this.model.toJSON()));
		return this;
	}
});

var QuranView = Backbone.View.extend({
	el: $("#quran"),
	initialize: function() {
		this.collection = new Quran(ayes);
		this.page = 1;
		this.render();
	},
	render: function() {
		this.$el.html('');

		page = _.filter(this.collection.models, function (item) {
			return item.get('page') === this.page;
		}, this);

		_.each(page, function (item) {
			var ayeView = new AyeView({model: item});
			this.$el.append(ayeView.render().el);
		}, this);
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

var AppView = Backbone.View.extend({
	el: $("body"),
	initialize: function() {
		this.quran = new QuranView();
	},
	events: {
		'keydown': 'navKey'
	},
	nextClick: function(e) {
		e.preventDefault();
		this.quran.nextPage();
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
