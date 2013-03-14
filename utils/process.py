
import re, json
from pyquery import PyQuery as pq
from path import path

files = path('../files')
almizan = open('data/WEB01910.html')
quran = open('data/quran-text.txt')

# suras
quran_suras = ['الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'یونس', 'هود', 'یوسف', 'الرعد', 'ابراهیم', 'الحجر', 'النحل', 'الإسراء', 'الکهف', 'مریم', 'طه', 'الأنبیاء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنکبوت', 'الروم', 'لقمان', 'السجدة', 'الأحزاب', 'سبإ', 'فاطر', 'یس', 'الصافات', 'ص', 'الزمر', 'غافر', 'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثیة', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق', 'الذاریات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحدید', 'المجادلة', 'الحشر', 'الممتحنة', 'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحریم', 'الملک', 'القلم', 'الحاقة', 'المعارج', 'نوح', 'الجن', 'المزمل', 'المدثر', 'القیامة', 'الانسان', 'المرسلات', 'النبإ', 'النازعات', 'عبس', 'التکویر', 'الإنفطار', 'المطففین', 'الإنشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشیة', 'الفجر', 'البلد', 'الشمس', 'اللیل', 'الضحى', 'الشرح', 'التین', 'العلق', 'القدر', 'البینة', 'الزلزلة', 'العادیات', 'القارعة', 'التکاثر', 'العصر', 'الهمزة', 'الفیل', 'قریش', 'الماعون', 'الکوثر', 'الکافرون', 'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس']
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

	# fix spaces
	result = re.sub(r'</span>(?=[^ ،.])', '</span> ', result)
	result = re.sub(r'(?=[^ ])<span', ' <span', result)
	result = re.sub(r' +<span class="footnote"', '<span class="footnote"', result)

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
			html += '<span class="aya" rel="%s">%s «%d» </span>' % (aya, refineAya(ayas[aya]['text']), a)

		section.prepend(html)

	# fix translations
	for trans in section.find('.trans'):
		trans = pq(trans)
		html = re.sub(r'[ -]*\(\d+\) *', '', str(trans.html()))
		if trans.attr('rel') in ayas:
			text = pq(html)
			text.find('code').remove()
			ayas[trans.attr('rel')]['trans'] = text.text()

		# add aya number
		aya = trans.attr('rel').split('-')[1]
		if int(aya): html = html + ' «%s»' % aya
		trans.html(html + ' ')

	# refinement
	for item in section.children():
		item = pq(item)
		if item[0].tag == 'p' and not item.text():
			item.remove()
		item.html(refine(item.html()))

	# page element
	for page in section.find('code.page'):
		page = pq(page)
		page.html('<span>%s</span>' % page.text())

	# store section
	if not key: key = '0'
	almizan_sections.append(key)
	print(section.html(), file=open(files / 'almizan' / key.replace('-', '_').replace(':', '-'), 'w'))


d.root.write('data/almizan.html', encoding='utf-8')
