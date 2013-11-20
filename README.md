Zolal
=====

## Build
Put these files in `data` folder:

+ `quran-text.txt` from [tanzil.net](), with these options: `Simple Minimal` quran text `with aya numbers` and with `rub-el-hizb`.
+ `quran-lines.txt` extracted from [madani.sqlite3.db](https://github.com/quran/quran.com-images/blob/master/data/madani.sqlite3.db?raw=true)
+ `almizan.html` from [almizan-data](https://github.com/nournia/almizan-data)

Then execute following command to fill `files` folder with `quran` and `almizan` data:

	python3 db.py

## Local Server
Start a simple server for hosting whole directory:

	python -m SimpleHTTPServer 8000

## Desktop
Use `zolal` as a standalone desktop application with [app.js](http://appjs.org), just use following command:

	node --harmony app.js

## Deployment
Update application:

	af update zolal-dev

Update files:

	cd files
	af update zolal-files
