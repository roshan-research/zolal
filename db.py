"""	Create db.js file

	From simple quran text file with aya numbers.
"""
ayas = {}
db = open('data/db.js', 'w')
for line in open('data/quran-text.txt'):
	line = line.split('|')

	if len(line) == 3:
		key = '%s-%s' % (line[0], line[1])
		ayas[key] = {'sura': int(line[0]), 'aya': int(line[1]), 'text': line[2].strip().replace('ى', 'ي')}

pages, p = {}, 1
for line in open('data/quran-pages.txt'):
	line = line.strip()
	if line:
		pages[line] = p
		p += 1


def key_to_int(k):
	l = k.split('-')
	return int(l[0])*10000+int(l[1])

page = 1
print('var ayas = [', file=db)
for key in sorted(ayas.keys(), key=key_to_int):
	if key in pages:
		page = pages[key]
	ayas[key]['page'] = page

	print(ayas[key], ',', sep='', file=db)

print('];', file=db)
