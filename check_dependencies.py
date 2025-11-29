# -*- coding: utf-8 -*-
import sys
import subprocess

print("🔍 فحص المكتبات المطلوبة...")

required_packages = [
    'flask', 'werkzeug', 'jinja2', 
    'pandas', 'numpy', 'pillow'
]

missing = []
for package in required_packages:
    try:
        __import__(package)
        print(f"✅ {package}")
    except ImportError:
        missing.append(package)
        print(f"❌ {package}")

if missing:
    print(f"\n📦 المكتبات الناقصة: {missing}")
    print("جاري التثبيت...")
    for package in missing:
        subprocess.run([sys.executable, "-m", "pip", "install", package])
else:
    print("\n🎉 جميع المكتبات مثبتة!")