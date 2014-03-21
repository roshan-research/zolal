
import re
from collections import defaultdict
from pyquery import PyQuery as pq
from nltk import stem


symbols = 'ۖۗۚۛۙۘ'
tashkeels = 'ًٌٍَُِّْٰ'
isri = stem.ISRIStemmer()


def read_tafsir(tafsir):
	d = pq(tafsir.read())

	for section in d.children().children().items():
		if not len(section.text().strip()):
			continue

		yield section


def section_ayas(id, ayas):
	html = ''
	sura, aya = id.split('_')
	tokens, stems = {}, {}

	for a in range(int(aya.split('-')[0]), int(aya.split('-')[1])+1):
		aya = '%s_%d' % (sura, a)
		text = refine_aya(ayas[aya]['text'])
		html += '<span class="aya" rel="%s">%s «%d»</span> ' % (aya, text, a)
		tokens[aya] = text.replace('ة','ه').replace('ؤ','و').replace('ّ', '').split(' ')
		stems[aya] = list(map(isri.stem, tokens[aya]))

	return html, tokens, stems


def resolve_footnotes(section):
	for footnote in section.find('.footnote:not([content])'):
		footnote = pq(footnote)
		content = section.find('.footnote-content[rel="%s"]' % footnote.attr('rel'))
		if content:
			content = pq(content[0])
			footnote.attr('content', refine_note(content.html()))
			content.remove()

	for footnote in section.find('.footnote-content'):
		footnote = pq(footnote)
		for rel in re.split(' +', re.sub(r'[^ \d]', ' ', footnote.attr('rel'))):
			ref = section.find('.footnote:not([content])[rel="%s"]' % rel)
			if ref:
				pq(ref[0]).attr('content', refine_note(footnote.html()))
			# todo check ambigous multiple footnotes
			# todo fix unresolved footnotes

		footnote.remove()


def refine(text):
	if not text: return ''

	# spaces
	result = re.sub(r'[\n ]+', r' ', text)

	# punctuations
	result = re.sub(r'\*(?!</span>)', r'', result)
	result = re.sub(r'([\.،؛\):؟])(?=[^ :\.\d،؛\)])', r'\1 ', result)
	result = re.sub(r' ([:\)])', r'\1', result)
	result = re.sub(r'(?=[^ ])([\(])', r' \1', result)
	result = re.sub(r'"([^"\na-z0-9<>.]{1,15})"', r' <em>\1</em> ', result)
	result = re.sub(r'([^=a-z\d])"([^=a-z\d>])', r'\1\2', result)
	result = refine_aya(result)

	# fix spaces
	for elm in ['span', 'em']:
		result = re.sub(r'</'+ elm +'>(?=[^ ،؛.\)؟])', '</'+ elm +'> ', result)
		result = re.sub(r'([^ \(])<'+ elm, r'\1 <'+ elm, result)
	result = re.sub(r' +<span class="footnote"', '<span class="footnote"', result)

	return result


def refine_aya(text):
	# remove tashkeels
	text = re.sub('[۞۩'+ symbols + tashkeels +']', '', text)

	# remove aya separator
	text = re.sub(r'([،؟:]) *` *', r'\1 ', text)
	text = re.sub(r' *` *', '، ', text).replace('.،', '،')

	# remove qoutation marks
	text = re.sub(r'"([^"\na-z0-9<>]+)"',r' \1 ',text)
	text = text.replace('ك', 'ک').replace('ي', 'ی')
	return text


def refine_note(text):
	result = text
	if result.startswith('-'):
		result = result[1:]
	return result.strip()


def refine_section(section):
	for item in section.children().items():
		if item[0].tag == 'p':
			if not item.text().strip():
				item.remove()
			else:
				if len(item.find('.trans')) >= 1:
					for span in section.find('.trans').items():
						item.append(span.outerHtml())
						span.remove()

		item.html(refine(item.html()))
