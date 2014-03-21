
from collections import defaultdict


def read_quran(quran):
	ayas, suras = {}, []

	for s, sura in enumerate(quran.read().split('# ')):
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


def read_translation(translation, ayas):
	for line in translation:
		line = line.strip().split('|')
		if len(line) != 3:
			continue

		ayas['%s_%s' % (line[0], line[1])]['trans'] = line[2]


def read_lines(lines, ayas):
	for line in lines:
		line = line.split(', ')
		if len(line) < 2:
			continue

		id = '%s_%s' % (line[2], line[3])
		if id in ayas:
			ayas[id]['page'] = int(line[0])

	aya_ids = sorted(ayas.keys(), key=lambda id: int(id.split('_')[0])*1000+int(id.split('_')[1]))

	page = 1
	for id in aya_ids:
		if not 'page' in ayas[id]:
			ayas[id]['page'] = page
		else:
			page = ayas[id]['page']

	pages = defaultdict(list)
	for id in aya_ids:
		pages[ayas[id]['page']].append(id)

	return pages
