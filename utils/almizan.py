
import re
from collections import defaultdict
from pyquery import PyQuery as pq
from nltk import stem
from quran import simple_aya


isri = stem.ISRIStemmer()


def read_tafsir(tafsir):
	html = refine_html(tafsir.read())
	d = pq(html)

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
		text = simple_aya(ayas[aya]['text'])
		html += '<span class="aya" rel="%s">%s «%d»</span> ' % (aya, text, a)
		tokens[aya] = text.replace('ة','ه').replace('ؤ','و').replace('ّ', '').split(' ')
		stems[aya] = list(map(isri.stem, tokens[aya]))

	return html, tokens, stems


def resolve_footnotes(section):
	for footnote in section.find('.footnote:not([content])').items():
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


def refine_html(html):

	expressions = [

		# spaces
		(r'[\n ]+', r' '),

		# headers
		(r'<h3> ?\(([^\(\)]+)\) ?</h3>', r'<h3>\1</h3>'),

		# footnotes
		(r' ?: ?\n?</span>', r'</span>:'),
		(r': ?\(([^{\d\na-zA-Z]{1,10}): ?(\d+)\)', r'<span class="footnote" content="\1، \2">*</span>'),
		(r':([^{\d\na-zA-Z]{1,10})[ :،-]([0-9، ]*\d)', r'<span class="footnote" content="\1، \2">*</span>'),

		# punctuations
		(r'\*(?!</span>)', r''),
		(r'([\.،؛\):؟])(?=[^ :\.\d،؛\)])', r'\1 '),
		(r' ([:\)])', r'\1'),
		(r'(?=[^ ])([\(])', r' \1'),
		(r'"([^"\na-z0-9<>.]{1,15})"', r' <em>\1</em> '),
		(r'([^=a-z\d])"([^=a-z\d>])', r'\1 \2'),

		# fix spaces
		(r'</span>(?=[^ ،؛.\)؟])', '</span> '),
		(r'([^ \(])<span', r'\1 <span'),
		(r'</em>(?=[^ ،؛.\)؟])', '</em> '),
		(r'([^ \(])<em', r'\1 <em'),
		(r' +<span class="footnote"', '<span class="footnote"'),
	]

	for key, value in expressions:
		html = re.sub(key, value, html)

	return html


def refine_note(text):
	result = text
	if result.startswith('-'):
		result = result[1:]
	return result.strip()


def refine_section(section):

	# ayas
	for item in section.find('.aya').items():
		text = item.text()
		text = text.replace('`', '،')
		item.text(simple_aya(text))

	# structure
	for item in section.children().items():
		if item[0].tag == 'p':
			if len(item.text().strip()) <= 1:
				item.remove()
			else:
				if len(item.find('.trans')) >= 1:
					for span in section.find('.trans').items():
						item.append(span.outerHtml())
						span.remove()
