#!/bin/bash

./copy.sh

export ANDROID_HOME=/home/nournia/Softwares/Android/sdk/

cordova build --release android

cp platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk Zolal-unsigned.apk

jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore sobhe.jks Zolal-unsigned.apk sobhekey
rm Zolal.apk
zipalign -v 4 Zolal-unsigned.apk Zolal.apk
rm Zolal-unsigned.apk
