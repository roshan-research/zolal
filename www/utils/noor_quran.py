
import re

quran = open('noor_quran.txt').read()

replacements = [

	# format
	(r'\Y\i\000', '\n- '),
	(r'\E\n\100 ', '\n\n'),
	(r'▒', '\n'),
	(r'\E', ''),
	('‌\n', '\n'),
	('‍', ''),  # zwj

	('*', '۞'),
	('!', '۩'),

	# alef
	('"ا', 'أَ'),
	('اa', 'ٱ'),
	('اَa', 'َٱ'),
	('اَّa', 'َّٱ'),
	('اِa', 'ِٱ'),
	('ا@', 'اَ'),
	('ا&', 'ا۟'),
	('اo', 'ا۟'),
	('اٰ', 'ٰ'),  # alef + alef maghsoore

	('#', 'ٰ'),
	('.', 'ٰ'),
	('m', 'ٓ'),  # madd
	('o', 'ْ'),
	('f', 'یٰ'),

	('ى', 'ی'),
	('ء;', 'ٔ'),
	('ءْ;', 'ْٔ'),

	# stops
	('s', 'ۖ'),
	('k', 'ۗ'),
	('j', 'ۚ'),
	('b', 'ۘ'),
	('l', 'ۙ'),
	('c', 'ۛ'),
	('$', 'ۜ'),

	('h', 'ً'),  # an
	('n', 'ٍ'),  # en
	('q', 'ٌ'),  # on

	('x', 'ًّ'),
	('y', 'ٍّ'),
	('i', 'ٌّ'),

	# seen
	('t', 'ۜ'),
	('?', 'ۣ'),

	('z', 'ٰٓ'),
	('u', 'ۢ'),

	('v', 'ۥ'),  # oo
	('w', 'ۥٓ'),  # oo + madd
	('p', 'ۦ'),  # ye
	('r', 'ۦٓ'),  # ye + madd
	('`', 'ۦَ'),  # ye + ae

	# ye - high
	('e', 'ۧ'),
	('>', 'ِّۧ'),
	('^', 'ِۧ'),

	('<', 'ۨ'),
	('[', '۫'),
	(']', '۪'),

	('مَا لِ ', 'مَالِ '),  # remove space between ma le
	('يَّیٰ', 'يَّـٰ'),  # remove ya in one specific instance

	('-', '#'),  # sura indicators
]


for key, value in replacements:
	quran = quran.replace(key, value)


# various character forms e.g. 2م -> م
quran = re.sub(r'[12]([^\d\)])', r'\1', quran)

# aya numbers spacing
quran = re.sub(r'\(([1-9]+)\)', r' (\1)', quran)

# add keshida before sepcific characters
quran = re.sub(r'([ٔۧۨ])', r'ـ\1', quran)

# remove space after hamze
quran = re.sub(r'(\n| )([ءأ])َ ', r'\1\2َ', quran)


print(quran, file=open('data/quran.txt', 'w'))
