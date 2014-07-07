
import re
from collections import defaultdict
from pyquery import PyQuery as pq
from nltk import stem
from quran import simple_aya


isri = stem.ISRIStemmer()
number_map = str.maketrans('1234567890', '۱۲۳۴۵۶۷۸۹۰')
refine_numbers = lambda text: text.translate(number_map)


def read_tafsir(tafsir):
	html = refine_html(tafsir.read())
	d = pq(html)

	for section in d.children().children().items():
		if not len(section.text().strip()):
			continue

		yield section


def section_ayas(id, ayas):
	tokens = {}
	sura, aya = id.split('_')
	for a in range(int(aya.split('-')[0]), int(aya.split('-')[1])+1):
		aya = '%s_%d' % (sura, a)
		text = ayas[aya]['raw']
		tokens[aya] = aya_tokens(ayas[aya])
	return tokens


def resolve_footnotes(section):
	for footnote in section.find('.footnote:not([title])').items():
		content = section.find('.footnote-content[rel="%s"]' % footnote.attr('rel'))
		if content:
			content = pq(content[0])
			footnote.attr('title', content.html())
			content.remove()

	for footnote in section.find('.footnote-content').items():
		for rel in re.split(' +', re.sub(r'[^ \d]', ' ', footnote.attr('rel'))):
			ref = section.find('.footnote:not([title])[rel="%s"]' % rel)
			if ref:
				pq(ref[0]).attr('title', footnote.html())
			# todo check ambigous multiple footnotes
			# todo fix unresolved footnotes

		footnote.remove()

	# refine footnotes
	for footnote in section.find('.footnote').items():
		title = footnote.attr('title')
		if title:
			footnote.attr('title', refine_note(title))
		else:
			footnote.remove()


def refine_html(html):

	expressions = [

		# spaces
		(r'[\n ]+', r' '),

		# headers
		(r'<h3> ?\(([^\(\)]+)\) ?</h3>', r'<h3>\1</h3>'),

		# footnotes
		(r' ?: ?\n?</span>', r'</span>:'),
		(r': ?\(([^{\d\na-zA-Z]{1,10}): ?(\d+)\)', r'<span class="footnote" title="\1، \2">*</span>'),
		(r':([^{\d\na-zA-Z]{1,10})[ :،-]([0-9، ]*\d)', r'<span class="footnote" title="\1، \2">*</span>'),

		# punctuations
		(r'،? ?`', r'،'),
		(r'\*(?!</span>)', r''),
		(r'"([^"\na-z0-9<>.]{1,15})"', r' <em>\1</em> '),
		(r'([^=a-z\d])"([^=a-z\d>])', r'\1 \2'),
		(r'([\.،؛\):؟])(?=[^ :\.\d،؛\)])', r'\1 '),
		(r' ([:\)])', r'\1'),
		(r'(?=[^ ])([\(])', r' \1'),

		# fix spaces
		(r'</span>(?=[^ ،؛.\)؟])', '</span> '),
		(r'([^ \(])<span', r'\1 <span'),
		(r'</em>(?=[^ ،؛.\)؟])', '</em> '),
		(r'([^ \(])<em', r'\1 <em'),
		(r' +<span class="footnote"', '<span class="footnote"'),
		(r'‌<', '<'),
	]

	for key, value in expressions:
		html = re.sub(key, value, html)

	return html


def refine_note(text):
	result = text
	if result.startswith('-'):
		result = result[1:]
	return refine_numbers(result.strip())


def refine_translation(section):
	for trans in section.find('.trans').items():
		html = trans.html()
		if not html: continue
		html = re.sub(r'[ -]*\(\d+\) *', '', str(html))

		# add aya number
		aya = trans.attr('rel').split('_')[1]
		if int(aya):
			html = html + ' «%s»' % refine_numbers(aya)
		trans.html(html + ' ')


def refine_section(section):

	# ayas
	for item in section.find('.aya').items():
		text = simple_aya(item.text())
		if text.startswith('(') and text.startswith('('):
			text = text[1:-1]
		item.text(text)

	# structure
	refine_translation(section)
	for item in section.children().items():
		if item[0].tag == 'p':
			if len(item.text().strip()) <= 1:
				item.remove()
			else:
				if len(item.find('.trans')) >= 1:
					for span in section.find('.trans').items():
						item.append(span.outerHtml())
						span.remove()


def resolve_phrases(section, tokens, book, id):

	# find and resolve parantheses
	if book == 'almizan_fa':
		if int(id.split('_')[0]) <= 2:
			html = section.html()
			replace = lambda start, end, oldtext, newtext: oldtext[:start] + newtext + oldtext[end:]

			# in chapter1, remove parantheses for ayas
			iter = re.finditer(r'(<span[^\n]*>)[ ]*\(([^\)s]*)\)[^\)]*(</span[^\n]*>)', html)
			for m in reversed(list(iter)):
				html = replace(m.start(), m.end(), html, m.group().replace('(','').replace(')',''))

			iter = re.finditer(r'\([^\)]{3,15}\)', html)
			for match in reversed(list(iter)):
				m = match.group()[1:-1]
				rel = resolve_phrase(m, tokens, book[-2:])
				if rel:
					html = replace(match.start(), match.end(), html, '<em rel="{0}">{1}</em>'.format(rel, m))

			section.html(html)

	# resolve em elements
	for em in section.find('em').items():
		rel = resolve_phrase(em.text(), tokens, book[-2:])
		if rel:
			em.attr('rel', rel)


def aya_tokens(aya):
	parts = simple_aya(aya['text']).replace('  ', ' ').split(' ')
	tokens = [{'word': word, 'stem': isri.stem(word), 'id': parts.index(word)+1} for word in aya['raw'].split(' ') if word in parts]
	return tokens


def resolve_phrase(phrase, tokens, book):
	rel = None
	phrase = phrase.strip().replace('ة','ه').replace('ؤ','و').replace('‌', '')
	if len(phrase) < 3:
		return None

	matchings = [
		lambda token: phrase == token['word'], # exact
		lambda token: token['word'][:2] == 'ال' and phrase == token['word'][2:], # without Alif-Lam
		lambda token: token['word'][:1] in 'لبکف' and phrase == token['word'][1:],
		lambda token: isri.stem(phrase) == token['stem'] # stemed
	]

	for match in matchings:
		for aya, token_list in tokens.items():
			for token in token_list:
				if match(token):
					return '{0}_{1}_{2}-{2}'.format(book, aya, token['id'])

	return rel
