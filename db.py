"""	Create db.js file

	From simple quran text file with aya numbers.
"""

db = open('data/db.js', 'w')

# suras
suras = ['الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'يونس', 'هود', 'يوسف', 'الرعد', 'ابراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه', 'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم', 'لقمان', 'السجدة', 'الأحزاب', 'سبإ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر', 'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق', 'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة', 'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج', 'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الانسان', 'المرسلات', 'النبإ', 'النازعات', 'عبس', 'التكوير', 'الإنفطار', 'المطففين', 'الإنشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد', 'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات', 'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس']
print('var suras = %s;' % str(suras), file=db)

# ayas
ayas = {}
with open('data/quran-text.txt') as lines:
	for line in lines:
		line = line.split('|')

		if len(line) == 3:
			key = '%s-%s' % (line[0], line[1])
			ayas[key] = {'sura': int(line[0]), 'aya': int(line[1]), 'text': line[2].strip().replace('ى', 'ي')}

pages = {}
with open('data/quran-lines.txt') as lines:
	lines.readline()
	for line in lines:
		line = line.split(', ')
		if line:
			if line[3] != 'S':
				pages['%s-%s' % (line[2], line[3])] = line[0]


def key_to_int(k):
	l = k.split('-')
	return int(l[0])*10000+int(l[1])

print('var ayas = [', file=db)
for key in sorted(ayas.keys(), key=key_to_int):
	if key in pages:
		page = int(pages[key])
	ayas[key]['page'] = page

	print(ayas[key], ',', sep='', file=db)

print('];', file=db)

# tafsir
from pyquery import PyQuery as pq

almizan = open('data/almizan.html').read()

sections = []
print('var bayans = [', file=db)
d = pq(almizan)
for i, div in enumerate(d('div')):
	div = pq(div)
	key = div.attr('rel')
	if key:
		sections.append(key)
		print("{'id': '%s', 'content':'%s'}," % (key, div.outerHtml().replace('\n', '')), file=db)

print('];', file=db)

print('var sections = %s;' % str(sections), file=db)
