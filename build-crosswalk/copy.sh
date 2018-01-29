#!/bin/bash

cp -r ../js/ ../css/ ../fonts/ ../img/ ../*.js www/

cp ../files/quran/all www/all.gz && gzip -df www/all.gz
cp ../files/quran/fa www/fa.gz && gzip -df www/fa.gz

python -c 'print open("../index.html").read().replace("<!--", "").replace("-->", "")' > www/index.html

rm res/icon/android/*
cp ../img/logo-36.png res/icon/android/icon-36-ldpi.png
cp ../img/logo-48.png res/icon/android/icon-48-mdpi.png
cp ../img/logo-72.png res/icon/android/icon-72-hdpi.png
cp ../img/logo-96.png res/icon/android/icon-96-xhdpi.png

rm res/screen/android/*
cp ../img/splash-640.png res/screen/android/screen.png
