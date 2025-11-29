# -*- coding: utf-8 -*-
import sys
import io

# إصلاح الترميز
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

print("✅ اختبار العربية: تم بنجاح!")
print("🚀 التطبيق جاهز للتشغيل")

# اختبار الدالة المسببة للمشكلة
import os
folders = ['uploads', 'data']
for folder in folders:
    if not os.path.exists(folder):
        os.makedirs(folder)
        print(f"تم إنشاء: {folder}")