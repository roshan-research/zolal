
import re, codecs
from path import path

data = path('data/')


def process(text):
	expressions = [
		# fixtures
		(r'\.(.{0,10}?)\n', r'.\1</p>\n<p>'),
		(r'}\(1\)-', '}'),

		# fix quotation space
		(r'([^C{])" *([^{"\n]+?) *"(?=[^\d])', r'\1 "\2" '),

		# aya
		(r'«([^«]+?)»?(\d+-\d+:[\d-]+)»?', r'"\1"\2'),
		(r'C?\(([^\(\)]+?)(\d+-\d+:[\d-]+)([^\)]+?)\)', r'(<span class="aya" rel="\2">\1</span>\3)'),
		(r'C?[\("]([^C=\("\d-]{5,}?)[\)"]? ?[،\.-]?(\d+-\d+:[\d-]+)', r'<span class="aya" rel="\2">\1</span>'),
		(r'C([^C\("\d-]+?)["-]?(\d+-\d+:[\d-]+)', r'<span class="aya" rel="\2">\1</span>'),

		# section
		(r'\[hC\](\d+)\\(\d+)-(\d+)\[/hC\]', r'<code class="section">\1-\3:\2</code>'),
		(r'\[hC\](\d+)\\(\d+)\[/hC\]', r'<code class="section">\1-\2:\2</code>'),

		# translation
		(r'(\d+)\\(\d+)([^\\\[C\*"]{5,}?)(?=(\d+\\\d+)|\[)', r'<span class="trans" rel="\1-\2">\3</span>'),

		# address
		(r'{"(.*)"}', r'<code class="book">\1</code>'),
		(r'{\$(\d+)\$}', r'<code class="page" rel="\1"><span>\1</span></code>'),

		# heading
		(r'{a(.*)a}', r'<h2>\1</h2>'),
		(r'\[h[ABCDEFG]\]([^\[]+)\[/h[ABCDEFG]\]', r'<h3>\1</h3>'),

		# footnote
		(r'{P([\d]+)P}', r'<span class="footnote" rel="\1">\1</span>'),
		(r'{P\(([\d،و -]+)\)([^P]+)P}', r'<span class="footnote-content" rel="\1">\2</span>'),
		(r'{R([^R]+)R}', r'<span class="quote">\1</span>'),

		# refinement
		(r'\d+\\[\d\\]*\d*', ''),
		(r'[XC&#]', '')
	]

	replacements = [
		('X...X', '...'),
	]

	for key, value in replacements:
		text = text.replace(key, value)

	for key, value in expressions:
		text = re.sub(key, value, text)

	# html structure
	text += '<h3'
	text = text.replace('<code class="section">', '</div><div><code class="section">')
	text = re.sub(r'</h3>([^h]+?)(?=(<h[23])|(</div>))', r'</h3><p>\1</p>', text)
	text = text.replace('*', '</p><p>')
	text = text[:-3]

	return text

for book in ['BOK01909', 'WEB01908', 'WEB01910']:
	content = ''

	for item in sorted((data / book).walk('*.txt'), key=lambda s: int(path(s).basename()[1:-4])):
		content += process(codecs.open(item, encoding='windows-1256').read()) + '\n'

	codecs.open(data / (book + '.html'), 'w', 'utf8').write('<html><div>'+ content +'</div></html>')
