
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
	result = re.sub(r'([،\):؟])(?=[^ \.\d،])', r'\1 ', result)
	result = re.sub(r'(?=[^ ])([\(])', r' \1', result)

	return result


def refineNote(text):
	result = text
	if result.startswith('-'):
		result = result[1:]
	return result.strip()


almizan_sections = []
for section in d.children().children():
	section = pq(section)

	# footnote replacement
	for footnote in section.find('.footnote'):
		footnote = pq(footnote)
		content = section.find('.footnote-content[rel="%s"]' % footnote.attr('rel'))
		if content:
			content = pq(content[0])
			footnote.attr('title', refineNote(content.html()))
			content.remove()

	for footnote in section.find('.footnote-content'):
		footnote = pq(footnote)
		for rel in re.split(' +', re.sub(r'[^ \d]', ' ', footnote.attr('rel'))):
			ref = section.find('.footnote:not([title])[rel="%s"]' % rel)
			pq(ref[0]).attr('title', refineNote(footnote.html()))
			# todo check ambigous multiple footnotes

		footnote.remove()

	# refinement
	for item in section.children():
		item = pq(item)
		item.html(refine(item.html()))

	key = section('code.section').text()
	if not key: key = '0'
	almizan_sections.append(key)
	print(section.html(), file=open(files / 'almizan' / key.replace('-', '_').replace(':', '-'), 'w'))


d.root.write('data/almizan.html', encoding='utf-8')
