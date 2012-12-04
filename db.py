"""	Create db.js file

	From simple quran text file with aya numbers.
"""
ayes = {}
db = open('data/db.js', 'w')
for line in open('data/quran-text.txt'):
	line = line.split('|')

	if len(line) == 3:
		key = '%s-%s' % (line[0], line[1])
		ayes[key] = {'soure': int(line[0]), 'num': int(line[1]), 'text': line[2].strip().replace('ى', 'ي')}

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
print('var ayes = [', file=db)
for key in sorted(ayes.keys(), key=key_to_int):
	if key in pages:
		page = pages[key]
	ayes[key]['page'] = page

	print(ayes[key], ',', sep='', file=db)

print('];', file=db)
