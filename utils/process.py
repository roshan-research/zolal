
import re, json
from pyquery import PyQuery as pq
from path import path

files = path('../files')
meta = open(files / 'meta.js', 'w')
almizan = open('data/WEB01910.html')
quran = open('data/quran-text.txt')

# suras
quran_suras = ['الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'يونس', 'هود', 'يوسف', 'الرعد', 'ابراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه', 'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم', 'لقمان', 'السجدة', 'الأحزاب', 'سبإ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر', 'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق', 'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة', 'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج', 'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الانسان', 'المرسلات', 'النبإ', 'النازعات', 'عبس', 'التكوير', 'الإنفطار', 'المطففين', 'الإنشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد', 'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات', 'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس']
symbols = 'ۖۗۚۛۙۘ'
tashkeels = 'ًٌٍَُِّْٰ'
bismillah = 'بِسمِ اللَّهِ الرَّحمٰنِ الرَّحيمِ'


def refineAya(text):
	text = re.sub('[۞۩'+ symbols + tashkeels +']', '', text)
	return text


def refine(text):
	if not text:
		return ''

	# spaces
	result = re.sub(r'[\n ]+', r' ', text)

	# chracters
	result = result.replace('ك', 'ک').replace('ي', 'ی').replace('‏ ', ' ').replace('‏', '‌')

	# punctuations
	result = re.sub(r'([،\):؟])(?=[^ \.\d،])', r'\1 ', result)
	result = re.sub(r'(?=[^ ])([\(])', r' \1', result)

	result = refineAya(result)

	return result


def refineName(text):
	result = text.replace('ة', 'ه')
	if result.startswith('ال'):
		result = result[2:]
	return result


def refineNote(text):
	result = text
	if result.startswith('-'):
		result = result[1:]
	return result.strip()


# ayas
ayas = {}
for line in quran:
	line = line.split('|')

	if len(line) == 3:
		if line[1] == '1' and line[0] != '1' and line[0] != '9':
			line[2] = line[2][len(bismillah):]

		key = '%s-%s' % (line[0], line[1])
		ayas[key] = {'id': '%s-%s' % (line[0], line[1]), 'sura': int(line[0]), 'aya': int(line[1]), 'text': line[2].strip()}


d = pq(almizan.read())
almizan_sections = []
for section in d.children().children():
	section = pq(section)

	# footnote replacement
	for footnote in section.find('.footnote'):
		footnote = pq(footnote)
		content = section.find('.footnote-content[rel="%s"]' % footnote.attr('rel'))
		if content:
			content = pq(content[0])
			footnote.attr('title', refineNote(content.html()))
			content.remove()

	for footnote in section.find('.footnote-content'):
		footnote = pq(footnote)
		for rel in re.split(' +', re.sub(r'[^ \d]', ' ', footnote.attr('rel'))):
			ref = section.find('.footnote:not([title])[rel="%s"]' % rel)
			pq(ref[0]).attr('title', refineNote(footnote.html()))
			# todo check ambigous multiple footnotes

		footnote.remove()

	# add ayas
	key = section('code.section').text()
	if key:
		sura, aya = key.split('-')
		first, second = aya.split(':')
		html = '<h2>آیات %s تا %s سوره %s</h2>' % (first, second, refineName(quran_suras[int(sura)-1]))
		for a in range(int(first), int(second)+1):
			aya = '%s-%d' % (sura, a)
			html += '<li class="aya" rel="%s">%d. %s</li>' % (aya, a, refineAya(ayas[aya]['text']))

		section.prepend(html)

	# refinement
	for item in section.children():
		item = pq(item)
		if item[0].tag == 'p' and not item.text():
			item.remove()
		item.html(refine(item.html()))

	# store section
	if not key: key = '0'
	almizan_sections.append(key)
	print(section.html(), file=open(files / 'almizan' / key.replace('-', '_').replace(':', '-'), 'w'))


d.root.write('data/almizan.html', encoding='utf-8')
