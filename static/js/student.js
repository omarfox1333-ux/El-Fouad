// وظائف خاصة بلوحة تحكم الطالب

let currentSection = 'profile';
let videos = [];
let purchasedCourses = [];
let allCoursesFiltered = [];
let purchasedCoursesFiltered = [];

// تحميل البيانات الأولية
// تحميل البيانات الأولية - محدث ومحمي من الأخطاء
async function loadStudentData() {
    try {
        console.log('🎯 بدء تحميل بيانات الطالب...');
        
        // تحميل الفيديوهات أولاً
        console.log('📹 جاري تحميل الفيديوهات...');
        videos = await fetchData('/api/videos');
        console.log('✅ تم تحميل الفيديوهات:', videos.length, 'فيديو');
        
        // تحميل إحصائيات الطالب
        console.log('📊 جاري تحميل الإحصائيات...');
        const statsData = await fetchData('/api/student/stats');
        console.log('✅ تم تحميل الإحصائيات:', statsData);
        
        if (statsData.success) {
            updateStudentStats(statsData);
        } else {
            console.warn('⚠️ استجابة الإحصائيات غير ناجحة:', statsData);
        }
        
        // تحميل الكورسات المشتراة
        await loadPurchasedCourses();
        
        // تحميل الكورسات المتاحة
        loadAllCourses();
        
        // إضافة مستمعي البحث
        setupSearchListeners();
        
        console.log('🎉 تم تحميل جميع بيانات الطالب بنجاح');
        
    } catch (error) {
        console.error('❌ Error loading student data:', error);
        // لا تعيد showAlert هنا لأن fetchData already عرضت الرسالة
    }
}

// إعداد مستمعي البحث
function setupSearchListeners() {
    const allCoursesSearch = document.getElementById('allCoursesSearch');
    const myCoursesSearch = document.getElementById('myCoursesSearch');
    
    if (allCoursesSearch) {
        allCoursesSearch.addEventListener('input', function() {
            filterAllCourses(this.value);
        });
    }
    
    if (myCoursesSearch) {
        myCoursesSearch.addEventListener('input', function() {
            filterPurchasedCourses(this.value);
        });
    }
}

// تصفية الكورسات المتاحة
function filterAllCourses(searchTerm) {
    if (!searchTerm) {
        renderAllCourses(allCoursesFiltered);
        return;
    }
    
    const filtered = allCoursesFiltered.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    renderAllCourses(filtered);
}

// تصفية الكورسات المشتراة
function filterPurchasedCourses(searchTerm) {
    if (!searchTerm) {
        renderPurchasedCourses(purchasedCoursesFiltered);
        return;
    }
    
    const filtered = purchasedCoursesFiltered.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    renderPurchasedCourses(filtered);
}

// تحديث إحصائيات الطالب
function updateStudentStats(data) {
    const { stats, points, purchased_count } = data;
    
    if (document.getElementById('totalVideosWatched')) {
        document.getElementById('totalVideosWatched').textContent = stats.totalVideosWatched;
    }
    if (document.getElementById('purchasedCoursesCount')) {
        document.getElementById('purchasedCoursesCount').textContent = purchased_count;
    }
    if (document.getElementById('studentPoints')) {
        document.getElementById('studentPoints').textContent = points;
    }
    if (document.getElementById('lastWatched') && stats.lastWatched) {
        document.getElementById('lastWatched').textContent = formatDate(stats.lastWatched);
    }
}

// تحميل الكورسات المتاحة
function loadAllCourses() {
    const studentGrade = document.body.dataset.userGrade;
    
    console.log('تصفية الفيديوهات للصف:', studentGrade);
    allCoursesFiltered = videos.filter(video => video.grade === studentGrade);
    console.log('الفيديوهات المفلترة:', allCoursesFiltered);
    
    renderAllCourses(allCoursesFiltered);
}

// عرض الكورسات المتاحة - محدث بإضافة حقل إدخال لكل فيديو
// في renderAllCourses - تحديث الواجهة
// عرض الكورسات المتاحة - مصحح
function renderAllCourses(courses) {
    // ⭐ إصلاح: تعريف container أولاً
    const container = document.getElementById('allCoursesList');
    
    if (!container) {
        console.error('❌ عنصر allCoursesList غير موجود في الصفحة');
        return;
    }
    
    console.log('🎨 عرض الكورسات:', courses);
    
    if (!courses || courses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video-slash"></i>
                <h3>لا توجد كورسات متاحة</h3>
                <p>لا توجد كورسات متاحة لصفك الدراسي حالياً</p>
                <small>عدد الفيديوهات الإجمالي: ${videos.length}</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = courses.map(video => {
        const isPurchased = purchasedCourses.some(course => course.videoId === video.id);
        
        console.log(`🎬 ${video.title} - مشترى: ${isPurchased}`);
        
        return `
            <div class="course-card">
                <div class="course-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}" 
                         onerror="this.src='/static/images/default-thumbnail.jpg'">
                </div>
                <div class="course-info">
                    <h3>${video.title}</h3>
                    <p>${video.description}</p>
                    <div class="course-meta">
                        <span><i class="fas fa-calendar"></i> ${video.uploadDate}</span>
                        <span><i class="fas fa-eye"></i> ${video.views || 0} مشاهدة</span>
                    </div>
                    
                    ${isPurchased ? 
                        `<button class="btn btn-primary btn-rounded" onclick="watchVideo('${video.id}')">
                            <i class="fas fa-play"></i> مشاهدة الفيديو
                        </button>` :
                        `<button class="btn btn-outline-primary btn-rounded" onclick="showCodeModal('${video.id}')">
                            <i class="fas fa-lock"></i> إدخال الكود
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
    
    console.log('✅ تم عرض الكورسات بنجاح');
}

// عرض الكورسات المشتراة
// عرض الكورسات المشتراة - مصحح
function renderPurchasedCourses(courses) {
    // ⭐ إصلاح: تعريف container أولاً
    const container = document.getElementById('purchasedCoursesList');
    
    if (!container) {
        console.error('❌ عنصر purchasedCoursesList غير موجود في الصفحة');
        return;
    }
    
    console.log('🛒 عرض الكورسات المشتراة:', courses);
    
    if (!courses || courses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-bag"></i>
                <h3>لا توجد كورسات مشتراة</h3>
                <p>لم تقم بشراء أي كورسات بعد</p>
                <small>استخدم الأكواد لفتح الكورسات</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = courses.map(video => {
        console.log(`🛒 ${video.title} - جاهز للمشاهدة`);
        
        return `
            <div class="course-card purchased">
                <div class="course-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}" 
                         onerror="this.src='/static/images/default-thumbnail.jpg'">
                    <div class="purchased-badge">تم الشراء</div>
                </div>
                <div class="course-info">
                    <h3>${video.title}</h3>
                    <p>${video.description}</p>
                    <div class="course-meta">
                        <span><i class="fas fa-calendar"></i> ${video.uploadDate}</span>
                        <span><i class="fas fa-eye"></i> ${video.views || 0} مشاهدة</span>
                    </div>
                    <button class="btn btn-primary btn-rounded" onclick="watchVideo('${video.id}')">
                        <i class="fas fa-play"></i> مشاهدة الفيديو
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('✅ تم عرض الكورسات المشتراة بنجاح');
}
// إظهار نافذة إدخال الكود
function showCodeModal(videoId) {
    document.getElementById('videoId').value = videoId;
    showModal('codeModal');
}

// استخدام الكود
// استخدام الكود - محدث وآمن
async function useCode() {
    const codeInput = document.getElementById('codeInput');
    const videoIdInput = document.getElementById('videoId');
    
    // تحقق من وجود العناصر
    if (!codeInput || !videoIdInput) {
        console.error('❌ عناصر الإدخال غير موجودة');
        showAlert('خطأ في النظام، يرجى إعادة تحميل الصفحة', 'error');
        return;
    }
    
    const code = codeInput.value.trim();
    const videoId = videoIdInput.value;
    
    if (!code) {
        showAlert('يرجى إدخال الكود', 'error');
        return;
    }
    
    if (!videoId) {
        console.error('❌ videoId غير موجود:', videoId);
        showAlert('خطأ في تحديد الفيديو', 'error');
        return;
    }
    
    console.log('🔐 محاولة استخدام الكود:', { code, videoId });
    
    try {
        const button = document.querySelector('#codeModal .btn-primary');
        if (button) {
            const originalText = button.innerHTML;
            showLoading(button);
        }
        
        // استخدام API المحدث مع video_id
        const result = await postData('/api/videos/code/use', {
            code: code,
            video_id: videoId  // ⭐ هذا هو التغيير الوحيد المطلوب
        });
        
        if (result.success) {
            showAlert(result.message, 'success');
            hideModal('codeModal');
            codeInput.value = '';
            
            // إعادة تحميل البيانات لتحديث القائمة
            await loadStudentData();
            
        } else {
            showAlert(result.message, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error using code:', error);
        showAlert('حدث خطأ في استخدام الكود', 'error');
    } finally {
        const button = document.querySelector('#codeModal .btn-primary');
        if (button) {
            hideLoading(button, '<i class="fas fa-play"></i> مشاهدة');
        }
    }
}
// مشاهدة الفيديو
async function watchVideo(videoId) {
    try {
        // الانتقال لصفحة تشغيل الفيديو
        window.location.href = `/video/player/${videoId}`;
        
    } catch (error) {
        console.error('Error watching video:', error);
        showAlert('حدث خطأ أثناء تشغيل الفيديو', 'error');
    }
}

// تحميل جدول النقاط
async function loadPointsTable(grade = 'first') {
    try {
        const students = await fetchData(`/api/points/${grade}`);
        const container = document.getElementById('pointsTableContainer');
        
        if (!container) return;
        
        if (students.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <p>لا توجد بيانات للطلاب في هذا الصف</p>
                </div>
            `;
            return;
        }
        
        let tableHTML = `
            <table class="points-table">
                <thead>
                    <tr>
                        <th>الترتيب</th>
                        <th>اسم الطالب</th>
                        <th>النقاط</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        students.forEach((student, index) => {
            const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
            
            tableHTML += `
                <tr class="${rankClass}">
                    <td>
                        ${index + 1}
                    </td>
                    <td>${student.name}</td>
                    <td>${student.points || 0}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
        
    } catch (error) {
        console.error('Error loading points table:', error);
        showAlert('حدث خطأ في تحميل جدول النقاط', 'error');
    }
}

// تغيير تبويب النقاط
function changePointsTab(grade) {
    document.querySelectorAll('.grade-tabs .grade-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    loadPointsTable(grade);
}

// تبديل الأقسام
// تبديل الأقسام - مصحح
function showSection(sectionName) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.section-content').forEach(section => {
        section.style.display = 'none';
    });
    
    // إزالة النشاط من القائمة
    document.querySelectorAll('.sidebar li').forEach(item => {
        item.classList.remove('active');
    });
    
    // إضافة النشاط للعنصر المحدد
    event.target.classList.add('active');
    
    // إظهار القسم المطلوب
    const section = document.getElementById(sectionName + 'Section');
    if (section) {
        section.style.display = 'block';
    }
    
    // تحديث العنوان
    const titles = {
        'profile': 'الملف الشخصي',
        'pointsSystem': 'نظام النقاط',
        'allCourses': 'الكورسات الإجمالية',
        'myCourses': 'الكورسات المشتراة'
    };
    
    const titleElement = document.getElementById('sectionTitle');
    if (titleElement) {
        titleElement.textContent = titles[sectionName] || 'اللوحة الرئيسية';
    }
    
    // ⭐ إصلاح: تحميل بيانات القسم إذا لزم الأمر
    currentSection = sectionName;
    if (sectionName === 'pointsSystem') {
        loadPointsTable();
    } else if (sectionName === 'allCourses') {
        loadAllCourses();
    } else if (sectionName === 'myCourses') {
        // ⭐ إصلاح: استدعاء الدالة الصحيحة
        loadPurchasedCourses();
    }
}
function setupSearchListeners() {
    const allCoursesSearch = document.getElementById('allCoursesSearch');
    const myCoursesSearch = document.getElementById('myCoursesSearch');
    
    if (allCoursesSearch) {
        allCoursesSearch.addEventListener('input', function() {
            const searchTerm = this.value;
            const searchBox = this.closest('.search-box');
            const clearBtn = searchBox.querySelector('.search-clear');
            
            // إظهار/إخفاء زر المسح
            if (searchTerm.length > 0) {
                searchBox.classList.add('has-text');
                clearBtn.style.display = 'flex';
            } else {
                searchBox.classList.remove('has-text');
                clearBtn.style.display = 'none';
            }
            
            filterAllCourses(searchTerm);
        });
        
        // إضافة مستمع لزر المسح
        const allClearBtn = allCoursesSearch.closest('.search-box').querySelector('.search-clear');
        allClearBtn.addEventListener('click', function() {
            allCoursesSearch.value = '';
            allCoursesSearch.focus();
            this.style.display = 'none';
            allCoursesSearch.closest('.search-box').classList.remove('has-text');
            filterAllCourses('');
        });
    }
    
    if (myCoursesSearch) {
        myCoursesSearch.addEventListener('input', function() {
            const searchTerm = this.value;
            const searchBox = this.closest('.search-box');
            const clearBtn = searchBox.querySelector('.search-clear');
            
            // إظهار/إخفاء زر المسح
            if (searchTerm.length > 0) {
                searchBox.classList.add('has-text');
                clearBtn.style.display = 'flex';
            } else {
                searchBox.classList.remove('has-text');
                clearBtn.style.display = 'none';
            }
            
            filterPurchasedCourses(searchTerm);
        });
        
        // إضافة مستمع لزر المسح
        const myClearBtn = myCoursesSearch.closest('.search-box').querySelector('.search-clear');
        myClearBtn.addEventListener('click', function() {
            myCoursesSearch.value = '';
            myCoursesSearch.focus();
            this.style.display = 'none';
            myCoursesSearch.closest('.search-box').classList.remove('has-text');
            filterPurchasedCourses('');
        });
    }
    
    // إضافة تأثيرات للبحث عند التركيز
    document.querySelectorAll('.search-box input').forEach(input => {
        input.addEventListener('focus', function() {
            this.closest('.search-box').classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.closest('.search-box').classList.remove('focused');
        });
    });
}

// تصفية الكورسات المتاحة مع تأثيرات
function filterAllCourses(searchTerm) {
    const container = document.getElementById('allCoursesList');
    
    // إضافة تأثير التحميل
    container.classList.add('search-loading');
    
    setTimeout(() => {
        if (!searchTerm) {
            renderAllCourses(allCoursesFiltered);
        } else {
            const filtered = allCoursesFiltered.filter(course => 
                course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            renderAllCourses(filtered);
        }
        
        // إزالة تأثير التحميل
        container.classList.remove('search-loading');
    }, 300);
}

// تصفية الكورسات المشتراة مع تأثيرات
function filterPurchasedCourses(searchTerm) {
    const container = document.getElementById('purchasedCoursesList');
    
    // إضافة تأثير التحميل
    container.classList.add('search-loading');
    
    setTimeout(() => {
        if (!searchTerm) {
            renderPurchasedCourses(purchasedCoursesFiltered);
        } else {
            const filtered = purchasedCoursesFiltered.filter(course => 
                course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            renderPurchasedCourses(filtered);
        }
        
        // إزالة تأثير التحميل
        container.classList.remove('search-loading');
    }, 300);
}

// تحديث وظيفة تهيئة لوحة الطالب
document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('student-dashboard')) {
        console.log('تهيئة لوحة الطالب...');
        loadStudentData();
        
        // إضافة مستمعين للأحداث
        document.getElementById('useCodeBtn')?.addEventListener('click', useCode);
        
        // إدخال الكود بالضغط على Enter
        document.getElementById('codeInput')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                useCode();
            }
        });
        
        // إضافة تأثيرات إضافية للبحث
        setupSearchEffects();
    }
});

// تأثيرات إضافية للبحث
function setupSearchEffects() {
    // تأثيرات عند تحميل الصفحة
    const searchBoxes = document.querySelectorAll('.search-box');
    searchBoxes.forEach(box => {
        box.style.opacity = '0';
        box.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            box.style.transition = 'all 0.5s ease';
            box.style.opacity = '1';
            box.style.transform = 'translateY(0)';
        }, 300);
    });
}
// إضافة هذا الكود في نهاية student.js للتحقق
document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('student-dashboard')) {
        console.log('🎯 بدء تهيئة لوحة الطالب...');
        
        // اختبار تحميل البيانات
        setTimeout(async () => {
            try {
                console.log('🔍 اختبار تحميل الفيديوهات...');
                const testVideos = await fetchData('/api/videos');
                console.log('✅ اختبار الفيديوهات:', testVideos);
                
                console.log('🔍 اختبار الفيديوهات المتاحة...');
                const testAvailable = await fetchData('/api/student/available-videos');
                console.log('✅ اختبار الفيديوهات المتاحة:', testAvailable);
                
            } catch (error) {
                console.error('❌ اختبار الفشل:', error);
            }
        }, 1000);
        
        loadStudentData();
        
        // إضافة مستمعين للأحداث
        document.getElementById('useCodeBtn')?.addEventListener('click', useCode);
        
        // إدخال الكود بالضغط على Enter
        document.getElementById('codeInput')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                useCode();
            }
        });
    }
});
// استخدام كود فيديو محدد - النظام الجديد
// استخدام كود فيديو محدد - التأكد من إرسال الفيديو الصحيح
// استخدام كود فيديو محدد - محدث
// استخدام كود فيديو محدد
async function useVideoCode(videoId) {
    const codeInput = document.getElementById(`codeInput_${videoId}`);
    
    if (!codeInput) {
        showAlert('خطأ في النظام', 'error');
        return;
    }
    
    const code = codeInput.value.trim();
    
    if (!code) {
        showAlert('يرجى إدخال الكود', 'error');
        return;
    }
    
    console.log(`🔐 محاولة استخدام الكود: ${code} للفيديو: ${videoId}`);
    
    try {
        const result = await postData('/api/videos/code/use', {
            code: code,
            video_id: videoId  // ⭐ نرسل الفيديو الحالي
        });
        
        if (result.success) {
            showAlert(result.message, 'success');
            codeInput.value = '';
            await loadStudentData();
        } else {
            showAlert(result.message, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error using video code:', error);
        showAlert('حدث خطأ في استخدام الكود', 'error');
    }
}
function diagnoseErrors() {
    console.group('🔍 تشخيص الأخطاء');
    
    // التحقق من العناصر الأساسية
    console.log('✅ body يحتوي student-dashboard:', document.body.classList.contains('student-dashboard'));
    console.log('✅ عنصر allCoursesList:', document.getElementById('allCoursesList'));
    console.log('✅ user grade:', document.body.dataset.userGrade);
    
    // اختبار APIs
    testAPIs();
    
    console.groupEnd();
}

// اختبار جميع APIs
async function testAPIs() {
    console.group('🧪 اختبار APIs');
    
    try {
        // اختبار API الفيديوهات
        const videosTest = await fetch('/api/videos');
        console.log('✅ /api/videos status:', videosTest.status);
        
        // اختبار API الإحصائيات
        const statsTest = await fetch('/api/student/stats');
        console.log('✅ /api/student/stats status:', statsTest.status);
        
        // اختبار API الكورسات المشتراة
        const purchasedTest = await fetch('/api/student/purchased-courses');
        console.log('✅ /api/student/purchased-courses status:', purchasedTest.status);
        
    } catch (error) {
        console.error('❌ اختبار APIs فشل:', error);
    }
    
    console.groupEnd();
}// ⭐ إضافة الدالة المفقودة loadPurchasedCourses
async function loadPurchasedCourses() {
    try {
        console.log('🛒 جاري تحميل الكورسات المشتراة...');
        const response = await fetchData('/api/student/purchased-courses');
        
        if (response.success) {
            purchasedCourses = response.courses || [];
            console.log('✅ تم تحميل الكورسات المشتراة:', purchasedCourses.length, 'كورس');
            
            const purchasedVideos = videos.filter(video => 
                purchasedCourses.some(course => course.videoId === video.id)
            );
            
            purchasedCoursesFiltered = purchasedVideos;
            renderPurchasedCourses(purchasedCoursesFiltered);
        } else {
            console.warn('⚠️ استجابة الكورسات المشتراة غير ناجحة:', response);
            purchasedCourses = [];
        }
        
    } catch (error) {
        console.error('❌ Error loading purchased courses:', error);
        purchasedCourses = [];
    }
}