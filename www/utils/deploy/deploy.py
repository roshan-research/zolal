
import os, zipfile, json
from fabric.api import local


def add_files(archive):
	local('cp ../../zolal.js .')
	local(r'sed -i "/hosted_mode/ d" zolal.js ')
	archive.write('zolal.js')

	path = os.getcwd()
	os.chdir('../../')
	for directory in ['css/', 'font/', 'img/', 'js/']:
		for root, dirs, files in os.walk(directory):
			for file in files:
				archive.write(os.path.join(root, file))
	archive.write('index.html')
	os.chdir(path)


def make_apps():
	info = json.load(open('manifest.json'))

	with zipfile.ZipFile('zolal_chrome_%s.zip' % info['version'], 'w', zipfile.ZIP_DEFLATED) as archive:
		archive.write('manifest.json')
		archive.write('logo.png')

	with zipfile.ZipFile('zolal_firefox_%s.zip' % info['version'], 'w', zipfile.ZIP_DEFLATED) as archive:
		archive.write('manifest.webapp')
		add_files(archive)


if __name__ == '__main__':
	make_apps()
