
import os, zipfile, json
from fabric.api import local

def make_apps():
	info = json.load(open('manifest.json'))

	archive = zipfile.ZipFile('zolal_firefox_%s.zip' % info['version'], 'w', zipfile.ZIP_DEFLATED)
	local('cp ../../zolal.js .')
	local(r'sed -i "/hosted_mode/ d" zolal.js ')
	archive.write('zolal.js')
	archive.write('manifest.webapp')

	os.chdir('../../')
	for directory in ['css/', 'font/', 'img/', 'js/']:
		for root, dirs, files in os.walk(directory):
			for file in files:
				archive.write(os.path.join(root, file))

	archive.write('index.html')
	archive.close()

if __name__ == '__main__':
	make_apps()
