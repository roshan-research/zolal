
import re, json
from pyquery import PyQuery as pq
from path import path

files = path('../files')
almizan = open('data/WEB01910.html').read()
d = pq(almizan)


def refine(text):
	if not text:
		return ''

	result = re.sub(r'[\n ]+', r' ', text)  # spaces
	result = result.replace('ك', 'ک').replace('ي', 'ی').replace('‏ ', ' ').replace('‏', '‌')  # chracters

	# punctuations
	result = re.sub(r'([،\):؟])(?=[^ \.\d])', r'\1 ', result)
	result = re.sub(r'(?=[^ ])([\(])', r' \1', result)

	return result

almizan_sections = []
for section in d.children().children():
	section = pq(section)

	for item in section.children():
		item = pq(item)
		item.html(refine(item.html()))

	key = section('code.section').text()
	if not key: key = '0'
	almizan_sections.append(key)
	print(section.html(), file=open(files / 'almizan' / key.replace('-', '_').replace(':', '-'), 'w'))


d.root.write('data/almizan.html', encoding='utf-8')
