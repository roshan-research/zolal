
import json
from path import Path
from collections import OrderedDict
from quran import read_quran, read_simple, read_lines
from almizan import read_tafsir, section_ayas, refine_numbers, resolve_footnotes, refine_section, resolve_phrases,resolve_headers

USE_ALMIZAN_TRANSLATION = False

data = Path('data')
files = Path('../files')


# read quran data
ayas, suras = read_quran(open(data / 'quran.txt'))
read_simple(open(data / 'quran-simple.txt'), ayas)
pages = read_lines(open(data / 'quran-lines.txt'), ayas)

# write quran pages
with open(files / 'quran' / 'all', 'w') as quran_file:
	format = lambda aya: OrderedDict([('page', aya['page']), ('text', aya['text']), ('raw', aya['raw']), ('id', aya['id'])])
	for p, ids in pages.items():
		page = '\n'.join([json.dumps(format(ayas[id]), ensure_ascii=False) for id in ids])
		print(page, file=open(files / 'quran' / ('p%d' % p), 'w'))
		print(page, file=quran_file)


# almizan
almizan_sections, phrases, headers, translations = [], [], [], {}
for ar_section, fa_section in zip(read_tafsir(open(data / 'almizan_ar.html')), read_tafsir(open(data / 'almizan_fa.html'))):

	# read section id
	id = ar_section.find('code.section').attr('rel')
	if id != fa_section.find('code.section').attr('rel'):
		print('error', id)

	if not id:
		id, tokens = '0', {}
	else:
		tokens = section_ayas(id, ayas)

		# section range
		sura, aya = id.split('_')
		f, t = aya.split('-')[0], aya.split('-')[1]
		ar_range = 'الآیات %s الى %s' % (f, t) if f != t else 'آیة %s' % f
		fa_range = 'آیه‌های %s تا %s' % (f, t) if f != t else 'آیه %s' % f
		ar_section.find('code.section').before('<h3 class="ayas">'+ refine_numbers('سورة %s %s' % (suras[int(sura)-1], ar_range)) +'</h3>')
		fa_section.find('code.section').before('<h3 class="ayas">'+ refine_numbers('سوره %s %s' % (suras[int(sura)-1], fa_range)) +'</h3>')

	resolve_footnotes(ar_section)
	refine_section(ar_section)
	phrases.extend(resolve_phrases(ar_section, tokens, 'almizan_ar', id))
	headers.extend(resolve_headers(ar_section, id))

	resolve_footnotes(fa_section)
	refine_section(fa_section)
	phrases.extend(resolve_phrases(fa_section, tokens, 'almizan_fa', id))
	headers.extend(resolve_headers(fa_section, id))

	# extract translations from tafsir
	if USE_ALMIZAN_TRANSLATION:
		for trans in fa_section.find('.trans').items():
			translations[trans.attr('rel')] = trans.text().split('«')[0].strip()

	almizan_sections.append(id)
	print(ar_section.html(), file=open(files / 'almizan_ar' / id, 'w'))
	print(fa_section.html(), file=open(files / 'almizan_fa' / id, 'w'))
	print(id)


if not USE_ALMIZAN_TRANSLATION:
	for line in open(data / 'fa.makarem.txt'):
		parts = line.split('|')
		if len(parts) == 3:
			translations['_'.join(parts[:2])] = parts[2].strip()

# write translations
json.dump(translations, open(files / 'quran' / 'fa', 'w'), ensure_ascii=False, sort_keys=True)

# write meta.js
meta = open('../js/meta.js', 'w')
print('var quran_suras = %s;' % str([sura for sura in suras]), file=meta)
print('var quran_pages = %s;' % str(dict(pages)), file=meta)
print('var almizan_sections = %s;' % str(almizan_sections), file=meta)


# write resolved phrases
output = open('phrases.txt', 'w')
print(len(list(filter(lambda t: len(t) == 3, phrases))), len(phrases), sep='/', file=output)
print(*phrases, sep='\n', file=output)

# write resolved headers
print(*headers, sep='\n', file=open('headers.txt', 'w'))
