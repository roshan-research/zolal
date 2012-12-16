var app;
var suras = ['الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'يونس', 'هود', 'يوسف', 'الرعد', 'ابراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه', 'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم', 'لقمان', 'السجدة', 'الأحزاب', 'سبإ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر', 'فصلت', 'الشوري', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق', 'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة', 'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج', 'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الانسان', 'المرسلات', 'النبإ', 'النازعات', 'عبس', 'التكوير', 'الإنفطار', 'المطففين', 'الإنشقاق', 'البروج', 'الطارق', 'الأعلي', 'الغاشية', 'الفجر', 'البلد', 'الشمس', 'الليل', 'الضحي', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات', 'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس'];
var almizan_sections = ['1-1:5', '1-6:7', '2-1:5', '2-6:7', '2-8:20', '2-21:25', '2-26:27', '2-28:29', '2-30:33', '2-34:34', '2-35:39', '2-40:44', '2-45:46', '2-47:48', '2-49:61', '2-62:62', '2-63:74', '2-75:82', '2-83:88', '2-89:93', '2-94:99', '2-100:100', '2-102:103', '2-104:105', '2-106:107', '2-108:115', '2-116:117', '2-118:119', '2-120:123', '2-124:124', '2-125:129', '2-130:134', '2-135:141', '2-142:151', '2-152:152', '2-153:157', '2-158:158', '2-159:162', '2-163:167', '2-168:171', '2-172:176', '2-177:177', '2-178:179', '2-180:182', '2-183:185', '2-186:186', '2-188:188', '2-190:195', '2-196:203', '2-204:207', '2-208:210', '2-211:212', '2-215:215', '2-216:218', '2-219:220', '2-221:221', '2-222:223', '2-224:227', '2-228:242', '2-243:243', '2-253:254', '2-255:255', '2-256:257', '2-258:260', '2-261:274', '2-275:281', '2-282:283', '2-284:284', '2-285:286', '3-1:6', '3-7:9', '3-10:18', '3-19:25', '3-26:27', '3-28:32', '3-33:34', '3-35:41', '3-42:60', '3-61:63', '3-79:80', '3-81:85', '3-86:91', '3-92:95', '3-96:97', '3-98:101', '3-102:110', '3-111:120', '3-121:129', '3-130:138', '3-139:148', '3-149:155', '3-156:164', '3-165:171', '3-172:175', '3-176:180', '3-181:189', '3-190:199', '4-2:6', '4-7:10', '4-11:14', '4-15:16', '4-17:18', '4-19:22', '4-23:28', '4-29:30', '4-32:35', '4-36:42', '4-44:58', '4-59:70', '4-71:76', '4-77:80', '4-81:84', '4-85:91', '4-92:94', '4-95:100', '4-101:104', '4-105:126', '4-127:134', '4-136:147', '4-148:148', '4-150:152', '4-170:175', '5-1:2', '5-4:5', '5-6:7', '5-8:14', '5-15:19', '5-20:26', '5-27:32', '5-33:40', '5-41:50', '5-51:54', '5-55:56', '5-57:66', '5-68:86', '5-87:89', '5-90:93', '5-94:99', '5-101:102', '5-103:104', '5-106:109', '5-110:111', '5-112:115', '5-116:120', '6-1:3', '6-4:11', '6-12:18', '6-19:20', '6-21:32', '6-33:36', '6-37:55', '6-56:73', '6-74:83', '6-84:90', '6-91:105', '6-106:113', '6-114:121', '6-122:127', '6-128:135', '6-136:150', '6-151:157', '6-158:160', '6-161:165', '7-1:9', '7-10:25', '7-26:36', '7-37:53', '7-54:58', '7-59:64', '7-65:72', '7-73:79', '7-80:84', '7-85:93', '7-94:102', '7-103:126', '7-127:137', '7-138:154', '7-155:160', '7-161:171', '7-172:174', '7-175:179', '7-180:186', '7-187:188', '7-189:198', '7-199:206', '8-1:6', '8-7:14', '8-15:29', '8-30:40', '8-55:66', '8-67:71', '8-72:75', '9-1:16', '9-17:24', '9-25:28', '9-29:35', '9-36:37', '9-38:48', '9-49:63', '9-64:74', '9-75:80', '9-81:96', '9-97:106', '9-107:110', '9-111:123', '9-124:129', '10-1:10', '10-11:14', '10-15:25', '10-26:30', '10-31:36', '10-37:45', '10-46:56', '10-57:70', '10-71:74', '10-75:93', '10-94:103', '10-104:109', '11-1:4', '11-5:16', '11-17:24', '11-25:35', '11-36:49', '11-50:60', '11-61:68', '11-69:76', '11-77:83', '11-84:95', '11-96:99', '11-100:108', '11-109:119', '11-120:123', '12-1:3', '12-4:6', '12-7:21', '12-22:34', '12-35:42', '12-43:57', '12-58:62', '12-63:82', '12-83:92', '12-93:102', '12-103:111', '13-1:4', '13-5:6', '13-7:16', '13-17:26', '13-27:35', '13-36:42', '14-1:5', '14-6:18', '14-19:34', '14-35:41', '14-42:52', '15-1:9', '15-10:15', '15-16:25', '15-26:48', '15-49:84', '15-85:99', '16-1:21', '16-22:40', '16-41:64', '16-65:77', '16-78:89', '16-90:105', '16-106:111', '16-112:128', '17-2:8', '17-9:22', '17-23:39', '17-40:55', '17-56:65', '17-66:72', '17-73:81', '17-82:100', '17-101:111', '18-1:8', '18-9:26', '18-27:31', '18-47:59', '18-60:82', '18-83:102', '18-103:108', '19-51:57', '19-58:63', '19-64:65', '19-66:72', '19-73:80', '19-81:96', '20-1:8', '20-9:47', '20-80:98', '20-99:114', '20-115:126', '20-127:135', '21-1:15', '21-16:33', '21-34:47', '21-78:91', '21-92:112', '22-1:2', '22-17:24', '22-25:37', '22-67:78', '23-1:11', '23-12:22', '23-23:54', '23-55:77', '23-78:98', '23-99:118', '24-1:10', '24-11:26', '24-27:34', '24-35:46', '24-47:57', '24-58:64', '25-1:3', '25-4:20', '25-21:31', '25-32:40', '25-41:62', '25-63:77', '26-1:1', '26-10:68', '26-69:104', '26-105:122', '26-123:140', '26-141:159', '26-160:175', '26-176:191', '26-192:227', '27-7:14', '27-15:44', '27-45:53', '27-54:58', '27-59:81', '27-82:93', '28-1:1', '28-15:21', '28-22:28', '28-29:42', '28-43:56', '28-57:75', '28-76:84', '28-85:88', '29-1:13', '29-14:40', '29-41:55', '29-56:60', '29-61:69', '30-1:19', '30-20:26', '30-27:39', '30-40:47', '30-48:53', '30-54:60', '31-1:1', '31-12:19', '31-20:34', '32-1:14', '33-1:8', '33-28:35', '33-36:40', '33-41:48', '33-49:62', '33-63:73', '34-1:9', '34-10:21', '34-22:30', '34-31:54', '35-2:8', '35-9:14', '35-15:26', '35-27:38', '35-39:45', '36-1:12', '36-13:32', '36-33:47', '36-48:65', '36-66:80', '37-12:70', '37-71:113', '37-114:132', '37-133:148', '37-149:182', '38-1:16', '38-17:29', '38-30:40', '38-41:48', '38-49:64', '38-65:88', '39-1:10', '39-11:20', '39-21:37', '39-38:52', '39-53:61', '39-62:75', '40-1:6', '40-7:12', '40-13:20', '40-21:54', '40-55:60', '40-61:68', '40-69:78', '40-79:85', '41-1:12', '41-13:25', '41-26:39', '41-40:54', '42-7:12', '42-13:16', '42-17:26', '42-27:50', '42-51:53', '43-1:14', '43-15:25', '43-26:45', '43-46:56', '43-57:65', '43-66:78', '43-79:89', '44-1:8', '44-9:33', '44-34:59', '45-1:13', '45-14:19', '46-1:14', '46-15:20', '46-21:28', '46-29:35', '47-1:6', '47-7:15', '47-16:32', '47-33:38', '48-1:7', '48-8:10', '48-11:17', '48-18:28', '49-11:18', '50-1:14', '50-39:45', '51-1:19', '51-20:51', '51-52:60', '52-1:10', '52-29:44', '52-45:49', '53-1:18', '53-19:32', '53-33:62', '54-1:8', '54-9:42', '54-43:55', '55-1:30', '55-31:78', '56-1:10', '56-11:56', '56-57:96', '57-1:6', '57-7:15', '57-16:24', '57-25:29', '58-7:13', '58-14:22', '59-1:10', '59-11:17', '59-18:24', '60-1:9', '60-10:13', '61-1:9', '61-10:14', '62-1:8', '62-9:11', '63-1:8', '63-9:11', '64-1:10', '64-11:18', '65-1:7', '65-8:12', '66-1:9', '66-10:12', '67-1:14', '67-15:22', '67-23:30', '69-13:37', '69-38:52', '70-1:17', '70-19:35', '70-36:44', '71-1:24', '71-25:28', '72-1:17', '72-18:28', '73-1:19', '74-8:31', '74-32:48', '74-49:56', '75-1:15', '75-16:40', '76-1:22', '76-23:31', '78-1:16', '78-17:40', '79-1:41', '79-42:46', '80-1:16', '80-17:42', '81-1:14', '81-15:29', '82-1:19', '83-1:21', '83-22:36', '84-1:25', '85-1:22', '86-1:17', '87-1:19', '88-1:25', '100-2:11', '101-1:11', '104-1:9', '105-1:5'];

$(document).ready(function() {

var zolaldb = {
	id: 'zolaldb',
	migrations: [{
		version: '1.0',
		migrate: function(transaction, next) {
			var ayas = transaction.db.createObjectStore('ayas');
			ayas.createIndex('pageIndex', 'page', {unique: false});
			var bayans = transaction.db.createObjectStore('bayans');
			next();
		}
	}]
};

var Aya = Backbone.Model.extend({
	database: zolaldb,
	storeName: 'ayas'
});

var Bayan = Backbone.Model.extend({
	database: zolaldb,
	storeName: 'bayans'
});

var Quran = Backbone.Collection.extend({
	database: zolaldb,
	storeName: 'ayas',
	model: Aya
});

var Tafsir = Backbone.Collection.extend({
	database: zolaldb,
	storeName: 'bayans',
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
		this.collection = new Quran();
	},
	render: function() {
		var el = this.$el;
		var quran = this;

		this.collection.fetch({
			conditions: {'page': quran.position.page},
			success: function(page) {
				if (page.length == 0) {
					$.get('files/quran/p'+ quran.position.page, function(data) {
						_.each(data.split('\n'), function(item) {
							aya = new Aya($.parseJSON(item));
							aya.save();
						});
						quran.render();
					});
				} else {
					el.html('');
					_.each(page.models, function (item) {
						var ayaView = new AyaView({model: item});
						if (item.get('aya') == 1) {
							el.append('<div class="sura"><span>'+ suras[item.get('sura')-1] +'</span></div>');
							if (item.get('sura') != 1 && item.get('sura') != 9)
								el.append('<div class="bism"><span>بِسمِ اللَّهِ الرَّحمٰنِ الرَّحيمِ</span></div>');
						}
						el.append(ayaView.render().el, ' ');
					});
					quran.position.sura = page.models[0].attributes['sura'];
				}
			}
		});
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
		this.collection = new Tafsir();
		this.sections = almizan_sections;
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
	addSection: function(section, flag) {
		section_id = this.sections[section];
		var bayan = new Bayan({id: section_id});
		var el = this.$el;
		var tafsir = this;

		bayan.fetch({
			success: function () {
				if (flag == 'append') {
					el.append(bayan.get('content'));
				} else if (flag == 'prepend') {
					fixOff = 10;
					topOff = el.scrollTop() + fixOff;
					content = $(bayan.get('content'));
					el.prepend(content);
					el.scrollTop(topOff + content.height());
				}
			},
			error: function () {
				$.get('files/almizan/'+ section_id, function(item) {
					bayan.set('content', item);
					bayan.save();
					tafsir.addSection(section, flag);
				});
			}
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
	prependFirst: function() {
		if (this.firstSection > 0) {
			this.firstSection -= 1;
			this.addSection(this.firstSection, 'prepend');
		}
	},
	appendLast: function() {
		if (this.lastSection < this.sections.length-1) {
			this.lastSection += 1;
			this.addSection(this.lastSection, 'append');
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

app = new AppView();

// setup router
app.router = new AddressRouter();
Backbone.history.start();

app.render();

});

// set heights
$(window).load(function() {
	margins = app.tafsir.$el.outerHeight(true) - app.tafsir.$el.outerHeight();
	pageHeight = $('#wrap').height() - $('#footer').height() - margins;
	app.quran.$el.height(pageHeight);
	app.tafsir.$el.height(pageHeight);
});
