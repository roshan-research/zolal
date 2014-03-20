
import json
from collections import defaultdict
from path import path
files = path('../files')


def read_quran(quran):
	ayas, suras = {}, []

	for s, sura in enumerate(quran.split('# ')):
		lines = sura.split('\n')
		if len(lines) < 5:
			continue

		name = lines[0]
		suras.append(name[5:])

		for aya in lines[2:-2]:
			parts = aya.split('(')
			if len(parts) != 2:
				continue

			a = int(parts[1][:-1])
			aya = parts[0].strip()
			id = '%d_%d' % (s, a)
			ayas[id] = {'id': id, 'sura': s, 'aya': a, 'text': aya}

	return ayas, suras


if __name__ == '__main__':

	ayas, suras = read_quran(open('data/quran.txt').read())


	# translation
	for line in open('data/quran-translation.txt'):
		line = line.strip().split('|')
		if len(line) != 3:
			continue

		ayas['%s_%s' % (line[0], line[1])]['trans'] = line[2]


	# pages
	for line in open('data/quran-lines.txt'):
		line = line.split(', ')
		if len(line) < 2:
			continue

		id = '%s_%s' % (line[2], line[3])
		if id in ayas:
			ayas[id]['page'] = int(line[0])

	page = 1
	for id in sorted(ayas.keys(), key=lambda id: int(id.split('_')[0])*1000+int(id.split('_')[1])):
		if not 'page' in ayas[id]:
			ayas[id]['page'] = page
		else:
			page = ayas[id]['page']

	pages = defaultdict(list)
	for id, aya in ayas.items():
		pages[aya['page']].append(id)


	# write pages
	for page, ids in pages.items():
		page_file = open(files / 'quran' / ('p%d' % page), 'w')
		for id in ids:
			print(json.dumps(ayas[id], ensure_ascii=False), file=page_file)


	# write meta.js
	meta = open('../js/meta.js', 'w')
	print('var quran_suras = %s;' % str([sura for sura in suras]), file=meta)
	print('var quran_pages = %s;' % str(dict(pages)), file=meta)
