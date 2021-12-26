
import re
from path import path

data = path('')


def process(text):

	expressions = [
		# refinement
		(r'\[t-\d+-\d+-\d+\]', ''),

		# address
		(r'{"([^}]+)"}', r'<code class="book" rel="\1"></code>'),
		(r'{\$(\d+)\$}', r'<code class="page" rel="\1"></code>'),
		(r'{AC(\d+)\\(\d+)AC}', r'<code class="aya" rel="\1_\2"></code>'),

		# aya
		(r'{a([^{]+)a}', r'<em>\1</em>'),
		(r'{HC({/B[^H]+/})HC}', r'\1'),
		(r'{/B([^Iw]+){w([\d-]+)w}{I([\d:-]+)I}([^}/]{0,2})/}', r'<span class="aya" rel="\3" data-words="\2">\1\4</span>'),
		(r'{\?([^I]+){I([\d:-]+)I}([^\?]{0,2})\?}', r'<span class="aya" rel="\2">\1\3</span>'),
		(r'class="aya" rel="(\d+):', r'class="aya" rel="\1_'),

		(r'{BC{EC(\d+)\\(\d+)EC}([^}]*)BC}', r'<span class="trans" rel="\1_\2">\3</span>'),

		# header
		(r'{J{GC(\d+)\\(\d+)-(\d+)GC}.?J}', r'</p></div><div><code class="section" rel="\1_\3-\2"></code><p>'),
		(r'{J{GC(\d+)\\(\d+)GC}.?J}', r'</p></div><div><code class="section" rel="\1_\2-\2"></code><p>'),
		(r'{J{C[ \d\(\)]*([^\(]+)[ \d\(\)]*C}J}', r'<h2 class="sura">\1</h2>'),
		(r'{J{H{C([^C]+)C}H}J}', r'<h2 class="sura">\1</h2>'),
		(r'{H([^H]+)H}', r'<span class="title">\1</span>'),
		(r'{J([^J]+)J}', r'<h3>\1</h3>&'),

		# footnote
		(r'{L([^{]+)L}', r'<span class="latin">\1</span>'),
		(r'{P([\d]+)P}', r'<span class="footnote" rel="\1">*</span>'),
		(r'{P\(([\d،و -]+)\)([^P]+)P}', r'<span class="footnote-content" rel="\1">\2</span>'),

		# hadith
		(r'{R([^R]+)R}', r'<span class="hadith">\1</span>'),
		(r'{\*([^}]+)\*}', r'<span class="from">\1</span>'),
		(r'\[', r''),
		(r'\]', r''),

		# paragraph
		(r'&([^&]+)', r'\n<p>\1</p>'),

		# others
		(r'(<h2 class="sura">[^h]+</h2>)[^p]*</p></div><div>', r'</p></div><div>\1'),
		(r'{S([^S]+)S}', r'<span class="poem">\1</span>'),
		(r'#', r' / '),
	]

	replacements = [
		('=', ' '),
		('‏\n', '\n'),
		('ك', 'ک'),
		('ي', 'ی'),
		('ى', 'ی'),
		('((', '('),
		('))', ')'),
		('‏ ', ' '),
		('‏', '‌'),

		('{^(1)-^}', ''),
		('{%', '\n'),
		('%}', ''),
		('X', ''),

		('«', ''),
		('»', ''),

		('_ص', 'ص'),
		('.\n', '.&'),
	]

	for key, value in replacements:
		text = text.replace(key, value)

	for key, value in expressions:
		text = re.sub(key, value, text)

	return text


for book, number in zip(['almizan_fa', 'almizan_ar'], [lambda s: int(path(s).basename()[3:-4]), lambda s: int(path(s).basename()[4:-4])]):

	content = ''
	for i, item in enumerate(sorted((data / book).walk('*.txt'), key=number)):
		content += process(open(item).read()).replace('class="page" rel="', 'class="page" rel="%d,' % (i+1)) + '\n'

	errors = open(data / ('errors_refine_'+ book + '.txt'), 'w')
	for line in content.split('\n'):
		if '{' in line or '}' in line:
			print(line, file=errors)
	open(data / (book + '.html'), 'w').write('<html><div>'+ content +'</div></html>')
