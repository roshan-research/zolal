# generate files: python3 files.py

gzip -9 */*
mmv "*/*.gz" "#1/#2"
s3cmd sync quran almizan_ar almizan_fa -m text/plain --add-header='Content-Encoding: gzip' s3://zolal

# first time
s3cmd put --recursive quran almizan_ar almizan_fa -m text/plain --add-header='Content-Encoding: gzip' s3://zolal
