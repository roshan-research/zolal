
import json
from path import path
from quran import read_quran, read_simple, read_translation, read_lines
from almizan import read_tafsir, section_ayas, resolve_footnotes, refine_section, resolve_phrases


data = path('data')
files = path('../files')


if __name__ == '__main__':

	# read quran data
	ayas, suras = read_quran(open(data / 'quran.txt'))
	read_simple(open(data / 'quran-simple.txt'), ayas)
	read_translation(open(data / 'quran-translation.txt'), ayas)
	pages = read_lines(open(data / 'quran-lines.txt'), ayas)

	# write quran pages
	quran_file = open(files / 'quran' / 'all', 'w')
	for page, ids in pages.items():
		page_file = open(files / 'quran' / ('p%d' % page), 'w')
		page = '\n'.join([json.dumps(ayas[id], ensure_ascii=False) for id in ids])
		print(page, file=page_file)
		print(page, file=quran_file)

	# almizan
	almizan_sections = []
	for ar_section, fa_section in zip(read_tafsir(open(data / 'almizan_ar.html')), read_tafsir(open(data / 'almizan_fa.html'))):

		# read section id
		id = ar_section.find('code.section').attr('rel')
		if id != fa_section.find('code.section').attr('rel'):
			print('error', id)

		if not id:
			id, tokens, stems = '0', {}, {}
		else:
			html, tokens, stems = section_ayas(id, ayas)
			ar_section.find('code.section').before('<p class="ayas">'+ html +'</p>')
			fa_section.find('code.section').before('<p class="ayas">'+ html +'</p>')

		resolve_footnotes(ar_section)
		refine_section(ar_section)
		resolve_phrases(ar_section, tokens, stems, 'almizan_ar', id)

		resolve_footnotes(fa_section)
		refine_section(fa_section)
		resolve_phrases(fa_section, tokens, stems, 'almizan_fa', id)

		almizan_sections.append(id)
		print(ar_section.html(), file=open(files / 'almizan_ar' / id, 'w'))
		print(fa_section.html(), file=open(files / 'almizan_fa' / id, 'w'))
		print(id)

	# write meta.js
	meta = open('../js/meta.js', 'w')
	print('var quran_suras = %s;' % str([sura for sura in suras]), file=meta)
	print('var quran_pages = %s;' % str(dict(pages)), file=meta)
	print('var almizan_sections = %s;' % str(almizan_sections), file=meta)
