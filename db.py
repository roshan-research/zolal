"""	Create `meta.js` file and fill `files` folder
"""

import re, json
from pyquery import PyQuery as pq
from collections import defaultdict
from path import path

files = path('files')
meta = open(files / 'meta.js', 'w')

# suras
quran_suras = ['الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'يونس', 'هود', 'يوسف', 'الرعد', 'ابراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه', 'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم', 'لقمان', 'السجدة', 'الأحزاب', 'سبإ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر', 'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق', 'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة', 'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج', 'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الانسان', 'المرسلات', 'النبإ', 'النازعات', 'عبس', 'التكوير', 'الإنفطار', 'المطففين', 'الإنشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد', 'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات', 'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس']
symbols = 'ۖۗۚۛۙ'
bismillah = 'بِسمِ اللَّهِ الرَّحمٰنِ الرَّحيمِ'


def refineText(text):
	return text.strip().replace('ى', 'ي')

print('var quran_suras = %s;' % str([refineText(sura) for sura in quran_suras]), file=meta)


# ayas
ayas = {}
with open('data/quran-text.txt') as lines:
	for line in lines:
		line = line.split('|')

		if len(line) == 3:
			if line[1] == '1' and line[0] != '1' and line[0] != '9':
				line[2] = line[2][len(bismillah):]

			key = '%s-%s' % (line[0], line[1])
			ayas[key] = {'id': '%s-%s' % (line[0], line[1]), 'sura': int(line[0]), 'aya': int(line[1]), 'text': refineText(line[2])}

pages, quran_lines = {}, {}
with open('data/quran-lines.txt') as lines:
	lines.readline()
	for line in lines:
		line = line.split(', ')
		if line:
			if line[3] != 'S':
				pages['%s-%s' % (line[2], line[3])] = line[0]
				quran_lines['%s-%s' % (line[0], line[1])] = line[4].count(';')


def key_to_int(k):
	l = k.split('-')
	return int(l[0])*10000+int(l[1])

line_words = iter(sorted(quran_lines.keys(), key=key_to_int))
current_line = quran_lines[line_words.__next__()]
page = 0
for key in sorted(ayas.keys(), key=key_to_int):

	if key in pages:
		if page != int(pages[key]):
			page = int(pages[key])
			count = 0

	ayas[key]['page'] = page

	# todo care about hizb and sajde characters
	html, parts = '', []
	text = ayas[key]['text']
	text = text.replace('۞ ', '')  # remove hizb sign
	text = re.sub('( ['+ symbols +'])', '\\1', text)
	text = re.sub('(['+ symbols +'])', '<span class="mark">\\1 </span>', text)
	aya_parts = text.split(' ')
	aya_parts.append('<span class="number">(%d)</span>' % ayas[key]['aya'])
	for part in aya_parts:
		parts.append(part)
		count += 1
		if (count >= current_line):
			html += ' '.join(parts) + ' '  # use <br> for line breaks
			count, parts = 0, []

			try:
				current_line = quran_lines[line_words.__next__()]
			except:
				pass

	if parts:
		html += ' '.join(parts)
		parts = []

	ayas[key]['html'] = html.strip()


# tafsir
almizan = open('data/almizan.html').read()

almizan_sections = []
d = pq(almizan)
for i, div in enumerate(d('div')):
	div = pq(div)
	key = div.attr('rel')
	if key:
		almizan_sections.append(key)
		print(div.html().replace('\n', ''), file=open(files / 'almizan' / key, 'w'))


# add translations
for p in d('p.trans'):
	p = pq(p)
	ayas[p.attr('rel')]['trans'] = p.text()


# write ayas
quran_pages, page = defaultdict(list), 0
for key in sorted(ayas.keys(), key=key_to_int):
	aya = ayas[key]
	if aya['page'] != page:
		page = aya['page']
		quran_file = open(files / 'quran' / ('p%d' % page), 'w')

	quran_pages[aya['page']].append(key)

	print(json.dumps(aya), file=quran_file)

print('var quran_pages = %s;' % str(dict(quran_pages)), file=meta)

print('var almizan_sections = %s;' % str(almizan_sections), file=meta)
