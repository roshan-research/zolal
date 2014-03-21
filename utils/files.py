
import json
from path import path
from quran import read_quran, read_translation, read_lines
from almizan import read_tafsir


data = path('data')
files = path('../files')


if __name__ == '__main__':

	# read quran data
	ayas, suras = read_quran(open(data / 'quran.txt'))
	read_translation(open(data / 'quran-translation.txt'), ayas)
	pages = read_lines(open(data / 'quran-lines.txt'), ayas)

	# write quran pages
	for page, ids in pages.items():
		page_file = open(files / 'quran' / ('p%d' % page), 'w')
		for id in ids:
			print(json.dumps(ayas[id], ensure_ascii=False), file=page_file)

	# almizan
	almizan_sections = []
	for ar_section, fa_section in zip(read_tafsir(open(data / 'almizan_ar.html')), read_tafsir(open(data / 'almizan_fa.html'))):

		# read section id
		id = ar_section.find('code.section').attr('rel')
		if id != fa_section.find('code.section').attr('rel'):
			print('error', id)
		if not id: id = '0'
		almizan_sections.append(id)

		print(ar_section.html(), file=open(files / 'almizan_ar' / id, 'w'))
		print(fa_section.html(), file=open(files / 'almizan_fa' / id, 'w'))

	# write meta.js
	meta = open('../js/meta.js', 'w')
	print('var quran_suras = %s;' % str([sura for sura in suras]), file=meta)
	print('var quran_pages = %s;' % str(dict(pages)), file=meta)
	print('var almizan_sections = %s;' % str(almizan_sections), file=meta)
