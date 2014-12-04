
import re
from collections import defaultdict

aya_int = lambda id: int(id.split('_')[0])*1000+int(id.split('_')[1])


def read_quran(quran):
	ayas, suras = {}, []

	for s, sura in enumerate(quran.read().split('# ')):
		lines = sura.split('\n')
		if len(lines) < 5:
			continue

		name = lines[0]
		suras.append(name[5:].replace('ي', 'ی'))

		for aya in lines[2:-2]:
			parts = aya.split('(')
			if len(parts) != 2:
				continue

			a = int(parts[1][:-1])
			aya = parts[0].strip().replace('۞ ', '')
			id = '%d_%d' % (s, a)
			ayas[id] = {'id': id, 'sura': s, 'aya': a, 'text': aya}

	return ayas, suras


def read_simple(simple, ayas):
	for line in simple:
		line = line.strip().split('|')
		if len(line) != 3 or line[1] == '0':
			continue

		# refine text
		text = line[2].replace('ى', 'ی')
		text = re.sub(r'(^| )أ ', r'\1أ', text)

		ayas['%s_%s' % (line[0], line[1])]['raw'] = text


def read_lines(lines, ayas):
	for line in lines:
		line = line.split(', ')
		if len(line) < 2:
			continue

		id = '%s_%s' % (line[2], line[3])
		if id in ayas:
			ayas[id]['page'] = int(line[0])

	aya_ids = sorted(ayas.keys(), key=aya_int)

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


def simple_aya(aya):
	aya = re.sub('[' + '۩ۣۜۖۗۚۛۙۘۢ' + 'ًٌٍَُِّْٓ' + 'ـ‌ٰۥۦ' + ']', '', aya)
	aya = aya.replace('ي', 'ی').replace('ك', 'ک').replace('ٱ', 'ا').replace('ٔ', 'ئ').replace('یٰ', 'ا').replace('ۧ','ی').replace('ۨ','ن')
	return aya
