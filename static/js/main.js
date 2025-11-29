// وظائف عامة للمنصة

// إظهار/إخفاء النموذج المنبثق
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// إغلاق النوافذ المنبثقة عند النقر خارجها
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// إظهار رسائل التنبيه
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `flash-message ${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.flash-messages') || createFlashContainer();
    container.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function createFlashContainer() {
    const container = document.createElement('div');
    container.className = 'flash-messages';
    document.body.appendChild(container);
    return container;
}

// تحميل البيانات من API
// تحميل البيانات من API - محدث ومحسن
async function fetchData(url, options = {}) {
    try {
        console.log(`🔍 جلب بيانات من: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`خطأ في الخادم: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ تم تحميل البيانات بنجاح من: ${url}`, data);
        return data;
        
    } catch (error) {
        console.error(`❌ Error fetching data from ${url}:`, error);
        showAlert('حدث خطأ في تحميل البيانات. تأكد من اتصال الإنترنت وحاول مرة أخرى.', 'error');
        throw error;
    }
}

// إرسال البيانات إلى API
async function postData(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error posting data:', error);
        showAlert('حدث خطأ في إرسال البيانات', 'error');
        throw error;
    }
}

// تحميل الصور
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// تنسيق التاريخ
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ar-EG', options);
}

// تقييد إدخال الأرقام فقط
function restrictToNumbers(input) {
    input.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
}

// نسخ النص إلى الحافظة
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert('تم نسخ النص', 'success');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showAlert('فشل في نسخ النص', 'error');
    });
}

// تحقق من صحة البريد الإلكتروني
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// تحقق من صحة رقم الهاتف المصري
function isValidEgyptianPhone(phone) {
    const phoneRegex = /^(01)[0-9]{9}$/;
    return phoneRegex.test(phone);
}

// إضافة تأثير التحميل
function showLoading(element) {
    element.disabled = true;
    element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
}

function hideLoading(element, originalText) {
    element.disabled = false;
    element.innerHTML = originalText;
}

// إدارة حالة التبويبات
function initTabs(containerSelector, tabSelector, contentSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    const tabs = container.querySelectorAll(tabSelector);
    const contents = container.querySelectorAll(contentSelector);
    
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            // إزالة النشاط من جميع التبويبات
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // إضافة النشاط للتبويب والمحتوى المحدد
            tab.classList.add('active');
            if (contents[index]) {
                contents[index].classList.add('active');
            }
        });
    });
}


// تهيئة جميع الوظائف عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة التبويبات
    initTabs('.grade-tabs', '.grade-tab', '.grade-content');
    initTabs('.students-tabs', '.students-tab', '.students-content');
    
    // تقييد حقول الأرقام
    document.querySelectorAll('input[type="tel"]').forEach(input => {
        restrictToNumbers(input);
    });
    
    // إضافة تأثيرات للكروت
    document.querySelectorAll('.course-card, .stat-card').forEach(card => {
        card.classList.add('hover-lift');
    });
    
    // إضافة تأثيرات للصور
    document.querySelectorAll('.course-thumbnail img').forEach(img => {
        img.classList.add('zoom-on-hover');
    });
});
