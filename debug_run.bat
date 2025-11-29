@echo off
chcp 65001
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1

title تصحيح منصة الفؤاد

echo ===============================
echo   وضع تصحيح الأخطاء
echo ===============================

echo 1. فحص المكتبات...
python -c "import flask, werkzeug, jinja2; print('✅ المكتبات الأساسية جاهزة')"

echo.
echo 2. فحص المجلدات...
if not exist templates mkdir templates
if not exist static mkdir static
if not exist uploads mkdir uploads
if not exist data mkdir data

echo.
echo 3. إنشاء قالب اختباري...
if not exist templates\test.html (
    echo ^<!DOCTYPE html^> > templates\test.html
    echo ^<html^> >> templates\test.html
    echo ^<head^>^<meta charset="UTF-8"^>^<title^>اختبار^</title^>^</head^> >> templates\test.html
    echo ^<body^>^<h1^>✅ التطبيق شغال!^</h1^>^</body^>^</html^> >> templates\test.html
)

echo.
echo 4. تشغيل التطبيق...
python app.py

echo.
echo ❌ التطبيق توقف!
pause