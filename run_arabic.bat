@echo off
chcp 65001
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
set PYTHONLEGACYWINDOWSSTDIO=utf-8

title منصة الفؤاد التعليمية

echo ===============================
echo   تشغيل منصة الفؤاد التعليمية
echo ===============================

python -X utf8 app.py

pause