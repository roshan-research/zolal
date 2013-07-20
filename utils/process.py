
import re, json
from collections import defaultdict
from pyquery import PyQuery as pq
from nltk import stem
from path import path

files = path('../files')
data = path('data')
quran = open(data / 'quran-text.txt')
isri = stem.ISRIStemmer()

# suras
quran_suras = ['الفاتحة', 'البقرة', 'آل‌عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'یونس', 'هود', 'یوسف', 'الرعد', 'ابراهیم', 'الحجر', 'النحل', 'الإسراء', 'الکهف', 'مریم', 'طه', 'الأنبیاء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنکبوت', 'الروم', 'لقمان', 'السجدة', 'الأحزاب', 'سبإ', 'فاطر', 'یس', 'الصافات', 'ص', 'الزمر', 'غافر', 'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثیة', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق', 'الذاریات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحدید', 'المجادلة', 'الحشر', 'الممتحنة', 'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحریم', 'الملک', 'القلم', 'الحاقة', 'المعارج', 'نوح', 'الجن', 'المزمل', 'المدثر', 'القیامة', 'الانسان', 'المرسلات', 'النبإ', 'النازعات', 'عبس', 'التکویر', 'الإنفطار', 'المطففین', 'الإنشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشیة', 'الفجر', 'البلد', 'الشمس', 'اللیل', 'الضحى', 'الشرح', 'التین', 'العلق', 'القدر', 'البینة', 'الزلزلة', 'العادیات', 'القارعة', 'التکاثر', 'العصر', 'الهمزة', 'الفیل', 'قریش', 'الماعون', 'الکوثر', 'الکافرون', 'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس']
symbols = 'ۖۗۚۛۙۘ'
tashkeels = 'ًٌٍَُِّْٰ'


def refineAya(text):

	# remove tashkeels
	text = re.sub('[۞۩'+ symbols + tashkeels +']', '', text)

	# remove aya separator
	text = re.sub(r'([،؟:]) *` *', r'\1 ', text)
	text = re.sub(r' *` *', '، ', text)

	# remove qoutation marks
	text = re.sub(r'"([^"\na-z0-9<>]+)"',r' \1 ',text)
	text = text.replace('ك', 'ک').replace('ي', 'ی')
	return text


def refine(text):
	if not text: return ''

	# spaces
	result = re.sub(r'[\n ]+', r' ', text)

	# punctuations
	result = re.sub(r'([\.،؛\):؟])(?=[^ :\.\d،؛])', r'\1 ', result)
	result = re.sub(r'(?=[^ ])([\(])', r' \1', result)
	result = re.sub(r'"(<span[^\n]*>)([^\n"]*)(</span[^\n]*>)"',r'\1\2\3',result)
	result = re.sub(r'(<span[^\n]*>)"([^\n"]*)(</span>)"', r'\1"\2"\3', result)
	result = re.sub(r'"([^"\na-z0-9<>.]{1,15})"', r' <em>\1</em> ', result)
	result = refineAya(result)


	# fix spaces
	for elm in ['span', 'em']:
		result = re.sub(r'</'+ elm +'>(?=[^ ،؛.\)؟])', '</'+ elm +'> ', result)
		result = re.sub(r'([^ \(])<'+ elm, r'\1 <'+ elm, result)
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


def refineTranslation(text):
	if not text: return ''

	text = re.sub(r'([\.،؟!:\)])(?=[^ :\.\d،؛])', r'\1 ', text)
	text = re.sub(r'(?=[^ ])([\(])', r' \1', text)
	text = text.strip()
	if text[-1] not in '.؟!':
		text += '.'
	return text


def aya_to_int(k):
	l = k.split('_')
	return int(l[0])*10000+int(l[1])


def read_ayas():
	ayas = {}
	bismillah = 'بِسمِ اللَّهِ الرَّحمٰنِ الرَّحیمِ'
	for line in quran:
		line = line.split('|')

		if len(line) == 3:
			if line[1] == '1' and line[0] != '1' and line[0] != '9':
				line[2] = line[2][len(bismillah):]

			key = '%s_%s' % (line[0], line[1])
			ayas[key] = {'id': '%s_%s' % (line[0], line[1]), 'sura': int(line[0]), 'aya': int(line[1]), 'text': line[2].strip()}

	pages, quran_lines = {}, {}
	with open(data / 'quran-lines.txt') as lines:
		lines.readline()
		for line in lines:
			line = line.split(', ')
			if line:
				if line[3] != 'S':
					pages['%s_%s' % (line[2], line[3])] = line[0]
					quran_lines['%s_%s' % (line[0], line[1])] = line[4].count(';')


	line_words = iter(sorted(quran_lines.keys(), key=aya_to_int))
	current_line = quran_lines[line_words.__next__()]
	page = 0
	for key in sorted(ayas.keys(), key=aya_to_int):

		if key in pages:
			if page != int(pages[key]):
				page = int(pages[key])
				count = 0

		ayas[key]['page'] = page
		ayas[key]['text'] = ayas[key]['text'].replace('۞ ', '')  # remove hizb sign

	return ayas


def process_tafsir(ayas, book):
	almizan_sections = []
	errors = open(data / ('errors_process_'+ book + '.txt'), 'w')
	d = pq(open(data / (book + '.html')).read())

	for section in d.children().children():
		section = pq(section)

		# footnote replacement
		for footnote in section.find('.footnote:not([content])'):
			footnote = pq(footnote)
			content = section.find('.footnote-content[rel="%s"]' % footnote.attr('rel'))
			if content:
				content = pq(content[0])
				footnote.attr('content', refineNote(content.html()))
				content.remove()

		for footnote in section.find('.footnote-content'):
			footnote = pq(footnote)
			for rel in re.split(' +', re.sub(r'[^ \d]', ' ', footnote.attr('rel'))):
				ref = section.find('.footnote:not([content])[rel="%s"]' % rel)
				if ref:
					pq(ref[0]).attr('content', refineNote(footnote.html()))
				# todo check ambigous multiple footnotes
				# todo fix unresolved footnotes

			footnote.remove()

		# add ayas
		aya_stems = {}
		aya_tokens = {}
		key = section.find('code.section').text()
		if key:
			sura, aya = key.split(' ')
			second, first = aya.split('-') if '-' in aya else (aya, aya)
			key = '%s_%s-%s' % (sura, first, second)
			html = '<h2>آیات %s تا %s سوره %s</h2>' % (first, second, refineName(quran_suras[int(sura)-1]))
			for a in range(int(first), int(second)+1):
				aya = '%s_%d' % (sura, a)
				text = refineAya(ayas[aya]['text'])
				html += '<span class="aya" rel="%s">%s «%d» </span>' % (aya, text, a)
				aya_tokens[aya] = text.replace('ة','ه').replace('ؤ','و').replace('ّ', '').split(' ')
				aya_stems[aya] = list(map(isri.stem, aya_tokens[aya]))

			section.prepend(html)
		else:
			key = '0'

		if key not in almizan_sections:
			almizan_sections.append(key)

		if book == 'almizan_fa':
			# fix translations
			for trans in section.find('.trans'):
				trans = pq(trans)
				html = trans.html()
				if not html:
					html = ''
					if trans.attr('rel') in ayas:
						ayas[trans.attr('rel')]['trans'] = ''
				else:
					html = re.sub(r'[ -]*\(\d+\) *', '', str(html))
					if trans.attr('rel') in ayas:
						text = pq(html)
						text.find('code').remove()
						html = refineTranslation(text.text())
						ayas[trans.attr('rel')]['trans'] = html

				# add aya number
				aya = trans.attr('rel').split('_')[1]
				if int(aya): html = html + ' «%s»' % aya
				trans.html(html + ' ')

			#find and resolve parantheses
			if int(key.split('_')[0]) <= 2:
				html = section.html()

				# in chapter1, remove parantheses for ayas
				iter = re.finditer(r'(<span[^\n]*>)[ ]*\(([^\)s]*)\)[^\)]*(</span[^\n]*>)',html)
				for m in reversed(list(iter)):
					html = replace(m.start(), m.end(), html, m.group().replace('(','').replace(')',''))


				#remove ayas parantheses in tafseer
				"""
				for aya in d('span.aya'):
					aya = pq(aya)
					html = aya.html()
					print('html1: ' + html + '\n', file = testfile)
					html = re.sub(r'\(([^\n\)]*)\)', r'\1', html)
					print('html2: ' + html + '\n', file = testfile)
					aya.html(html)
					print('ayahtml: ' + html + '\n', file = testfile)"""


				iter = re.finditer(r'\([^\)]{3,15}\)', html)
				for match in reversed(list(iter)):
					m = match.group()[1:-1]
					rel = resolve(m, aya_stems, aya_tokens, book)
					if rel != 'null':
						html = replace(match.start(), match.end(), html, '<em rel="{0}"> {1} </em>'.format(rel, m))

				section.html(html)

		# refinement
		for item in section.children():
			item = pq(item)

			if item[0].tag == 'p':
				if not item.text().strip():
					item.remove()
				else:
					if len(item.find('.trans')) >= 1:
						for span in section.find('.trans'):
							span = pq(span)
							item.append(span.outerHtml())
							span.remove()

			elif item[0].tag == 'code':
				item.wrap('<p>')

			item.html(refine(item.html()))

		# resolve em
		for em in section.find('em'):
			em = pq(em)
			rel = resolve(em.text(),aya_stems, aya_tokens, book)
			if rel != 'null':
				em.attr('rel', rel)

		# store section
		print(section.html(), file=open(files / book / key, 'w'))

	return almizan_sections


def resolve(text, aya_stems, aya_tokens, book):
	rel = 'null'
	text  = text.replace('ة','ه').replace('ؤ','و')
	#resolve aya tokens with or without Alif-Lam
	for aya, tokens in aya_tokens.items():
		if text in tokens:
			rel = '{0}_{1}_{2}-{2}'.format('ar' if book == 'almizan_ar' else 'fa', aya, tokens.index(text)+1)
			return rel
		elif text[2:] in aya_tokens.items():
			rel = '{0}_{1}_{2}-{2}'.format('ar' if book == 'almizan_ar' else 'fa', aya, tokens.index(text[2:])+1)
			print ('case 2: ' + rel)
			return rel

	#resolve aya stems
	text = isri.stem(text.replace('‌', ''))
	for aya, stems in aya_stems.items():
		if text in stems:
			rel = '{0}_{1}_{2}-{2}'.format('ar' if book == 'almizan_ar' else 'fa', aya, stems.index(text)+1)
			break
	return rel;

def replace(start, end, oldtext, newtext):
	return oldtext[:start] + newtext + oldtext[end:]

if __name__ == '__main__':
	print('ayas')
	ayas = read_ayas()
	print('almizan_ar')
	almizan_sections = process_tafsir(ayas, 'almizan_ar')
	print('almizan_fa')
	process_tafsir(ayas, 'almizan_fa')

	# write ayas
	quran_pages, page = defaultdict(list), 0
	for key in sorted(ayas.keys(), key=aya_to_int):
		aya = ayas[key]
		if aya['page'] != page:
			page = aya['page']
			quran_file = open(files / 'quran' / ('p%d' % page), 'w')

		quran_pages[aya['page']].append(key)
		print(json.dumps(aya, ensure_ascii=False), file=quran_file)

	# write meta.js
	meta = open(files / 'meta.js', 'w')
	print('var quran_suras = %s;' % str([sura for sura in quran_suras]), file=meta)
	print('var quran_pages = %s;' % str(dict(quran_pages)), file=meta)
	print('var almizan_sections = %s;' % str(almizan_sections), file=meta)
