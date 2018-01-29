#!/bin/bash

sudo npm install cordova -g

cordova create zolal ir.sobhe.zolal Zolal

cordova platforms add android

cordova plugin add cordova-plugin-splashscreen cordova-plugin-insomnia cordova-plugin-statusbar
