
import re, codecs
from path import path

data = path('data/')


def process(text):
	expressions = [
		# aya
		(r'«([^«]+?)»?(\d+-\d+:[\d-]+)»?', r'"\1"\2'),
		(r'C?[\("]([^C\("\d-]{5,}?)[\)"]?[،\.-]?(\d+-\d+:[\d-]+)', r'<span class="aya" rel="\2">\1</span>'),
		(r'C([^C\("\d-]+?)["-]?(\d+-\d+:[\d-]+)', r'<span class="aya" rel="\2">\1</span>'),

		# address
		(r'{"(.*)"}', r'<code class="book">\1</code>'),
		(r'{\$(\d+)\$}', r'<code class="page">\1</code>'),
		(r'\[hC\](\d+)\\(\d+)-(\d+)\[/hC\]', r'<code class="section">\1-\3:\2</code>'),

		# translation
		(r'(\d+)\\(\d+)([^\\\[C"]{5,}?)(?=(\d+\\\d+)|\[)', r'<li class="trans" rel="\1-\2">\3</li>'),

		# heading
		(r'{a(.*)a}', r'<h2>\1</h2>'),
		(r'\[h[ABCDEFG]\]([^\[]+)\[/h[ABCDEFG]\]', r'<h3>\1</h3>'),

		# footnote
		(r'{P([\d]+)P}', r'<span class="footnote" rel="\1"></span>'),
		(r'{P\(([\d،و -]+)\)([^P]+)P}', r'<span class="footnote-content" rel="\1">\2</span>'),
		(r'{R([^R]+)R}', r'<span class="quote">\1</span>'),

		# refinement
		(r'\d+\\[\d\\]*\d*', ''),
	]

	replacements = [
		('X...X', '...'),
		('(1)-', ''),
		('*', '<br />'),
		('&', ''),
		('ي', 'ی'),
		('ك', 'ک'),
	]

	for key, value in expressions:
		text = re.sub(key, value, text)

	for key, value in replacements:
		text = text.replace(key, value)

	return text

for book in ['BOK01909', 'WEB01908', 'WEB01910']:
	content = ''

	for item in sorted((data / book).walk('*.txt'), key=lambda s: int(path(s).basename()[1:-4])):
		content += process(codecs.open(item, encoding='windows-1256').read()) + '\n'

	codecs.open(data / (book + '.html'), 'w', 'utf8').write(content)
