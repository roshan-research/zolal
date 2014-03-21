
from pyquery import PyQuery as pq


def read_tafsir(tafsir):
	d = pq(tafsir.read())

	for section in d.children().children().items():
		if not len(section.text().strip()):
			continue

		yield section
