@echo off
chcp 65001
echo ===============================
echo   إصلاح مشاكل Python
echo ===============================

echo 1. تحديث pip...
python -m pip install --upgrade pip

echo.
echo 2. تثبيت setuptools...
python -m pip install --force-reinstall setuptools wheel

echo.
echo 3. تثبيت Flask بدون عزل...
pip install flask --no-build-isolation

echo.
echo 4. تثبيت المكتبات الأساسية...
pip install werkzeug requests pillow --no-build-isolation

echo.
echo ✅ تم الانتهاء!
echo.
pause