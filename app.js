$(document).ready(function() {

var Aye = Backbone.Model.extend({});

var Quran = Backbone.Collection.extend({
	model: Aye
});

var AyeView = Backbone.View.extend({
	template: '<span rel="<%= soure %>-<%= num %>"><%= text %></span>',
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
		this.render();
	},
	render: function() {
		page = _.filter(this.collection.models, function (item) {
			return item.get('page') === 3;
		});

		_.each(page, function (item) {
			var ayeView = new AyeView({model: item});
			this.$el.append(ayeView.render().el);
		}, this);
	},
});

var quran = new QuranView();

});
