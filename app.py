from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, session, flash
import os
import json
import uuid
from werkzeug.utils import secure_filename
from datetime import datetime
import random
import string
import re
# -*- coding: utf-8 -*-
import sys
import io

# إصلاح ترميز الأحرف العربية
if sys.stdout.encoding != 'UTF-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

if sys.stderr.encoding != 'UTF-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

app = Flask(__name__)
app.secret_key = 'منصة_الفؤاد_التعليمية_2024_محمد_فواد'

# ⭐⭐⭐ إزالة الحد الأقصى لحجم الملف ⭐⭐⭐
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024 * 1024  # 100GB (فعلياً لا حدود)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['VIDEO_FOLDER'] = 'uploads/videos'
app.config['THUMBNAIL_FOLDER'] = 'uploads/thumbnails'

# إعدادات إضافية لتحسين الأداء
app.config['JSON_AS_ASCII'] = False
app.config['TEMPLATES_AUTO_RELOAD'] = True

# إنشاء المجلدات إذا لم تكن موجودة
def create_upload_folders():
    """إنشاء المجلدات المطلوبة للتخزين"""
    folders = [
        'uploads',
        'uploads/videos', 
        'uploads/thumbnails',
        'static/thumbnails',
        'data',
        'static/videos'
    ]
    
    for folder in folders:
        if not os.path.exists(folder):
            os.makedirs(folder)
            safe_print(f"تم إنشاء المجلد: {folder}")

def safe_print(text):
    """طباعة آمنة للنصوص العربية"""
    try:
        print(text)
    except UnicodeEncodeError:
        # تحويل إلى إنجليزية عند الخطأ
        if "تم إنشاء المجلد" in text:
            print(f"Created folder: {text.split(': ')[1]}")
        elif "منصة الفؤاد" in text:
            print("Al-Fouad Educational Platform")
        else:
            print(text.encode('utf-8', errors='replace').decode('utf-8'))

create_upload_folders()

# ملفات البيانات
DATA_FOLDER = 'data'
STUDENTS_FILE = os.path.join(DATA_FOLDER, 'students.json')
VIDEOS_FILE = os.path.join(DATA_FOLDER, 'videos.json')
PURCHASED_COURSES_FILE = os.path.join(DATA_FOLDER, 'purchased_courses.json')
USED_CODES_FILE = os.path.join(DATA_FOLDER, 'used_codes.json')
VIDEO_CODES_FILE = os.path.join(DATA_FOLDER, 'video_codes.json')
STUDENT_STATS_FILE = os.path.join(DATA_FOLDER, 'student_stats.json')
STUDENT_POINTS_FILE = os.path.join(DATA_FOLDER, 'student_points.json')
VIDEO_WATCH_COUNT_FILE = os.path.join(DATA_FOLDER, 'video_watch_count.json')
POINTS_HISTORY_FILE = os.path.join(DATA_FOLDER, 'points_history.json')

def initialize_data():
    """تهيئة ملفات البيانات إذا لم تكن موجودة"""
    if not os.path.exists(DATA_FOLDER):
        os.makedirs(DATA_FOLDER)
    
    # بيانات الطلاب الافتراضية
    default_students = [
        {
            "name": "أحمد محمد",
            "phone": "0123456789",
            "parentPhone": "0112345678",
            "grade": "ثانية ثانوي",
            "educationType": "سنتر",
            "password": "123456",
            "status": "active"
        }
    ]
    
    # بيانات الفيديوهات الافتراضية
    default_videos = [
        {
            "id": "1",
            "title": "النحو - المبتدأ والخبر",
            "description": "شرح درس المبتدأ والخبر في النحو العربي بشكل مفصل",
            "grade": "ثانية ثانوي",
            "fileName": "video1.mp4",
            "thumbnail": "/static/images/default-thumbnail.jpg",
            "uploadDate": "2024-01-15",
            "views": 0,
            "serverId": 1
        },
        {
            "id": "2",
            "title": "الأدب - العصر الجاهلي",
            "description": "شرح الأدب في العصر الجاهلي وأهم خصائصه",
            "grade": "أولى ثانوي",
            "fileName": "video2.mp4",
            "thumbnail": "/static/images/default-thumbnail.jpg",
            "uploadDate": "2024-01-10",
            "views": 0,
            "serverId": 1
        }
    ]
    
    files_data = {
        STUDENTS_FILE: default_students,
        VIDEOS_FILE: default_videos,
        PURCHASED_COURSES_FILE: {},
        USED_CODES_FILE: {},
        VIDEO_CODES_FILE: {},
        STUDENT_STATS_FILE: {},
        STUDENT_POINTS_FILE: {},
        VIDEO_WATCH_COUNT_FILE: {},
        POINTS_HISTORY_FILE: {}
    }
    
    for file_name, default_data in files_data.items():
        if not os.path.exists(file_name):
            with open(file_name, 'w', encoding='utf-8') as f:
                json.dump(default_data, f, ensure_ascii=False, indent=2)

def load_data(file_name):
    """تحميل البيانات من ملف JSON"""
    try:
        with open(file_name, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save_data(file_name, data):
    """حفظ البيانات إلى ملف JSON"""
    with open(file_name, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# المسارات المسموح بها
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'}
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif'}

def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def extract_episode_number(title):
    """استخراج رقم الحلقة من عنوان الفيديو"""
    try:
        # البحث عن نمط "الحلقة رقم" أو "الجزء رقم"
        patterns = [
            r'الحلقة\s*(\d+)',
            r'الجزء\s*(\d+)', 
            r'episode\s*(\d+)',
            r'part\s*(\d+)',
            r'(\d+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title, re.IGNORECASE)
            if match:
                return int(match.group(1))
        
        # إذا لم يوجد، نأخذ أول رقم في العنوان
        numbers = re.findall(r'\d+', title)
        if numbers:
            return int(numbers[0])
            
        return 1  # قيمة افتراضية
    except:
        return 1

def generate_custom_code(episode, grade):
    """توليد كود حسب المواصفات: EP05-1sc-A7B3"""
    # تحويل الصف إلى التنسيق المطلوب
    grade_mapping = {
        'أولى ثانوي': '1sc',
        'ثانية ثانوي': '2sc', 
        'تالتة ثانوي': '3sc'
    }
    
    grade_code = grade_mapping.get(grade, '1sc')
    
    # جزء الحلقة
    ep_part = f"EP{episode:02d}"  # EP01, EP05, etc
    
    # جزء عشوائي (3-6 أحرف/أرقام)
    suffix_length = random.randint(3, 6)
    characters = string.ascii_uppercase + string.digits
    random_part = ''.join(random.choices(characters, k=suffix_length))
    
    # تجميع الكود النهائي
    code = f"{ep_part}-{grade_code}-{random_part}"
    
    print(f"✅ تم توليد الكود: {code} للصف: {grade} (الحلقة: {episode})")
    return code

def find_code_in_other_videos(code, current_video_id, video_codes):
    """البحث عن الكود في الفيديوهات الأخرى"""
    videos_data = load_data(VIDEOS_FILE)
    
    for video_id, codes_list in video_codes.items():
        if video_id != current_video_id:  # نتجاهل الفيديو الحالي
            for code_item in codes_list:
                if code_item['code'] == code:
                    # إيجاد معلومات الفيديو
                    video_info = next((v for v in videos_data if v['id'] == video_id), None)
                    if video_info:
                        return {
                            'title': video_info['title'],
                            'grade': video_info['grade']
                        }
    return None

def cleanup_orphaned_files():
    """تنظيف الملفات الميتة (الفيديوهات والصور المصغرة بدون بيانات)"""
    try:
        videos = load_data(VIDEOS_FILE)
        video_files_in_db = set()
        thumbnail_files_in_db = set()
        
        # جمع جميع الملفات المستخدمة في قاعدة البيانات
        for video in videos:
            video_files_in_db.add(f"{video['id']}_{video['fileName']}")
            
            thumbnail_path = video.get('thumbnail', '')
            if thumbnail_path.startswith('/uploads/thumbnails/'):
                thumbnail_files_in_db.add(os.path.basename(thumbnail_path))
            elif thumbnail_path.startswith('/static/thumbnails/'):
                thumbnail_files_in_db.add(os.path.basename(thumbnail_path))
        
        # حذف الفيديوهات الميتة
        if os.path.exists(app.config['VIDEO_FOLDER']):
            for filename in os.listdir(app.config['VIDEO_FOLDER']):
                if filename not in video_files_in_db:
                    file_path = os.path.join(app.config['VIDEO_FOLDER'], filename)
                    os.remove(file_path)
                    print(f"🧹 تم حذف فيديو ميت: {filename}")
        
        # حذف الصور المصغرة الميتة
        if os.path.exists(app.config['THUMBNAIL_FOLDER']):
            for filename in os.listdir(app.config['THUMBNAIL_FOLDER']):
                if filename not in thumbnail_files_in_db:
                    file_path = os.path.join(app.config['THUMBNAIL_FOLDER'], filename)
                    os.remove(file_path)
                    print(f"🧹 تم حذف صورة مصغرة ميتة: {filename}")
        
        # حذف من مجلد static أيضاً
        static_thumb_path = os.path.join('static', 'thumbnails')
        if os.path.exists(static_thumb_path):
            for filename in os.listdir(static_thumb_path):
                if filename not in thumbnail_files_in_db:
                    file_path = os.path.join(static_thumb_path, filename)
                    os.remove(file_path)
                    print(f"🧹 تم حذف صورة مصغرة ميتة من static: {filename}")
                    
    except Exception as e:
        print(f"❌ Error in cleanup: {e}")

# ========== Routes ==========

@app.route('/')
def index():
    """الصفحة الرئيسية - تسجيل الدخول"""
    if 'user_type' in session:
        if session['user_type'] == 'student':
            return redirect(url_for('student_dashboard'))
        else:
            return redirect(url_for('teacher_dashboard'))
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    """معالجة تسجيل الدخول"""
    phone = request.form.get('phone')
    password = request.form.get('password')
    remember_me = request.form.get('remember_me')
    
    students = load_data(STUDENTS_FILE)
    
    # تحقق من بيانات المعلم
    if phone == '01234567891' and password == '01234567891':
        session['user_type'] = 'teacher'
        session['user_name'] = 'الأستاذ محمد فواد'
        session['user_phone'] = phone
        return redirect(url_for('teacher_dashboard'))
    
    # تحقق من بيانات الطالب
    for student in students:
        if student['phone'] == phone and student['password'] == password:
            if student['status'] == 'banned':
                flash('حسابك محظور، يرجى التواصل مع الإدارة', 'error')
                return redirect(url_for('index'))
            
            session['user_type'] = 'student'
            session['user_name'] = student['name']
            session['user_phone'] = student['phone']
            session['user_grade'] = student['grade']
            session['user_education_type'] = student['educationType']
            return redirect(url_for('student_dashboard'))
    
    flash('رقم الهاتف أو كلمة المرور غير صحيحة', 'error')
    return redirect(url_for('index'))

@app.route('/register', methods=['POST'])
def register():
    """إنشاء حساب جديد"""
    name = request.form.get('name')
    phone = request.form.get('phone')
    parent_phone = request.form.get('parent_phone')
    grade = request.form.get('grade')
    education_type = request.form.get('education_type')
    password = request.form.get('password')
    confirm_password = request.form.get('confirm_password')
    
    students = load_data(STUDENTS_FILE)
    student_points = load_data(STUDENT_POINTS_FILE)
    
    # التحقق من البيانات
    if not all([name, phone, parent_phone, password, confirm_password]):
        flash('يرجى ملء جميع الحقول المطلوبة', 'error')
        return redirect(url_for('index'))
    
    if password != confirm_password:
        flash('كلمتا المرور غير متطابقتين', 'error')
        return redirect(url_for('index'))
    
    if len(password) < 6:
        flash('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error')
        return redirect(url_for('index'))
    
    # التحقق من عدم وجود رقم هاتف مكرر
    if any(student['phone'] == phone for student in students):
        flash('رقم الهاتف مسجل مسبقاً', 'error')
        return redirect(url_for('index'))
    
    # إضافة الطالب الجديد
    new_student = {
        'name': name,
        'phone': phone,
        'parentPhone': parent_phone,
        'grade': grade,
        'educationType': education_type,
        'password': password,
        'status': 'active'
    }
    
    students.append(new_student)
    save_data(STUDENTS_FILE, students)
    
    # إضافة نقاط للطالب الجديد
    student_points[phone] = 0
    save_data(STUDENT_POINTS_FILE, student_points)
    
    flash('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول', 'success')
    return redirect(url_for('index'))

@app.route('/student/dashboard')
def student_dashboard():
    """لوحة تحكم الطالب"""
    if 'user_type' not in session or session['user_type'] != 'student':
        return redirect(url_for('index'))
    
    student_stats = load_data(STUDENT_STATS_FILE)
    student_points = load_data(STUDENT_POINTS_FILE)
    purchased_courses = load_data(PURCHASED_COURSES_FILE)
    
    stats = student_stats.get(session['user_phone'], {
        'totalVideosWatched': 0,
        'totalWatchTime': 0,
        'purchasedCourses': 0,
        'lastWatched': None,
        'watchedVideos': []
    })
    
    points = student_points.get(session['user_phone'], 0)
    purchased_count = len(purchased_courses.get(session['user_phone'], []))
    
    return render_template('student_dashboard.html', 
                         user=session,
                         stats=stats,
                         points=points,
                         purchased_count=purchased_count)

@app.route('/teacher/dashboard')
def teacher_dashboard():
    """لوحة تحكم المعلم"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return redirect(url_for('index'))
    
    students = load_data(STUDENTS_FILE)
    videos = load_data(VIDEOS_FILE)
    
    return render_template('teacher_dashboard.html',
                         user=session,
                         total_students=len(students),
                         total_videos=len(videos))

@app.route('/logout')
def logout():
    """تسجيل الخروج"""
    session.clear()
    return redirect(url_for('index'))

@app.route('/video/player/<video_id>')
def video_player_page(video_id):
    """صفحة تشغيل الفيديو المنفصلة"""
    if 'user_type' not in session:
        return redirect(url_for('index'))
    
    videos = load_data(VIDEOS_FILE)
    video = next((v for v in videos if v['id'] == video_id), None)
    
    if not video:
        flash('الفيديو غير موجود', 'error')
        return redirect(url_for('student_dashboard' if session['user_type'] == 'student' else 'teacher_dashboard'))
    
    return render_template('video_player.html', video=video)

@app.route('/watch/<video_id>')
def watch_video(video_id):
    """صفحة مشاهدة الفيديو مع فورم إدخال الكود"""
    if 'user_type' not in session or session['user_type'] != 'student':
        return redirect(url_for('index'))
    
    videos = load_data(VIDEOS_FILE)
    video = next((v for v in videos if v['id'] == video_id), None)
    
    if not video:
        flash('الفيديو غير موجود', 'error')
        return redirect(url_for('student_dashboard'))
    
    # التحقق إذا كان الفيديو مشترى مسبقاً
    purchased_courses = load_data(PURCHASED_COURSES_FILE)
    student_courses = purchased_courses.get(session['user_phone'], [])
    is_purchased = any(course['videoId'] == video_id for course in student_courses)
    
    return render_template('watch_video.html', 
                         video=video, 
                         is_purchased=is_purchased,
                         user=session)

@app.route('/watch/<video_id>/verify', methods=['POST'])
def verify_video_code(video_id):
    """التحقق من كود الفيديو"""
    if 'user_type' not in session or session['user_type'] != 'student':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    code = request.form.get('code_input', '').strip()
    student_phone = session['user_phone']
    
    if not code:
        flash('يرجى إدخال الكود', 'error')
        return redirect(url_for('watch_video', video_id=video_id))
    
    # استخدام نظام التحقق الجديد
    result = api_use_code_internal(code, video_id, student_phone)
    
    if result['success']:
        flash(result['message'], 'success')
    else:
        flash(result['message'], 'error')
    
    return redirect(url_for('watch_video', video_id=video_id))

def api_use_code_internal(code, current_video_id, student_phone):
    """نسخة داخلية من دالة استخدام الكود"""
    print(f"🎯 التحقق من الكود: '{code}' للفيديو: '{current_video_id}'")
    
    video_codes = load_data(VIDEO_CODES_FILE)
    purchased_courses = load_data(PURCHASED_COURSES_FILE)
    used_codes = load_data(USED_CODES_FILE)
    
    # ⭐ التحقق: هل الطالب استخدم هذا الكود من قبل؟
    if code in used_codes:
        used_data = used_codes[code]
        if used_data.get('studentPhone') == student_phone:
            return {'success': False, 'message': '❌ هذا الكود مستخدم مسبقاً ولا يمكن استخدامه مرة أخرى'}
    
    # التحقق من وجود أكواد للفيديو الحالي
    if current_video_id not in video_codes:
        return {'success': False, 'message': 'لا توجد أكواد لهذا الفيديو'}
    
    # البحث في أكواد الفيديو الحالي فقط
    code_found = False
    code_data = None
    code_index = -1
    
    for index, code_item in enumerate(video_codes[current_video_id]):
        if code_item['code'] == code:
            # ⭐ التحقق من عدد مرات الاستخدام
            if code_item['used']:
                return {'success': False, 'message': '❌ هذا الكود مستخدم مسبقاً'}
            
            if code_item.get('used_count', 0) >= code_item.get('max_uses', 1):
                return {'success': False, 'message': '❌ تم تجاوز عدد مرات الاستخدام المسموح بها'}
            
            code_found = True
            code_data = code_item
            code_index = index
            break
    
    # لو الكود مش موجود في الفيديو الحالي
    if not code_found:
        other_video_info = find_code_in_other_videos(code, current_video_id, video_codes)
        
        if other_video_info:
            return {
                'success': False, 
                'message': f'❌ هذا الكود مخصص للفيديو: {other_video_info["title"]} ({other_video_info["grade"]}). يرجى استخدامه في مكانه الصحيح'
            }
        else:
            return {'success': False, 'message': '❌ الكود غير صالح لهذا الفيديو'}
    
    # ⭐⭐ نجاح - تحديث حالة الكود لمرة واحدة
    print(f"✅ الكود صالح - تفعيل الفيديو: {current_video_id}")
    
    # تحديث حالة الكود
    video_codes[current_video_id][code_index]['used'] = True
    video_codes[current_video_id][code_index]['used_by'] = student_phone
    video_codes[current_video_id][code_index]['used_date'] = datetime.now().isoformat()
    video_codes[current_video_id][code_index]['used_count'] = 1
    
    # تسجيل الكود كمستخدم
    used_codes[code] = {
        'studentPhone': student_phone,
        'videoId': current_video_id,
        'usedDate': datetime.now().isoformat(),
        'video_title': code_data.get('video_title', '')
    }
    
    # إضافة الفيديو للمشتريات
    if student_phone not in purchased_courses:
        purchased_courses[student_phone] = []
    
    if not any(course['videoId'] == current_video_id for course in purchased_courses[student_phone]):
        purchased_courses[student_phone].append({
            'videoId': current_video_id,
            'purchaseDate': datetime.now().strftime('%Y-%m-%d'),
            'used_code': code,
            'video_title': code_data.get('video_title', ''),
            'access_type': 'one_time_code'  # ⭐ نوع الوصول
        })
    
    # حفظ التغييرات
    save_data(VIDEO_CODES_FILE, video_codes)
    save_data(PURCHASED_COURSES_FILE, purchased_courses)
    save_data(USED_CODES_FILE, used_codes)
    
    return {
        'success': True,
        'message': f'✅ تم تفعيل الكود بنجاح! يمكنك الآن مشاهدة الفيديو',
        'video_id': current_video_id,
        'one_time_use': True  # ⭐ تأكيد أن الكود لمرة واحدة
    }

# ========== API Routes ==========

@app.route('/api/videos')
def api_get_videos():
    """الحصول على قائمة الفيديوهات"""
    videos = load_data(VIDEOS_FILE)
    return jsonify(videos)

@app.route('/api/student/available-videos')
def api_get_available_videos():
    """الحصول على الفيديوهات المتاحة للطالب"""
    try:
        if 'user_type' not in session or session['user_type'] != 'student':
            return jsonify({'success': False, 'message': 'غير مصرح'})
        
        student_phone = session['user_phone']
        purchased_courses = load_data(PURCHASED_COURSES_FILE)
        videos = load_data(VIDEOS_FILE)
        
        print(f"🔍 جلب فيديوهات للطالب: {student_phone}")
        print(f"📊 عدد الفيديوهات الإجمالي: {len(videos)}")
        
        # الفيديوهات المشتراة من قبل الطالب
        student_purchased = purchased_courses.get(student_phone, [])
        purchased_video_ids = [course['videoId'] for course in student_purchased]
        
        print(f"🛒 عدد الفيديوهات المشتراة: {len(purchased_video_ids)}")
        
        # إضافة علامة إذا كان الفيديو مشترى
        available_videos = []
        for video in videos:
            video_data = video.copy()
            video_data['is_purchased'] = video['id'] in purchased_video_ids
            available_videos.append(video_data)
        
        return jsonify({
            'success': True,
            'videos': available_videos,
            'purchased_count': len(purchased_video_ids)
        })
        
    except Exception as e:
        print(f"❌ خطأ في جلب الفيديوهات المتاحة: {e}")
        return jsonify({
            'success': False,
            'message': f'حدث خطأ في تحميل الفيديوهات: {str(e)}',
            'videos': []
        })

@app.route('/api/student/purchased-courses')
def api_get_purchased_courses():
    """الحصول على الكورسات المشتراة للطالب"""
    try:
        if 'user_type' not in session or session['user_type'] != 'student':
            return jsonify({'success': False, 'message': 'غير مصرح'})
        
        purchased_courses = load_data(PURCHASED_COURSES_FILE)
        student_courses = purchased_courses.get(session['user_phone'], [])
        
        print(f"🛒 جلب الكورسات المشتراة للطالب: {session['user_phone']}")
        print(f"✅ عدد الكورسات المشتراة: {len(student_courses)}")
        
        return jsonify({
            'success': True,
            'courses': student_courses
        })
        
    except Exception as e:
        print(f"❌ خطأ في جلب الكورسات المشتراة: {e}")
        return jsonify({
            'success': False,
            'message': f'حدث خطأ في تحميل الكورسات المشتراة: {str(e)}',
            'courses': []
        })

@app.route('/api/student/stats')
def api_get_student_stats():
    """الحصول على إحصائيات الطالب"""
    try:
        if 'user_type' not in session or session['user_type'] != 'student':
            return jsonify({'success': False, 'message': 'غير مصرح'})
        
        student_stats = load_data(STUDENT_STATS_FILE)
        student_points = load_data(STUDENT_POINTS_FILE)
        purchased_courses = load_data(PURCHASED_COURSES_FILE)
        
        stats = student_stats.get(session['user_phone'], {
            'totalVideosWatched': 0,
            'totalWatchTime': 0,
            'purchasedCourses': 0,
            'lastWatched': None,
            'watchedVideos': [],
            'totalPoints': 0
        })
        
        points = student_points.get(session['user_phone'], 0)
        purchased_count = len(purchased_courses.get(session['user_phone'], []))
        
        print(f"📊 إحصائيات الطالب: {session['user_phone']}")
        print(f"🎯 النقاط: {points}, الكورسات المشتراة: {purchased_count}")
        
        return jsonify({
            'success': True,
            'stats': stats,
            'points': points,
            'purchased_count': purchased_count
        })
        
    except Exception as e:
        print(f"❌ خطأ في إحصائيات الطالب: {e}")
        return jsonify({
            'success': False,
            'message': 'خطأ في الخادم',
            'stats': {},
            'points': 0,
            'purchased_count': 0
        })

@app.route('/api/videos/upload', methods=['POST'])
def api_upload_video():
    """رفع فيديو جديد - بدون حدود حجم"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    try:
        # التحقق من وجود الملف
        if 'video' not in request.files:
            return jsonify({'success': False, 'message': 'لم يتم اختيار ملف فيديو'})
        
        video_file = request.files['video']
        thumbnail_file = request.files.get('thumbnail')
        
        # التحقق من اسم الملف
        if video_file.filename == '':
            return jsonify({'success': False, 'message': 'لم يتم اختيار ملف فيديو'})
        
        # ⭐⭐⭐ إزالة التحقق من حجم الملف ⭐⭐⭐
        video_file.seek(0, 2)  # اذهب لنهاية الملف
        file_size = video_file.tell()  # احصل على الحجم
        video_file.seek(0)  # ارجع لبداية الملف
        
        # الحصول على البيانات من النموذج
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        grade = request.form.get('grade', 'أولى ثانوي')
        
        # التحقق من البيانات المطلوبة
        if not title:
            return jsonify({'success': False, 'message': 'عنوان الفيديو مطلوب'})
        
        if not description:
            return jsonify({'success': False, 'message': 'وصف الفيديو مطلوب'})
        
        if video_file and allowed_file(video_file.filename, ALLOWED_VIDEO_EXTENSIONS):
            # حفظ الفيديو
            video_filename = secure_filename(video_file.filename)
            video_id = str(uuid.uuid4())
            video_path = os.path.join(app.config['VIDEO_FOLDER'], f"{video_id}_{video_filename}")
            
            # عرض معلومات الملف
            file_size_mb = file_size // (1024 * 1024) if file_size > 0 else 0
            file_size_gb = file_size / (1024 * 1024 * 1024)
            
            print(f"جاري حفظ الفيديو: {video_filename}")
            print(f"حجم الفيديو: {file_size_mb} MB ({file_size_gb:.2f} GB)")
            
            # حفظ الملف
            try:
                video_file.save(video_path)
                print("✅ تم حفظ الفيديو بنجاح")
            except Exception as save_error:
                print(f"❌ خطأ في حفظ الفيديو: {save_error}")
                return jsonify({'success': False, 'message': f'فشل في حفظ الملف: {str(save_error)}'})
            
            # حفظ الصورة المصغرة إذا تم رفعها
            thumbnail_url = '/static/images/default-thumbnail.jpg'
            if thumbnail_file and thumbnail_file.filename != '' and allowed_file(thumbnail_file.filename, ALLOWED_IMAGE_EXTENSIONS):
                try:
                    thumbnail_filename = secure_filename(thumbnail_file.filename)
                    thumbnail_path = os.path.join(app.config['THUMBNAIL_FOLDER'], f"{video_id}_{thumbnail_filename}")
                    thumbnail_file.save(thumbnail_path)
                    thumbnail_url = f'/uploads/thumbnails/{video_id}_{thumbnail_filename}'
                    print("✅ تم حفظ الصورة المصغرة بنجاح")
                    
                    # حفظ الصورة في المجلد static أيضاً للوصول السهل
                    static_thumb_path = os.path.join('static', 'thumbnails', f"{video_id}_{thumbnail_filename}")
                    os.makedirs(os.path.dirname(static_thumb_path), exist_ok=True)
                    thumbnail_file.seek(0)  # العودة لبداية الملف
                    with open(static_thumb_path, 'wb') as f:
                        f.write(thumbnail_file.read())
                        
                except Exception as thumb_error:
                    print(f"⚠️ خطأ في حفظ الصورة المصغرة: {thumb_error}")
                    # استمر حتى لو فشل حفظ الصورة المصغرة
            
            # حفظ بيانات الفيديو
            videos = load_data(VIDEOS_FILE)
            
            new_video = {
                'id': video_id,
                'title': title,
                'description': description,
                'grade': grade,
                'fileName': video_filename,
                'thumbnail': thumbnail_url,
                'uploadDate': datetime.now().strftime('%Y-%m-%d'),
                'views': 0,
                'serverId': 1,
                'fileSize': file_size,
                'fileSizeMB': file_size_mb,
                'fileSizeGB': round(file_size_gb, 2)
            }
            
            videos.append(new_video)
            save_data(VIDEOS_FILE, videos)
            
            # رسالة نجاح مع معلومات الحجم
            size_info = ""
            if file_size_gb >= 1:
                size_info = f" ({file_size_gb:.2f} GB)"
            else:
                size_info = f" ({file_size_mb} MB)"
            
            return jsonify({
                'success': True,
                'message': f'تم رفع الفيديو بنجاح!{size_info}',
                'video_id': video_id
            })
        else:
            allowed_extensions = ', '.join(ALLOWED_VIDEO_EXTENSIONS)
            return jsonify({
                'success': False, 
                'message': f'نوع الملف غير مدعوم. المسموح: {allowed_extensions}'
            })
    
    except Exception as e:
        print(f"❌ Error uploading video: {e}")
        return jsonify({
            'success': False, 
            'message': f'حدث خطأ أثناء رفع الفيديو: {str(e)}'
        })

@app.route('/api/videos/<video_id>', methods=['DELETE'])
def api_delete_video(video_id):
    """حذف فيديو"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    try:
        videos = load_data(VIDEOS_FILE)
        video = next((v for v in videos if v['id'] == video_id), None)
        
        if not video:
            return jsonify({'success': False, 'message': 'الفيديو غير موجود'})
        
        # حذف ملف الفيديو
        video_filename = f"{video_id}_{video['fileName']}"
        video_path = os.path.join(app.config['VIDEO_FOLDER'], video_filename)
        
        if os.path.exists(video_path):
            os.remove(video_path)
            print(f"✅ تم حذف ملف الفيديو: {video_path}")
        
        # حذف الصورة المصغرة إذا كانت موجودة
        thumbnail_path = video.get('thumbnail', '')
        if thumbnail_path and thumbnail_path != '/static/images/default-thumbnail.jpg':
            if thumbnail_path.startswith('/uploads/thumbnails/'):
                thumb_filename = os.path.basename(thumbnail_path)
                thumb_full_path = os.path.join(app.config['THUMBNAIL_FOLDER'], thumb_filename)
                if os.path.exists(thumb_full_path):
                    os.remove(thumb_full_path)
                    print(f"✅ تم حذف الصورة المصغرة: {thumb_full_path}")
            
            # حذف من مجلد static أيضاً
            if thumbnail_path.startswith('/static/thumbnails/'):
                thumb_filename = os.path.basename(thumbnail_path)
                thumb_static_path = os.path.join('static', 'thumbnails', thumb_filename)
                if os.path.exists(thumb_static_path):
                    os.remove(thumb_static_path)
                    print(f"✅ تم حذف الصورة المصغرة من static: {thumb_static_path}")
        
        # حذف الفيديو من قاعدة البيانات
        videos = [v for v in videos if v['id'] != video_id]
        save_data(VIDEOS_FILE, videos)
        
        # حذف الأكواد المرتبطة بهذا الفيديو
        video_codes = load_data(VIDEO_CODES_FILE)
        if video_id in video_codes:
            del video_codes[video_id]
            save_data(VIDEO_CODES_FILE, video_codes)
        
        # حذف من سجل المشتريات
        purchased_courses = load_data(PURCHASED_COURSES_FILE)
        for student_phone, courses in purchased_courses.items():
            purchased_courses[student_phone] = [course for course in courses if course.get('videoId') != video_id]
        save_data(PURCHASED_COURSES_FILE, purchased_courses)
        
        # حذف من سجل المشاهدات
        video_watch_count = load_data(VIDEO_WATCH_COUNT_FILE)
        keys_to_delete = [key for key in video_watch_count.keys() if key.endswith(f"_{video_id}")]
        for key in keys_to_delete:
            del video_watch_count[key]
        save_data(VIDEO_WATCH_COUNT_FILE, video_watch_count)
        
        print(f"✅ تم حذف الفيديو بنجاح: {video['title']} (ID: {video_id})")
        
        return jsonify({
            'success': True,
            'message': 'تم حذف الفيديو بنجاح'
        })
        
    except Exception as e:
        print(f"❌ Error deleting video: {e}")
        return jsonify({
            'success': False,
            'message': f'حدث خطأ أثناء حذف الفيديو: {str(e)}'
        })

# ⭐⭐⭐ نظام الأكواد الجديد والمحسن ⭐⭐⭐

@app.route('/api/videos/<video_id>/codes', methods=['POST'])
def api_generate_multiple_codes(video_id):
    """توليد أكواد متعددة للفيديو - النظام الجديد والمحسن"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'بيانات الطلب فارغة'})
    
    count = data.get('count')
    
    # التحقق من صحة العدد
    if not count or not isinstance(count, int) or count < 1 or count > 100:
        return jsonify({'success': False, 'message': 'يرجى إدخال عدد صحيح بين 1 و 100'})
    
    # التحقق من وجود الفيديو
    videos = load_data(VIDEOS_FILE)
    video = next((v for v in videos if v['id'] == video_id), None)
    
    if not video:
        return jsonify({'success': False, 'message': 'الفيديو غير موجود'})
    
    # استخراج رقم الحلقة من العنوان
    episode_number = extract_episode_number(video['title'])
    
    video_codes = load_data(VIDEO_CODES_FILE)
    used_codes = load_data(USED_CODES_FILE)
    
    # التأكد من وجود مصفوفة للأكواد لهذا الفيديو
    if video_id not in video_codes:
        video_codes[video_id] = []
    
    generated_codes = []
    for i in range(count):
        # ⭐⭐ استخدام النظام الجديد لتوليد الأكواد
        code = generate_custom_code(episode_number, video['grade'])
        
        code_data = {
            'code': code,
            'used': False,
            'generated_date': datetime.now().isoformat(),
            'used_by': None,
            'used_date': None,
            'video_id': video_id,
            'video_title': video['title'],
            'video_grade': video['grade'],
            'episode': episode_number,
            'max_uses': 1,  # ⭐ الاستخدام لمرة واحدة فقط
            'used_count': 0,
            'locked_to_video': True  # ⭐ تأكيد أن الكود مقيد
        }
        video_codes[video_id].append(code_data)
        generated_codes.append(code)
    
    save_data(VIDEO_CODES_FILE, video_codes)
    
    return jsonify({
        'success': True,
        'codes': generated_codes,
        'message': f'تم توليد {count} كود بنجاح للفيديو: {video["title"]}',
        'video_title': video['title'],
        'video_id': video_id
    })

@app.route('/api/videos/<video_id>/codes')
def api_get_video_codes(video_id):
    """الحصول على جميع أكواد الفيديو"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    video_codes = load_data(VIDEO_CODES_FILE)
    codes = video_codes.get(video_id, [])
    
    return jsonify({
        'success': True,
        'codes': codes
    })

@app.route('/api/videos/code/use', methods=['POST'])
def api_use_code():
    """استخدام كود لمشاهدة الفيديو - لمرة واحدة فقط"""
    if 'user_type' not in session or session['user_type'] != 'student':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'بيانات الطلب فارغة'})
    
    code = data.get('code')
    current_video_id = data.get('video_id')
    student_phone = session['user_phone']
    
    if not code or not current_video_id:
        return jsonify({'success': False, 'message': 'الكود ومعرف الفيديو مطلوبان'})
    
    print(f"🎯 التحقق من الكود: '{code}' للفيديو: '{current_video_id}'")
    
    video_codes = load_data(VIDEO_CODES_FILE)
    purchased_courses = load_data(PURCHASED_COURSES_FILE)
    used_codes = load_data(USED_CODES_FILE)
    
    # ⭐ التحقق: هل الطالب استخدم هذا الكود من قبل؟
    if code in used_codes:
        used_data = used_codes[code]
        if used_data.get('studentPhone') == student_phone:
            return jsonify({'success': False, 'message': '❌ هذا الكود مستخدم مسبقاً ولا يمكن استخدامه مرة أخرى'})
    
    # التحقق من وجود أكواد للفيديو الحالي
    if current_video_id not in video_codes:
        return jsonify({'success': False, 'message': 'لا توجد أكواد لهذا الفيديو'})
    
    # البحث في أكواد الفيديو الحالي فقط
    code_found = False
    code_data = None
    code_index = -1
    
    for index, code_item in enumerate(video_codes[current_video_id]):
        if code_item['code'] == code:
            # ⭐ التحقق من عدد مرات الاستخدام
            if code_item['used']:
                return jsonify({'success': False, 'message': '❌ هذا الكود مستخدم مسبقاً'})
            
            if code_item.get('used_count', 0) >= code_item.get('max_uses', 1):
                return jsonify({'success': False, 'message': '❌ تم تجاوز عدد مرات الاستخدام المسموح بها'})
            
            code_found = True
            code_data = code_item
            code_index = index
            break
    
    # لو الكود مش موجود في الفيديو الحالي
    if not code_found:
        other_video_info = find_code_in_other_videos(code, current_video_id, video_codes)
        
        if other_video_info:
            return jsonify({
                'success': False, 
                'message': f'❌ هذا الكود مخصص للفيديو: {other_video_info["title"]} ({other_video_info["grade"]}). يرجى استخدامه في مكانه الصحيح'
            })
        else:
            return jsonify({'success': False, 'message': '❌ الكود غير صالح لهذا الفيديو'})
    
    # ⭐⭐ نجاح - تحديث حالة الكود لمرة واحدة
    print(f"✅ الكود صالح - تفعيل الفيديو: {current_video_id}")
    
    # تحديث حالة الكود
    video_codes[current_video_id][code_index]['used'] = True
    video_codes[current_video_id][code_index]['used_by'] = student_phone
    video_codes[current_video_id][code_index]['used_date'] = datetime.now().isoformat()
    video_codes[current_video_id][code_index]['used_count'] = 1
    
    # تسجيل الكود كمستخدم
    used_codes[code] = {
        'studentPhone': student_phone,
        'videoId': current_video_id,
        'usedDate': datetime.now().isoformat(),
        'video_title': code_data.get('video_title', '')
    }
    
    # إضافة الفيديو للمشتريات
    if student_phone not in purchased_courses:
        purchased_courses[student_phone] = []
    
    if not any(course['videoId'] == current_video_id for course in purchased_courses[student_phone]):
        purchased_courses[student_phone].append({
            'videoId': current_video_id,
            'purchaseDate': datetime.now().strftime('%Y-%m-%d'),
            'used_code': code,
            'video_title': code_data.get('video_title', ''),
            'access_type': 'one_time_code'  # ⭐ نوع الوصول
        })
    
    # حفظ التغييرات
    save_data(VIDEO_CODES_FILE, video_codes)
    save_data(PURCHASED_COURSES_FILE, purchased_courses)
    save_data(USED_CODES_FILE, used_codes)
    
    return jsonify({
        'success': True,
        'message': f'✅ تم تفعيل الكود بنجاح! يمكنك الآن مشاهدة الفيديو',
        'video_id': current_video_id,
        'one_time_use': True  # ⭐ تأكيد أن الكود لمرة واحدة
    })

@app.route('/api/videos/<video_id>/code')
def api_generate_code(video_id):
    """توليد كود واحد للفيديو (للتوافق مع النظام القديم)"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    # استخدام النظام الجديد لتوليد كود واحد
    response = api_generate_multiple_codes(video_id)
    return response

@app.route('/api/students')
def api_get_students():
    """الحصول على قائمة الطلاب"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    students = load_data(STUDENTS_FILE)
    student_points = load_data(STUDENT_POINTS_FILE)
    
    # إضافة النقاط للطلاب
    for student in students:
        student['points'] = student_points.get(student['phone'], 0)
    
    return jsonify(students)

@app.route('/api/points/<grade>')
def api_get_points_table(grade):
    """الحصول على جدول النقاط"""
    try:
        students = load_data(STUDENTS_FILE)
        student_points = load_data(STUDENT_POINTS_FILE)
        
        # تصفية الطلاب حسب الصف
        grade_text = {
            'first': 'أولى ثانوي',
            'second': 'ثانية ثانوي',
            'third': 'تالتة ثانوي'
        }.get(grade, 'أولى ثانوي')
        
        filtered_students = [s for s in students if s['grade'] == grade_text]
        
        # إضافة النقاط للطلاب
        for student in filtered_students:
            student['points'] = student_points.get(student['phone'], 0)
        
        # ترتيب الطلاب حسب النقاط
        sorted_students = sorted(filtered_students, key=lambda x: x['points'], reverse=True)
        
        return jsonify(sorted_students)
        
    except Exception as e:
        print(f"❌ خطأ في جلب جدول النقاط: {e}")
        return jsonify([])

# ⭐⭐⭐ نظام النقاط المحسن لجميع الصفوف ⭐⭐⭐

@app.route('/api/points/all-grades')
def api_get_all_grades_points():
    """الحصول على جدول النقاط لجميع الصفوف"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    students = load_data(STUDENTS_FILE)
    student_points = load_data(STUDENT_POINTS_FILE)
    
    # تنظيم الطلاب حسب جميع الصفوف
    grades_points = {
        'أولى ثانوي': [],
        'ثانية ثانوي': [], 
        'تالتة ثانوي': []
    }
    
    # إضافة النقاط للطلاب وتصنيفهم حسب الصف
    for student in students:
        points = student_points.get(student['phone'], 0)
        student_with_points = student.copy()
        student_with_points['points'] = points
        student_with_points['rank'] = 0
        
        grade = student['grade']
        if grade in grades_points:
            grades_points[grade].append(student_with_points)
        else:
            # إذا كان الصف غير موجود، أضفه تلقائياً
            grades_points[grade] = [student_with_points]
    
    # ترتيب الطلاب في كل صف حسب النقاط
    for grade in grades_points:
        if grades_points[grade]:  # إذا كان هناك طلاب في هذا الصف
            grades_points[grade] = sorted(grades_points[grade], key=lambda x: x['points'], reverse=True)
            
            # إضافة الترتيب
            for i, student in enumerate(grades_points[grade], 1):
                student['rank'] = i
    
    return jsonify({
        'success': True,
        'grades_points': grades_points
    })

@app.route('/api/points/leaderboard')
def api_get_leaderboard():
    """لوحة المتصدرين لجميع الصفوف"""
    students = load_data(STUDENTS_FILE)
    student_points = load_data(STUDENT_POINTS_FILE)
    
    # إضافة النقاط للطلاب
    students_with_points = []
    for student in students:
        points = student_points.get(student['phone'], 0)
        student_data = student.copy()
        student_data['points'] = points
        students_with_points.append(student_data)
    
    # ترتيب جميع الطلاب حسب النقاط
    leaderboard = sorted(students_with_points, key=lambda x: x['points'], reverse=True)[:20]  # أعلى 20
    
    # إضافة الترتيب العام
    for i, student in enumerate(leaderboard, 1):
        student['global_rank'] = i
    
    return jsonify({
        'success': True,
        'leaderboard': leaderboard
    })

@app.route('/api/points/grade/<grade_name>')
def api_get_grade_points(grade_name):
    """الحصول على نقاط صف معين"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    students = load_data(STUDENTS_FILE)
    student_points = load_data(STUDENT_POINTS_FILE)
    
    # تحويل اسم الصف من الإنجليزية للعربية
    grade_mapping = {
        'first': 'أولى ثانوي',
        'second': 'ثانية ثانوي', 
        'third': 'تالتة ثانوي'
    }
    
    grade_arabic = grade_mapping.get(grade_name, grade_name)
    
    # تصفية الطلاب حسب الصف
    grade_students = [s for s in students if s['grade'] == grade_arabic]
    
    # إضافة النقاط والترتيب
    for student in grade_students:
        student['points'] = student_points.get(student['phone'], 0)
    
    # ترتيب الطلاب حسب النقاط
    sorted_students = sorted(grade_students, key=lambda x: x['points'], reverse=True)
    
    # إضافة الترتيب
    for i, student in enumerate(sorted_students, 1):
        student['rank'] = i
    
    return jsonify({
        'success': True,
        'grade': grade_arabic,
        'students': sorted_students
    })

@app.route('/api/points/add-manual', methods=['POST'])
def api_add_manual_points():
    """إضافة نقاط يدوية للطلاب"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'بيانات الطلب فارغة'})
    
    student_phone = data.get('student_phone')
    points = data.get('points')
    reason = data.get('reason', 'نقاط يدوية')
    
    if not student_phone or not points:
        return jsonify({'success': False, 'message': 'بيانات غير مكتملة'})
    
    try:
        points = int(points)
    except ValueError:
        return jsonify({'success': False, 'message': 'عدد النقاط يجب أن يكون رقماً'})
    
    # التحقق من وجود الطالب
    students = load_data(STUDENTS_FILE)
    student_exists = any(student['phone'] == student_phone for student in students)
    
    if not student_exists:
        return jsonify({'success': False, 'message': 'الطالب غير موجود'})
    
    # تحديث نقاط الطالب
    student_points = load_data(STUDENT_POINTS_FILE)
    if student_phone not in student_points:
        student_points[student_phone] = 0
    
    student_points[student_phone] += points
    save_data(STUDENT_POINTS_FILE, student_points)
    
    # تسجيل العملية في السجل
    points_history = load_data(POINTS_HISTORY_FILE)
    transaction_id = str(uuid.uuid4())
    
    if student_phone not in points_history:
        points_history[student_phone] = []
    
    points_history[student_phone].append({
        'id': transaction_id,
        'points': points,
        'reason': reason,
        'type': 'manual',
        'date': datetime.now().isoformat(),
        'teacher': session['user_name']
    })
    
    save_data(POINTS_HISTORY_FILE, points_history)
    
    return jsonify({
        'success': True,
        'message': f'تم إضافة {points} نقاط للطالب',
        'new_total': student_points[student_phone]
    })

@app.route('/api/student/points-history')
def api_get_student_points_history():
    """الحصول على سجل نقاط الطالب"""
    if 'user_type' not in session or session['user_type'] != 'student':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    points_history = load_data(POINTS_HISTORY_FILE)
    student_history = points_history.get(session['user_phone'], [])
    
    # ترتيب السجل من الأحدث إلى الأقدم
    sorted_history = sorted(student_history, key=lambda x: x['date'], reverse=True)
    
    return jsonify({
        'success': True,
        'history': sorted_history
    })

@app.route('/api/videos/watch', methods=['POST'])
def api_watch_video():
    """تسجيل مشاهدة الفيديو وإضافة نقاط عند 90%"""
    if 'user_type' not in session or session['user_type'] != 'student':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'بيانات الطلب فارغة'})
    
    video_id = data.get('video_id')
    watch_percentage = data.get('watch_percentage', 100)
    student_phone = session['user_phone']
    
    if not video_id:
        return jsonify({'success': False, 'message': 'معرف الفيديو مطلوب'})
    
    print(f"🎬 محاولة تسجيل مشاهدة: فيديو {video_id} بواسطة {student_phone} بنسبة {watch_percentage}%")
    
    # ⭐⭐⭐ نظام النقاط: 10 نقاط عند 90% ⭐⭐⭐
    points_to_add = 0
    if watch_percentage >= 90:
        points_to_add = 10
        print(f"🎉 مؤهل للنقاط! نسبة المشاهدة: {watch_percentage}%")
    
    # تحديث عدد مشاهدات الفيديو أولاً
    videos = load_data(VIDEOS_FILE)
    video_updated = False
    for video in videos:
        if video['id'] == video_id:
            video['views'] = video.get('views', 0) + 1
            video_updated = True
            print(f"✅ تم تحديث عدد المشاهدات للفيديو {video_id}: {video['views']}")
            break
    
    if video_updated:
        save_data(VIDEOS_FILE, videos)
    
    # التحقق من أن الطالب لم يشاهد هذا الفيديو من قبل
    video_watch_count = load_data(VIDEO_WATCH_COUNT_FILE)
    watch_key = f"{student_phone}_{video_id}"
    
    # التحقق من أن watch_key موجود وأن watched = True
    if watch_key in video_watch_count and video_watch_count[watch_key].get('watched', False):
        print(f"⚠️ الطالب شاهد الفيديو من قبل: {watch_key}")
        return jsonify({'success': False, 'message': 'لقد حصلت already على النقاط لهذا الفيديو'})
    
    # تحديث إحصائيات الطالب
    student_stats = load_data(STUDENT_STATS_FILE)
    student_points = load_data(STUDENT_POINTS_FILE)
    
    if student_phone not in student_stats:
        student_stats[student_phone] = {
            'totalVideosWatched': 0,
            'totalWatchTime': 0,
            'purchasedCourses': 0,
            'lastWatched': None,
            'watchedVideos': [],
            'totalPoints': 0
        }
    
    # البحث في watchedVideos بشكل صحيح
    video_already_watched = any(video.get('video_id') == video_id for video in student_stats[student_phone]['watchedVideos'])
    
    if not video_already_watched:
        student_stats[student_phone]['watchedVideos'].append({
            'video_id': video_id,
            'watch_date': datetime.now().isoformat(),
            'watch_percentage': watch_percentage
        })
        student_stats[student_phone]['totalVideosWatched'] = len(student_stats[student_phone]['watchedVideos'])
        print(f"✅ تم إضافة الفيديو إلى قائمة المشاهدة: {video_id}")
    
    student_stats[student_phone]['lastWatched'] = datetime.now().isoformat()
    
    # تحديث نقاط الطالب فقط إذا كان مؤهلاً للنقاط
    if student_phone not in student_points:
        student_points[student_phone] = 0
    
    if points_to_add > 0:
        student_points[student_phone] += points_to_add
        student_stats[student_phone]['totalPoints'] = student_points[student_phone]
        print(f"🎉 تم منح {points_to_add} نقاط للطالب {student_phone}. النقاط الإجمالية: {student_points[student_phone]}")
    
    # تسجيل أن الطالب شاهد هذا الفيديو
    video_watch_count[watch_key] = {
        'watched': True,
        'watch_date': datetime.now().isoformat(),
        'percentage': watch_percentage
    }
    
    # تسجيل النقاط في السجل فقط إذا تم منحها
    if points_to_add > 0:
        points_history = load_data(POINTS_HISTORY_FILE)
        transaction_id = str(uuid.uuid4())
        
        if student_phone not in points_history:
            points_history[student_phone] = []
        
        points_history[student_phone].append({
            'id': transaction_id,
            'points': points_to_add,
            'reason': f'مشاهدة فيديو - {watch_percentage}%',
            'type': 'video',
            'date': datetime.now().isoformat(),
            'video_id': video_id
        })
        
        save_data(POINTS_HISTORY_FILE, points_history)
    
    save_data(VIDEO_WATCH_COUNT_FILE, video_watch_count)
    save_data(STUDENT_STATS_FILE, student_stats)
    save_data(STUDENT_POINTS_FILE, student_points)
    
    if points_to_add > 0:
        return jsonify({
            'success': True, 
            'message': f'تم تسجيل المشاهدة وإضافة {points_to_add} نقاط!',
            'points_added': points_to_add,
            'total_points': student_points[student_phone],
            'watch_percentage': watch_percentage
        })
    else:
        return jsonify({
            'success': True, 
            'message': 'تم تسجيل المشاهدة! تحتاج مشاهدة 90% على الأقل للحصول على النقاط.',
            'points_added': 0,
            'total_points': student_points[student_phone],
            'watch_percentage': watch_percentage
        })

@app.route('/api/videos/<video_id>/watch-status')
def api_get_watch_status(video_id):
    """التحقق من إذا كان الطالب شاهد الفيديو من قبل"""
    if 'user_type' not in session or session['user_type'] != 'student':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    student_phone = session['user_phone']
    video_watch_count = load_data(VIDEO_WATCH_COUNT_FILE)
    watch_key = f"{student_phone}_{video_id}"
    
    has_watched = watch_key in video_watch_count and video_watch_count[watch_key].get('watched', False)
    watch_percentage = video_watch_count[watch_key].get('percentage', 100) if has_watched else 0
    
    return jsonify({
        'success': True,
        'has_watched': has_watched,
        'video_id': video_id,
        'watch_percentage': watch_percentage
    })

@app.route('/api/student/points')
def api_get_student_points():
    """الحصول على نقاط الطالب الحالية"""
    if 'user_type' not in session or session['user_type'] != 'student':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    student_points = load_data(STUDENT_POINTS_FILE)
    points = student_points.get(session['user_phone'], 0)
    
    return jsonify({
        'success': True,
        'points': points
    })

@app.route('/api/videos/stream/<video_id>')
def api_stream_video(video_id):
    """بث الفيديو"""
    videos = load_data(VIDEOS_FILE)
    video = next((v for v in videos if v['id'] == video_id), None)
    
    if not video:
        return jsonify({'success': False, 'message': 'الفيديو غير موجود'})
    
    video_path = os.path.join(app.config['VIDEO_FOLDER'], f"{video_id}_{video['fileName']}")
    
    # إذا لم يكن الفيديو موجود، ارجع رسالة خطأ
    if not os.path.exists(video_path):
        return jsonify({'success': False, 'message': 'ملف الفيديو غير موجود على الخادم'})
    
    return send_file(video_path, as_attachment=False)

@app.route('/uploads/thumbnails/<filename>')
def serve_thumbnail(filename):
    """خدمة الصور المصغرة"""
    try:
        return send_file(os.path.join(app.config['THUMBNAIL_FOLDER'], filename))
    except FileNotFoundError:
        return send_file('static/images/default-thumbnail.jpg')

@app.route('/static/thumbnails/<filename>')
def serve_static_thumbnail(filename):
    """خدمة الصور المصغرة من المجلد static"""
    try:
        return send_file(os.path.join('static', 'thumbnails', filename))
    except FileNotFoundError:
        return send_file('static/images/default-thumbnail.jpg')

# ========== معالجات الأخطاء ==========

@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'message': 'الصفحة غير موجودة'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'success': False, 'message': 'حدث خطأ داخلي في الخادم'}), 500

# معالج للأخطاء العامة
@app.errorhandler(Exception)
def handle_exception(e):
    print(f"Unhandled exception: {e}")
    return jsonify({'success': False, 'message': 'حدث خطأ غير متوقع'}), 500

# يمكنك استدعاء هذه الدالة تلقائياً أو يدوياً
@app.route('/api/cleanup', methods=['POST'])
def api_cleanup():
    """تنظيف الملفات الميتة (للمطورين)"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    try:
        cleanup_orphaned_files()
        return jsonify({'success': True, 'message': 'تم تنظيف الملفات الميتة بنجاح'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ في التنظيف: {str(e)}'})

def initialize_app():
    """تهيئة التطبيق مع تنظيف الملفات الميتة"""
    initialize_data()
    cleanup_orphaned_files()  # تنظيف الملفات الميتة عند التشغيل

# في app.py - إضافة هذه الدوال الجديدة

@app.route('/api/student/records/<student_phone>')
def api_get_student_records(student_phone):
    """الحصول على سجلات الطالب"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    try:
        # تحميل البيانات
        video_codes = load_data(VIDEO_CODES_FILE)
        used_codes = load_data(USED_CODES_FILE)
        purchased_courses = load_data(PURCHASED_COURSES_FILE)
        students = load_data(STUDENTS_FILE)
        videos = load_data(VIDEOS_FILE)
        
        # التحقق من وجود الطالب
        student = next((s for s in students if s['phone'] == student_phone), None)
        if not student:
            return jsonify({'success': False, 'message': 'الطالب غير موجود'})
        
        # جمع السجلات
        records = []
        
        # 1. الأكواد المستخدمة
        for code, code_data in used_codes.items():
            if code_data.get('studentPhone') == student_phone:
                video = next((v for v in videos if v['id'] == code_data.get('videoId')), {})
                records.append({
                    'type': 'code_used',
                    'date': code_data.get('usedDate'),
                    'code': code,
                    'video_title': code_data.get('video_title', video.get('title', 'غير معروف')),
                    'video_id': code_data.get('videoId'),
                    'description': f'استخدم الكود {code} لفتح الفيديو'
                })
        
        # 2. الكورسات المشتراة
        student_courses = purchased_courses.get(student_phone, [])
        for course in student_courses:
            video = next((v for v in videos if v['id'] == course.get('videoId')), {})
            records.append({
                'type': 'course_purchased',
                'date': course.get('purchaseDate'),
                'code': course.get('used_code', 'بدون كود'),
                'video_title': course.get('video_title', video.get('title', 'غير معروف')),
                'video_id': course.get('videoId'),
                'description': f'شراء كورس باستخدام كود {course.get("used_code", "غير معروف")}'
            })
        
        # 3. الأكواد المتاحة (غير مستخدمة)
        for video_id, codes_list in video_codes.items():
            for code_data in codes_list:
                if code_data.get('used_by') == student_phone:
                    video = next((v for v in videos if v['id'] == video_id), {})
                    records.append({
                        'type': 'code_assigned',
                        'date': code_data.get('generated_date'),
                        'code': code_data.get('code'),
                        'video_title': code_data.get('video_title', video.get('title', 'غير معروف')),
                        'video_id': video_id,
                        'description': f'كود مخصص: {code_data.get("code")}'
                    })
        
        # ترتيب السجلات من الأحدث إلى الأقدم
        records.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        # إحصائيات
        stats = {
            'total_codes_used': len([r for r in records if r['type'] == 'code_used']),
            'total_courses_purchased': len([r for r in records if r['type'] == 'course_purchased']),
            'total_activities': len(records),
            'last_activity': records[0].get('date') if records else None
        }
        
        return jsonify({
            'success': True,
            'student': student,
            'records': records,
            'stats': stats
        })
        
    except Exception as e:
        print(f"❌ Error getting student records: {e}")
        return jsonify({'success': False, 'message': f'حدث خطأ في جلب السجلات: {str(e)}'})

@app.route('/api/students/records')
def api_get_all_students_records():
    """الحصول على سجلات جميع الطلاب"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    try:
        students = load_data(STUDENTS_FILE)
        purchased_courses = load_data(PURCHASED_COURSES_FILE)
        used_codes = load_data(USED_CODES_FILE)
        
        students_records = []
        
        for student in students:
            student_phone = student['phone']
            
            # عدد الكورسات المشتراة
            courses_count = len(purchased_courses.get(student_phone, []))
            
            # عدد الأكواد المستخدمة
            codes_used = len([code for code, data in used_codes.items() if data.get('studentPhone') == student_phone])
            
            # آخر نشاط
            last_activity = None
            student_codes = [data for data in used_codes.values() if data.get('studentPhone') == student_phone]
            if student_codes:
                last_activity = max([data.get('usedDate') for data in student_codes])
            
            students_records.append({
                'name': student['name'],
                'phone': student_phone,
                'grade': student['grade'],
                'courses_count': courses_count,
                'codes_used': codes_used,
                'last_activity': last_activity,
                'total_activities': courses_count + codes_used
            })
        
        # ترتيب الطلاب حسب آخر نشاط
        students_records.sort(key=lambda x: x.get('last_activity', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'students': students_records
        })
        
    except Exception as e:
        print(f"❌ Error getting all students records: {e}")
        return jsonify({'success': False, 'message': f'حدث خطأ في جلب سجلات الطلاب: {str(e)}'})

# في app.py - إضافة هذه الدوال الجديدة

@app.route('/api/student/records/export/<student_phone>')
def api_export_student_records(student_phone):
    """تصدير سجلات الطالب إلى ملف txt"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    try:
        # تحميل البيانات
        video_codes = load_data(VIDEO_CODES_FILE)
        used_codes = load_data(USED_CODES_FILE)
        purchased_courses = load_data(PURCHASED_COURSES_FILE)
        students = load_data(STUDENTS_FILE)
        videos = load_data(VIDEOS_FILE)
        
        # التحقق من وجود الطالب
        student = next((s for s in students if s['phone'] == student_phone), None)
        if not student:
            return jsonify({'success': False, 'message': 'الطالب غير موجود'})
        
        # جمع السجلات
        records = []
        
        # 1. الأكواد المستخدمة
        for code, code_data in used_codes.items():
            if code_data.get('studentPhone') == student_phone:
                video = next((v for v in videos if v['id'] == code_data.get('videoId')), {})
                records.append({
                    'type': 'كود مستخدم',
                    'date': code_data.get('usedDate'),
                    'code': code,
                    'video_title': code_data.get('video_title', video.get('title', 'غير معروف')),
                    'description': f'استخدم الكود {code} لفتح الفيديو'
                })
        
        # 2. الكورسات المشتراة
        student_courses = purchased_courses.get(student_phone, [])
        for course in student_courses:
            video = next((v for v in videos if v['id'] == course.get('videoId')), {})
            records.append({
                'type': 'كورس مشترى',
                'date': course.get('purchaseDate'),
                'code': course.get('used_code', 'بدون كود'),
                'video_title': course.get('video_title', video.get('title', 'غير معروف')),
                'description': f'شراء كورس باستخدام كود {course.get("used_code", "غير معروف")}'
            })
        
        # 3. الأكواد المتاحة (غير مستخدمة)
        for video_id, codes_list in video_codes.items():
            for code_data in codes_list:
                if code_data.get('used_by') == student_phone:
                    video = next((v for v in videos if v['id'] == video_id), {})
                    records.append({
                        'type': 'كود مخصص',
                        'date': code_data.get('generated_date'),
                        'code': code_data.get('code'),
                        'video_title': code_data.get('video_title', video.get('title', 'غير معروف')),
                        'description': f'كود مخصص: {code_data.get("code")}'
                    })
        
        # ترتيب السجلات من الأحدث إلى الأقدم
        records.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        # إنشاء محتوى الملف
        content = f"""سجلات الطالب: {student['name']}
رقم الهاتف: {student_phone}
الصف: {student['grade']}
تاريخ التصدير: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
عدد السجلات: {len(records)}

{'='*50}

"""
        
        for i, record in enumerate(records, 1):
            date_str = datetime.fromisoformat(record['date']).strftime('%Y-%m-%d %H:%M') if record['date'] else 'غير محدد'
            content += f"""السجل {i}:
- النوع: {record['type']}
- التاريخ: {date_str}
- الكود: {record['code']}
- الفيديو: {record['video_title']}
- الوصف: {record['description']}

{'-'*30}

"""
        
        # إرجاع الملف
        from io import BytesIO
        file_buffer = BytesIO()
        file_buffer.write(content.encode('utf-8'))
        file_buffer.seek(0)
        
        filename = f"سجلات_{student['name']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
        return send_file(
            file_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='text/plain; charset=utf-8'
        )
        
    except Exception as e:
        print(f"❌ Error exporting student records: {e}")
        return jsonify({'success': False, 'message': f'حدث خطأ في تصدير السجلات: {str(e)}'})

# تحديث دالة حذف الطالب لحذف السجلات أيضاً
@app.route('/api/students/manage', methods=['POST'])
def api_manage_student():
    """إدارة حساب الطالب - محدث لحذف السجلات"""
    if 'user_type' not in session or session['user_type'] != 'teacher':
        return jsonify({'success': False, 'message': 'غير مصرح'})
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'بيانات الطلب فارغة'})
    
    student_phone = data.get('student_phone')
    action = data.get('action')
    new_password = data.get('new_password')
    new_status = data.get('new_status')
    
    if not student_phone or not action:
        return jsonify({'success': False, 'message': 'بيانات غير مكتملة'})
    
    students = load_data(STUDENTS_FILE)
    student_points = load_data(STUDENT_POINTS_FILE)
    purchased_courses = load_data(PURCHASED_COURSES_FILE)
    student_stats = load_data(STUDENT_STATS_FILE)
    points_history = load_data(POINTS_HISTORY_FILE)
    video_watch_count = load_data(VIDEO_WATCH_COUNT_FILE)
    used_codes = load_data(USED_CODES_FILE)
    video_codes = load_data(VIDEO_CODES_FILE)
    
    student_found = False
    updated_students = []
    
    for student in students:
        if student['phone'] == student_phone:
            student_found = True
            
            if action == 'change_status' and new_status:
                student['status'] = new_status
                updated_students.append(student)
            elif action == 'change_password' and new_password:
                student['password'] = new_password
                updated_students.append(student)
            elif action == 'delete':
                # تخطي هذا الطالب (سيتم حذفه)
                continue
            else:
                updated_students.append(student)
        else:
            updated_students.append(student)
    
    if not student_found:
        return jsonify({'success': False, 'message': 'الطالب غير موجود'})
    
    if action == 'delete':
        # ⭐⭐⭐ حذف جميع البيانات المرتبطة بالطالب ⭐⭐⭐
        
        # 1. حذف من purchased_courses
        if student_phone in purchased_courses:
            del purchased_courses[student_phone]
        
        # 2. حذف من student_points
        if student_phone in student_points:
            del student_points[student_phone]
        
        # 3. حذف من student_stats
        if student_phone in student_stats:
            del student_stats[student_phone]
        
        # 4. حذف من points_history
        if student_phone in points_history:
            del points_history[student_phone]
        
        # 5. حذف من video_watch_count
        watch_keys_to_delete = [key for key in video_watch_count.keys() if key.startswith(f"{student_phone}_")]
        for key in watch_keys_to_delete:
            del video_watch_count[key]
        
        # 6. حذف من used_codes
        codes_to_delete = []
        for code, code_data in used_codes.items():
            if code_data.get('studentPhone') == student_phone:
                codes_to_delete.append(code)
        for code in codes_to_delete:
            del used_codes[code]
        
        # 7. تحديث video_codes (إعادة تعيين used_by)
        for video_id, codes_list in video_codes.items():
            for code_data in codes_list:
                if code_data.get('used_by') == student_phone:
                    code_data['used'] = False
                    code_data['used_by'] = None
                    code_data['used_date'] = None
        
        # حفظ جميع التغييرات
        save_data(STUDENTS_FILE, updated_students)
        save_data(PURCHASED_COURSES_FILE, purchased_courses)
        save_data(STUDENT_POINTS_FILE, student_points)
        save_data(STUDENT_STATS_FILE, student_stats)
        save_data(POINTS_HISTORY_FILE, points_history)
        save_data(VIDEO_WATCH_COUNT_FILE, video_watch_count)
        save_data(USED_CODES_FILE, used_codes)
        save_data(VIDEO_CODES_FILE, video_codes)
        
        print(f"✅ تم حذف جميع بيانات الطالب: {student_phone}")
        message = 'تم حذف حساب الطالب وجميع سجلاته بنجاح'
    else:
        save_data(STUDENTS_FILE, updated_students)
        message = 'تم إجراء التغيير بنجاح'
    
    return jsonify({'success': True, 'message': message})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)