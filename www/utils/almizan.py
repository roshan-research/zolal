
import re
from pyquery import PyQuery as pq
from nltk import stem
from quran import simple_aya, aya_int
import numpy
from nltk.tokenize.punkt import PunktSentenceTokenizer


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
	return refine_numbers(result.strip().replace('.', ''))


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

def refine_sentence(sentence):
	remove_from_start = ('و', 'قوله', 'تعالی', ':', '؟', 'الخ', 'إلخ', '.', '،')
	sentence = sentence.lstrip()
	while sentence.startswith(remove_from_start):
		sentence = (sentence.split(' ', 1)[1]).lstrip()
	if sentence.startswith('إلی آخر الآیة'):
		sentence = sentence[14:].lstrip()
	return sentence


def resolve_phrases(section, tokens, book, id):
	phrases = []
	sentences = []
	# find and resolve parantheses
	if book == 'almizan_fa':
		if int(id.split('_')[0]) <= 2:
			html = section.html()
			replace = lambda start, end, oldtext, newtext: oldtext[:start] + newtext + oldtext[end:]

			# in chapter1, remove parantheses for ayas
			iter = re.finditer(r'(<span[^\n]*>)[ ]*\(([^\)s]*)\)[^\)]*(</span[^\n]*>)', html)
			for m in reversed(list(iter)):
				html = replace(m.start(), m.end(), html, m.group().replace('(', '').replace(')', ''))

			iter = re.finditer(r'\([^\)]{3,15}\)', html)
			for match in reversed(list(iter)):
				m = match.group()[1:-1]
				resolved = resolve_phrase(m, tokens, book[-2:])
				if resolved:
					html = replace(match.start(), match.end(), html, '<em rel="{0}">{1}</em>'.format(resolved[0], m))

			section.html(html)

	pst = PunktSentenceTokenizer()
	# resolve em elements
	for em in section.find('em').items():
		resolved = resolve_phrase(em.text(), tokens, book[-2:])
		if resolved:
			em.attr('rel', resolved[0])
			phrases.append((em.text(), resolved[1], resolved[0]))
			paragraph = em.parent().html(method='html')
			for start, end in pst.span_tokenize(paragraph):
				if paragraph[start:end].find(em.outerHtml()) != -1:
					this_sentence = paragraph[start:end].lstrip()
					this_sentence = refine_sentence(this_sentence)

					while this_sentence.startswith("<code"):
						if this_sentence.find('</code>') != -1:
							new_start = this_sentence.find('</code>') + 7
						this_sentence = this_sentence[new_start:].lstrip()

					this_sentence = refine_sentence(this_sentence)

					while this_sentence.startswith('<span'):
						new_start = this_sentence.find('</span>') + 7
						this_sentence = this_sentence[new_start:].lstrip()

					this_sentence = refine_sentence(this_sentence)

					before = this_sentence.index(em.outerHtml())
					after = len(this_sentence) - len(em.outerHtml()) - before
					em.attr('data-sentence', '{0}:{1}'.format(before, after))
					break
			sentences.append((em.text(), resolved[0], (before, after), [this_sentence]))
		else:
			phrases.append((em.text(), ))

	new_section = section.html(method='html')
	p = re.compile(r'<em rel="([^"]+)" data-sentence="([^"]+)">([^<]+)<\/em>')
	matched_list = [(m.start(0), m.end(0), m.group(1), m.group(2)) for m in re.finditer(p, new_section)]
	last_start = -1
	for matched in reversed(matched_list):
		start_span = matched[0] - int(matched[3].split(':')[0])
		end_span = matched[1] + int(matched[3].split(':')[1])
		if start_span != last_start:
			new_section = new_section[:start_span] + '<span class="phrase">' + new_section[start_span:end_span] + '</span>' + new_section[end_span:]
			last_start = start_span

	section.html(new_section)
	return phrases, sentences


def aya_tokens(aya):
	parts = simple_aya(aya['text']).replace('  ', ' ').split(' ')
	raw_ayas = aya['raw'].split(' ')
	normalize_token = lambda s: s.replace('آ', 'ا').replace('ء', '').replace('ئ', '').replace('أ', 'ا').replace('إ', 'ا').replace('ؤ', 'و')
	tokens = [{'word': word, 'stem': isri.stem(word), 'id': parts.index(word)+1} for word in raw_ayas if word in parts]
	not_found_words = [word for word in raw_ayas if word not in parts]
	not_found_parts = [part for part in parts if not part in raw_ayas]
	start = -1
	for word in not_found_words:
		for part in not_found_parts:
			if not_found_parts.index(part) > start:
				if normalize_token(word).replace('ا', '') == normalize_token(part).replace('ا', '') or normalize_token(word).replace('و', 'ا') == normalize_token(part).replace('و', 'ا') or normalize_token(word).replace('ی', 'ا') == normalize_token(part).replace('ی', 'ا'):
					found_ids = [token['id'] for token in tokens]
					k = found_ids[found_ids.index(parts.index(part) + 1)] if parts.index(part)+1 in found_ids else 0
					tokens.append({'word': word, 'stem': isri.stem(word), 'id': parts.index(part, k)+1})
					start = not_found_parts.index(part)
					break

	for i in range(len(tokens)):
		for j in range(i+1, len(tokens)):
			if tokens[i]['id'] == tokens[j]['id']:
				try:
					tokens[j]['id'] = parts.index(tokens[j]['word'], tokens[i]['id']) + 1
				except ValueError as e:
					print(str(e))
	return tokens


def resolve_phrase(phrase, tokens, book):
	phrase = simple_aya(phrase.strip()).replace('‌', '').replace('ّ', '')
	if len(phrase) < 3:
		return None

	normalize_Alif_lam = lambda s: s[2:] if (s[:2] == 'ال') else s
	normalize_arabic_letter = lambda s: s.replace('ة', 'ه').replace('ؤ', 'و').replace('إ', 'ا').replace('أ', 'ا')
	normalize_LBKF = lambda s: s[1:] if (s[:1] in 'لبکف') else s

	matchings = [
		lambda token: phrase == token['word'], # exact
		lambda token: normalize_arabic_letter(phrase) == normalize_arabic_letter(token['word']), # without arabic letters
		lambda token: normalize_Alif_lam(phrase) == normalize_Alif_lam(token['word']),# without Alif-lam
		lambda token: normalize_arabic_letter(normalize_Alif_lam(phrase)) == normalize_arabic_letter(normalize_Alif_lam(token['word'])),# without arabic letters and Alif-lam
		lambda token: normalize_arabic_letter(normalize_LBKF(phrase)) == normalize_arabic_letter(normalize_LBKF(token['word'])),
		lambda token: isri.stem(phrase) == token['stem'] # stemed
	]

	matchings2 = [
		lambda token, i: phrase.split()[i] == token['word'], # exact
		lambda token, i: normalize_arabic_letter(phrase.split()[i]) == normalize_arabic_letter(token['word']), # without arabic letters
		lambda token, i: normalize_Alif_lam(phrase.split()[i]) == normalize_Alif_lam(token['word']),# without Alif-lam
		lambda token, i: normalize_arabic_letter(normalize_Alif_lam(phrase.split()[i])) == normalize_arabic_letter(normalize_Alif_lam(token['word'])),# without arabic letters and Alif-lam
		lambda token, i: normalize_arabic_letter(normalize_LBKF(phrase.split()[i])) == normalize_arabic_letter(normalize_LBKF(token['word'])),
		lambda token, i: isri.stem(phrase.split()[i]) == token['stem'] # stemed
	]

	matched = []
	for aya, token_list in tokens.items():
		for token in token_list:
			for match in matchings:
				if match(token):
					matched.append(('{0}_{1}_{2}-{2}'.format(book, aya, token['id']), token['word']))
					break
	if len(matched) == 1:
		return matched[0]

	matched = []
	if len(phrase.split()) == 2:
		for aya, token_list in tokens.items():
			for token1 in token_list:
				for token2 in token_list:
					if token2['id'] == token1['id'] + 1:
						for match1 in matchings2:
							if match1(token1, 0):
								for match2 in matchings2:
									if match2(token2, 1):
										matched.append(('{0}_{1}_{2}-{3}'.format(book, aya, token1['id'], token2['id']), '{0} {1}'.format(token1['word'], token2['word'])))
										break
								break

	if len(matched) == 1:
		return matched[0]
	return None

def resolve_headers(section, id):
	headers = []
	normalize_ayas = lambda sura_ayas : [sura_ayas.split('_')[0] + '_%d'% a for a in range(int(sura_ayas.split('_')[1].split('-')[0]), int(sura_ayas.split('_')[1].split('-')[1])+1)] if len(sura_ayas.split('_')[1].split('-')) > 1 else [sura_ayas]
	for header in section.find('.title').items():
		header_ayas = sum([normalize_ayas(aya_header.attr('rel')) for aya_header in header.find('.aya').items()], [])
		header_tokens = sum([normalize_ayas('_'.join(token_header.attr('rel').split('_')[1:3])) for token_header in header.find('em[rel]').items()], [])

		content_ayas, content_tokens = [], []
		for content in header.parent().nextAll().items():
			if content.is_('h3 .title') or content.is_('p code.aya'):
				break
			for span_aya in content.find('span.aya').items():
				content_ayas.extend(normalize_ayas(span_aya.attr('rel')))
			for token_content in content.find('em[rel]').items():
				content_tokens.extend(normalize_ayas('_'.join(token_content.attr('rel').split('_')[1:3])))

		ayas = resolve_header(id, header_ayas, header_tokens, content_ayas, content_tokens)
		header.attr('rel', ' '.join(ayas))

		headers.append(((header.text(), ayas), (header_ayas, header_tokens, content_ayas, content_tokens)))

	return headers


def resolve_header(section_id, header_ayas=[], header_tokens=[], content_ayas=[], content_tokens=[]):
	"""
	>>> resolve_header('5_116-120', [], [], [], ['5_116'])
	['5_116', '5_117', '5_118', '5_119', '5_120']
	>>> resolve_header('2_180-182', ['2_183'], ['2_183'])
	['2_180', '2_181', '2_182']
	>>> resolve_header('2_183-186', ['2_183'], ['2_183'])
	['2_183']
	>>> resolve_header('2_1-5', ['2_4'], [], ['2_4', '38_26', '2_4', '2_5', '6_125', '59_9', '2_5'], [])
	['2_4']
	>>> resolve_header('5_112-115',['5_112'], [], ['5_112', '5_111', '5_111', '2_260', '2_260', '5_113', '2_260', '5_112'], ['5_112', '5_112', '5_112', '5_112'])
	['5_112']
	>>> resolve_header('5_94-99', [], [], ['5_95', '73_16', '5_95', '5_96', '5_95'], ['5_95', '5_95', '5_95', '5_95', '5_95', '5_95', '5_95', '5_95', '5_95', '5_95', '5_95'])
	['5_95']
	>>> resolve_header('5_94-99', ['5_97'], [], ['5_97', '4_5', '5_97', '3_96', '5_97', '5_97', '5_97'], ['5_95', '5_97', '5_97', '5_97', '5_95'])
	['5_97']
	>>> resolve_header('5_90-93', [], [], ['5_90'],[])
	['5_90', '5_91', '5_92', '5_93']
	"""

	# constant values
	ha_p, ha_m = 1.0, 0.5
	ht_p, ht_m = 1.0, 0.5
	cs_p, cs_m = 0.2, 0.0
	ct_p, ct_m = 0.1, 0.0
	default = 0.0

	# retrieve all ayas in section
	if section_id == '0':
		return []
	section_sura, section_aya = section_id.split('_')
	section_start, section_end = int(section_aya.split('-')[0]), int(section_aya.split('-')[1])
	not_in_section = lambda sura_aya: int(sura_aya.split('_')[0]) != int(section_sura) or not(section_start <= int(sura_aya.split('_')[1]) <= section_end)

	ayas_weight = {'%s_%d' % (section_sura, a): default for a in range(section_start, section_end+1)}

	# aya or phrase in header increase probability that aya and decrease others
	change = False
	for ha in header_ayas:
		if not_in_section(ha):
			continue
		ayas_weight[ha] += ha_p
		change = True

	if change:
		for other in ayas_weight.keys():
			if other not in header_ayas:
				ayas_weight[other] -= ha_m

	change = False
	for ht in header_tokens:
		if not_in_section(ht):
			continue
		ayas_weight[ht] += ht_p
		change = True

	if change:
		for other in ayas_weight.keys():
			if other not in header_tokens:
				ayas_weight[other] -= ht_m

	change = False
	for cs in content_ayas:
		if not_in_section(cs):
			continue
		ayas_weight[cs] += cs_p
		change = True

	if change:
		for other in ayas_weight.keys():
			if other not in content_ayas:
				ayas_weight[other] -= cs_m

	change = False
	for ct in content_tokens:
		if not_in_section(ct):
			continue
		ayas_weight[ct] += ct_p
		change = True

	if change:
		for other in ayas_weight.keys():
			if other not in content_tokens:
				ayas_weight[other] -= ct_m

	# normalize distribution and threshold (function of mean and variance)
	std = numpy.std(list(ayas_weight.values()))
	mean = numpy.mean(list(ayas_weight.values()))

	if std - 0.0 > 0.000001:
		for aw in ayas_weight.keys():
			ayas_weight[aw] = (ayas_weight[aw] - mean) / std

	threshold = default
	if std - 0.0 > 0.000001:
		threshold = (default - mean) / std

	# sort ayas with (score, -id) key and filter under threshold ones
	return [id for id, score in sorted(ayas_weight.items(), key=lambda item: (item[1], -aya_int(item[0])), reverse=True) if score >= threshold]
