// وظائف خاصة بلوحة تحكم المعلم

let students = [];
let videos = [];
let allStudents = [];
let allVideos = [];
let currentSearchQuery = '';
let currentVideoFilter = 'all';
let currentVideoSearch = '';

// نظام التحديث التلقائي
let autoRefreshInterval;
const REFRESH_INTERVAL = 30000; // 30 ثانية

// ==================== نظام التحديث التلقائي ====================

function startAutoRefresh() {
    console.log('🔄 بدء التحديث التلقائي...');
    
    // تحديث فوري أولي
    refreshDashboardData();
    
    // تحديد التحديث كل 30 ثانية
    autoRefreshInterval = setInterval(refreshDashboardData, REFRESH_INTERVAL);
    
    // أيضاً تحديث عند عودة التركيز للنافذة
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            refreshDashboardData();
        }
    });
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        console.log('⏹️ إيقاف التحديث التلقائي');
    }
}

function refreshDashboardData() {
    console.log('🔄 تحديث البيانات...');
    
    const currentSection = getCurrentTeacherSection();
    
    // تحديث البيانات حسب القسم النشط
    switch (currentSection) {
        case 'teacherHome':
            refreshHomeStats();
            break;
        case 'studentsList':
            refreshStudentsData();
            break;
        case 'videosList':
            refreshVideosData();
            break;
        case 'teacherPoints':
            refreshPointsData();
            break;
    }
    
    // تحديث الوقت الأخير
    updateLastRefreshTime();
}

function getCurrentTeacherSection() {
    const sections = {
        'teacherHomeSection': 'teacherHome',
        'studentsListSection': 'studentsList', 
        'videosListSection': 'videosList',
        'teacherPointsSection': 'teacherPoints',
        'uploadVideoSection': 'uploadVideo'
    };
    
    for (const [sectionId, sectionName] of Object.entries(sections)) {
        const section = document.getElementById(sectionId);
        if (section && section.style.display !== 'none') {
            return sectionName;
        }
    }
    return 'teacherHome';
}

function updateLastRefreshTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ar-EG');
    
    // إضافة أو تحديث مؤشر التحديث
    let refreshIndicator = document.getElementById('refreshIndicator');
    if (!refreshIndicator) {
        refreshIndicator = document.createElement('div');
        refreshIndicator.id = 'refreshIndicator';
        refreshIndicator.className = 'refresh-indicator';
        document.querySelector('.main-content').appendChild(refreshIndicator);
    }
    
    refreshIndicator.innerHTML = `
        <div class="refresh-info">
         
        </div>
    `;
}

function manualRefresh() {
    showNotification('جاري تحديث البيانات...', 'info');
    refreshDashboardData();
    showNotification('تم تحديث البيانات', 'success');
}

// ==================== نظام التحديث التلقائي - نهاية ====================

// ==================== نظام إدارة الطلاب ====================

function refreshHomeStats() {
    fetch('/api/students')
        .then(response => response.json())
        .then(students => {
            document.getElementById('totalStudents').textContent = students.length;
        })
        .catch(error => console.error('Error refreshing students count:', error));
    
    fetch('/api/videos')
        .then(response => response.json())
        .then(videos => {
            document.getElementById('totalVideos').textContent = videos.length;
            
            // حساب إجمالي المشاهدات
            const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0);
            document.getElementById('totalViews').textContent = totalViews.toLocaleString();
        })
        .catch(error => console.error('Error refreshing videos count:', error));
}

function refreshStudentsData() {
    loadAllStudents();
}

function updateStudentsCount() {
    const firstGradeCount = allStudents.filter(s => s.grade === 'أولى ثانوي').length;
    const secondGradeCount = allStudents.filter(s => s.grade === 'ثانية ثانوي').length;
    const thirdGradeCount = allStudents.filter(s => s.grade === 'تالتة ثانوي').length;
    
    document.getElementById('firstGradeCount').textContent = firstGradeCount;
    document.getElementById('secondGradeCount').textContent = secondGradeCount;
    document.getElementById('thirdGradeCount').textContent = thirdGradeCount;
    
    // تحديث الإحصائيات العامة
    document.getElementById('totalStudents').textContent = allStudents.length;
}

function loadAllStudents() {
    fetch('/api/students')
        .then(response => response.json())
        .then(students => {
            allStudents = students;
            updateStudentsCount();
        })
        .catch(error => {
            console.error('Error loading students:', error);
        });
}

function loadStudentsTable(grade = 'first') {
    const container = document.getElementById('studentsTableBody');
    if (!container) return;
    
    const gradeText = {
        'first': 'أولى ثانوي',
        'second': 'ثانية ثانوي',
        'third': 'تالتة ثانوي'
    }[grade] || 'أولى ثانوي';
    
    const filteredStudents = allStudents.filter(student => student.grade === gradeText);
    
    if (filteredStudents.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    <div class="empty-state">
                        <i class="fas fa-users-slash"></i>
                        <p>لا توجد حسابات طلاب مسجلة في هذا الصف</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = filteredStudents.map(student => `
        <tr>
            <td>${student.name}</td>
            <td>${student.phone}</td>
            <td>${student.parentPhone}</td>
            <td>${student.educationType}</td>
            <td>${student.points || 0}</td>
            <td>
                <span class="status-badge ${student.status === 'active' ? 'active' : 'banned'}">
                    ${student.status === 'active' ? 'نشط' : 'محظور'}
                </span>
            </td>
            <td>
                <button class="action-btn" onclick="manageStudent('${student.phone}')" title="إدارة الحساب">
                    <i class="fas fa-cog"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function changeStudentsTab(grade) {
    document.querySelectorAll('.students-tabs .students-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    loadStudentsTable(grade);
}

// ==================== نظام البحث في الطلاب ====================

function initializeSearch() {
    const searchInput = document.getElementById('studentSearch');
    const clearButton = document.getElementById('clearSearch');
    const resultsInfo = document.getElementById('searchResultsInfo');
    
    if (!searchInput) return;
    
    // حدث الكتابة في البحث
    searchInput.addEventListener('input', function(e) {
        currentSearchQuery = e.target.value.trim();
        
        if (currentSearchQuery.length > 0) {
            clearButton.style.display = 'flex';
            performSearch(currentSearchQuery);
        } else {
            clearButton.style.display = 'none';
            clearSearch();
        }
    });
    
    // حدث مسح البحث
    clearButton.addEventListener('click', function() {
        searchInput.value = '';
        currentSearchQuery = '';
        clearButton.style.display = 'none';
        clearSearch();
        searchInput.focus();
    });
    
    // حدث الضغط على Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(currentSearchQuery);
        }
    });
}

function performSearch(query) {
    if (!query || query.length < 2) {
        clearSearch();
        return;
    }
    
    const filteredStudents = allStudents.filter(student => 
        student.name.toLowerCase().includes(query.toLowerCase()) ||
        student.phone.includes(query)
    );
    
    displaySearchResults(filteredStudents, query);
    updateSearchInfo(filteredStudents.length, query);
}

function displaySearchResults(students, query) {
    const tableBody = document.getElementById('studentsTableBody');
    const noResults = document.getElementById('noResults');
    
    if (students.length === 0) {
        tableBody.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    let html = '';
    students.forEach(student => {
        const highlightedName = highlightText(student.name, query);
        
        html += `
            <tr class="search-match">
                <td>${highlightedName}</td>
                <td>${student.phone}</td>
                <td>${student.parentPhone || 'غير متوفر'}</td>
                <td>${student.educationType || 'غير محدد'}</td>
                <td>
                    <span class="points-badge">${student.points || 0}</span>
                </td>
                <td>
                    <span class="status-badge ${student.status || 'active'}">
                        ${student.status === 'active' ? 'نشط' : 'محظور'}
                    </span>
                </td>
                <td>
                    <button class="action-btn" onclick="manageStudent('${student.phone}')" title="إدارة الطالب">
                        <i class="fas fa-cog"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function highlightText(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function updateSearchInfo(resultsCount, query) {
    const resultsInfo = document.getElementById('searchResultsInfo');
    
    if (resultsCount > 0) {
        resultsInfo.innerHTML = `
            <span>عثرنا على </span>
            <span class="results-count">${resultsCount}</span>
            <span> طالب للبحث: "</span>
            <span class="search-query">${query}</span>
            <span>"</span>
        `;
        resultsInfo.classList.add('show');
    } else {
        resultsInfo.classList.remove('show');
    }
}

function clearSearch() {
    const resultsInfo = document.getElementById('searchResultsInfo');
    const noResults = document.getElementById('noResults');
    
    resultsInfo.classList.remove('show');
    noResults.style.display = 'none';
    
    // إعادة تحميل الطلاب حسب التبويب الحالي
    loadStudentsForCurrentTab();
}

function loadStudentsForCurrentTab() {
    const activeTab = document.querySelector('.students-tab.active');
    if (activeTab) {
        const grade = activeTab.getAttribute('onclick').match(/'(\w+)'/)[1];
        loadStudentsTable(grade);
    }
}

// ==================== نظام إدارة الطلاب - نهاية ====================

// ==================== نظام إدارة الفيديوهات ====================

function refreshVideosData() {
    loadAllVideos();
}

async function loadAllVideos() {
    try {
        const response = await fetch('/api/videos');
        if (!response.ok) throw new Error('فشل في تحميل الفيديوهات');
        
        allVideos = await response.json();
        updateVideosCount();
        displayVideosGrid();
        
        console.log(`✅ تم تحميل ${allVideos.length} فيديو`);
    } catch (error) {
        console.error('Error loading videos:', error);
        showNotification('حدث خطأ في تحميل الفيديوهات', 'error');
    }
}

function updateVideosCount() {
    const allCount = allVideos.length;
    const firstCount = allVideos.filter(v => v.grade === 'أولى ثانوي').length;
    const secondCount = allVideos.filter(v => v.grade === 'ثانية ثانوي').length;
    const thirdCount = allVideos.filter(v => v.grade === 'تالتة ثانوي').length;
    
    // تحديث جميع العدادات
    document.querySelectorAll('.tab-badge').forEach(badge => {
        const parentTab = badge.closest('.filter-tab');
        if (parentTab) {
            const onclickAttr = parentTab.getAttribute('onclick');
            if (onclickAttr) {
                if (onclickAttr.includes("'all'")) {
                    badge.textContent = allCount;
                } else if (onclickAttr.includes("'أولى ثانوي'")) {
                    badge.textContent = firstCount;
                } else if (onclickAttr.includes("'ثانية ثانوي'")) {
                    badge.textContent = secondCount;
                } else if (onclickAttr.includes("'تالتة ثانوي'")) {
                    badge.textContent = thirdCount;
                }
            }
        }
    });
}

function displayVideosGrid() {
    const videosContainer = document.getElementById('videosList');
    const noVideos = document.getElementById('noVideosFound');
    
    if (!videosContainer) {
        console.error('❌ عنصر videosList غير موجود');
        return;
    }
    
    let filteredVideos = allVideos;
    
    // تطبيق التصفية حسب الصف
    if (currentVideoFilter !== 'all') {
        filteredVideos = filteredVideos.filter(video => video.grade === currentVideoFilter);
    }
    
    // تطبيق البحث
    if (currentVideoSearch) {
        filteredVideos = filteredVideos.filter(video => 
            video.title.toLowerCase().includes(currentVideoSearch.toLowerCase()) ||
            video.description.toLowerCase().includes(currentVideoSearch.toLowerCase())
        );
    }
    
    if (filteredVideos.length === 0) {
        videosContainer.innerHTML = '';
        if (noVideos) noVideos.style.display = 'block';
        return;
    }
    
    if (noVideos) noVideos.style.display = 'none';
    
    let html = '';
    filteredVideos.forEach(video => {
        html += `
            <div class="video-card">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}" 
                         onerror="this.src='/static/images/default-thumbnail.jpg'">
                    <div class="video-overlay">
                        <div class="play-button" onclick="previewVideo('${video.id}')">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                    <div class="watch-count">
                        <i class="fas fa-eye"></i> ${video.views || 0}
                    </div>
                </div>
                
                <div class="video-info">
                    <div class="video-header">
                        <h3 class="video-title">${video.title}</h3>
                        <div class="video-actions">
                            <button class="video-action-btn code-btn" onclick="openGenerateCodesModal('${video.id}')" 
                                    title="إدارة الأكواد">
                                <i class="fas fa-key"></i>
                            </button>
                            <button class="video-action-btn delete-btn" onclick="deleteVideo('${video.id}')" 
                                    title="حذف الفيديو">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <p class="video-description">${video.description}</p>
                    
                    <div class="video-meta">
                        <span class="video-grade">${video.grade}</span>
                        <div class="video-stats">
                            <span class="video-stat">
                                <i class="fas fa-calendar"></i>
                                ${video.uploadDate}
                            </span>
                            <span class="video-stat">
                                <i class="fas fa-hashtag"></i>
                                ${video.id.substring(0, 8)}...
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    videosContainer.innerHTML = html;
}

function filterVideos(grade) {
    currentVideoFilter = grade;
    
    // تحديد الأزرار النشطة
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    displayVideosGrid();
    updateVideoSearchInfo();
    updateVideosCount(); // تحديث الأرقام
}

function previewVideo(videoId) {
    window.open(`/video/player/${videoId}`, '_blank');
}

// ==================== نظام البحث في الفيديوهات ====================

function initializeVideoSearch() {
    const searchInput = document.getElementById('videoSearch');
    const clearButton = document.getElementById('clearVideoSearch');
    const resultsInfo = document.getElementById('videoSearchResultsInfo');
    
    if (!searchInput) {
        console.error('❌ عنصر videoSearch غير موجود');
        return;
    }
    
    // حدث الكتابة في البحث
    searchInput.addEventListener('input', function(e) {
        currentVideoSearch = e.target.value.trim();
        
        if (currentVideoSearch.length > 0) {
            if (clearButton) clearButton.style.display = 'flex';
            performVideoSearch(currentVideoSearch);
        } else {
            if (clearButton) clearButton.style.display = 'none';
            clearVideoSearch();
        }
    });
    
    // حدث مسح البحث
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            searchInput.value = '';
            currentVideoSearch = '';
            clearButton.style.display = 'none';
            clearVideoSearch();
            searchInput.focus();
        });
    }
    
    // حدث الضغط على Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performVideoSearch(currentVideoSearch);
        }
    });
}

function performVideoSearch(query) {
    currentVideoSearch = query;
    displayVideosGrid();
    updateVideoSearchInfo();
}

function updateVideoSearchInfo() {
    const resultsInfo = document.getElementById('videoSearchResultsInfo');
    if (!resultsInfo) return;
    
    let filteredVideos = allVideos;
    
    if (currentVideoFilter !== 'all') {
        filteredVideos = filteredVideos.filter(video => video.grade === currentVideoFilter);
    }
    
    if (currentVideoSearch) {
        filteredVideos = filteredVideos.filter(video => 
            video.title.toLowerCase().includes(currentVideoSearch.toLowerCase()) ||
            video.description.toLowerCase().includes(currentVideoSearch.toLowerCase())
        );
    }
    
    if (currentVideoSearch && filteredVideos.length > 0) {
        resultsInfo.innerHTML = `
            <span>عثرنا على </span>
            <span class="results-count">${filteredVideos.length}</span>
            <span> فيديو للبحث: "</span>
            <span class="search-query">${currentVideoSearch}</span>
            <span>"</span>
        `;
        resultsInfo.classList.add('show');
    } else {
        resultsInfo.classList.remove('show');
    }
}

function clearVideoSearch() {
    const searchInput = document.getElementById('videoSearch');
    const resultsInfo = document.getElementById('videoSearchResultsInfo');
    
    if (searchInput) searchInput.value = '';
    currentVideoSearch = '';
    
    if (resultsInfo) resultsInfo.classList.remove('show');
    
    displayVideosGrid();
    updateVideosCount(); // تحديث الأرقام
}

// ==================== نظام إدارة الفيديوهات - نهاية ====================

// ==================== نظام الأكواد المتقدمة ====================

function openGenerateCodesModal(videoId = null) {
    // تعبئة قائمة الفيديوهات
    const videoSelect = document.getElementById('videoForCodes');
    if (videoSelect && allVideos.length > 0) {
        videoSelect.innerHTML = allVideos.map(video => 
            `<option value="${video.id}" ${videoId === video.id ? 'selected' : ''}>
                ${video.title} - ${video.grade} (ID: ${video.id})
            </option>`
        ).join('');
        
        // إذا لم يكن هناك فيديو محدد، اختر الأول
        if (!videoId && allVideos.length > 0) {
            videoSelect.value = allVideos[0].id;
        }
    } else if (videoSelect) {
        videoSelect.innerHTML = '<option value="">لا توجد فيديوهات متاحة</option>';
    }
    
    // إعادة تعيين عدد الأكواد
    const codesCountInput = document.getElementById('codesCount');
    if (codesCountInput) {
        codesCountInput.value = 1;
    }
    
    showModal('generateCodesModal');
}

function validateVideoSelection(videoId) {
    if (!videoId) {
        showAlert('يرجى اختيار فيديو', 'error');
        return false;
    }
    
    const videoExists = allVideos.some(video => video.id === videoId);
    if (!videoExists) {
        showAlert('الفيديو المحدد غير موجود', 'error');
        return false;
    }
    
    return true;
}

async function generateMultipleCodes() {
    const countInput = document.getElementById('codesCount');
    const videoSelect = document.getElementById('videoForCodes');
    
    if (!countInput || !videoSelect) {
        showAlert('عناصر الواجهة غير موجودة', 'error');
        return;
    }
    
    const count = parseInt(countInput.value);
    const videoId = videoSelect.value;
    
    // التحقق من صحة العدد
    if (!count || isNaN(count) || count < 1 || count > 100) {
        showAlert('يرجى إدخال عدد صحيح بين 1 و 100', 'error');
        return;
    }
    
    // التحقق من صحة الفيديو
    if (!validateVideoSelection(videoId)) {
        return;
    }
    
    try {
        const button = document.querySelector('#generateCodesModal .btn-primary');
        const originalText = button.innerHTML;
        showLoading(button);
        
        const response = await fetch(`/api/videos/${videoId}/codes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ count: count })
        });
        
        const result = await response.json();
        
        if (result.success) {
            hideModal('generateCodesModal');
            showGeneratedCodes(result.codes, videoId, result.video_title);
        } else {
            showAlert(result.message, 'error');
        }
        
    } catch (error) {
        console.error('Error generating codes:', error);
        showAlert('حدث خطأ في توليد الأكواد', 'error');
    } finally {
        const button = document.querySelector('#generateCodesModal .btn-primary');
        if (button) {
            hideLoading(button, '<i class="fas fa-key"></i> توليد الأكواد');
        }
    }
}

function showGeneratedCodes(codes, videoId, videoTitle) {
    const video = allVideos.find(v => v.id === videoId);
    const title = videoTitle || (video ? video.title : 'غير معروف');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2><i class="fas fa-key"></i> الأكواد المولدة</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div style="padding: 1.5rem;">
                <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                    <div>
                        <strong>الفيديو:</strong> ${title}
                    </div>
                    <div>
                        <strong>عدد الأكواد:</strong> ${codes.length}
                    </div>
                    <div>
                        <strong>ID الفيديو:</strong> ${videoId}
                    </div>
                </div>
                
                <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
                    <button class="btn btn-primary btn-sm" onclick="downloadCodesAsTxt(${JSON.stringify(codes).replace(/"/g, '&quot;')}, '${title}')">
                        <i class="fas fa-download"></i> تحميل كملف txt
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="copyAllCodes(${JSON.stringify(codes).replace(/"/g, '&quot;')})">
                        <i class="fas fa-copy"></i> نسخ الكل
                    </button>
                </div>
                
                <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; background: #f8f9fa;">
                    ${codes.map((code, index) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; 
                                  padding: 0.8rem; margin: 0.5rem 0; background: white; border-radius: 8px; 
                                  border: 1px solid #e5e7eb;">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <span style="font-weight: bold; color: #6b7280;">${index + 1}.</span>
                                <span style="font-family: 'Courier New', monospace; font-size: 1.2rem; font-weight: bold; color: #1e40af;">
                                    ${code}
                                </span>
                            </div>
                            <button class="btn btn-outline-primary btn-sm" onclick="copyToClipboard('${code}')">
                                <i class="fas fa-copy"></i> نسخ
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 1rem; padding: 1rem; background: #f0f9ff; border-radius: 8px; border-right: 4px solid #3b82f6;">
                    <p style="margin: 0; color: #0369a1; font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> 
                        <strong>معلومات مهمة:</strong><br>
                        • كل كود صالح للاستخدام مرة واحدة فقط<br>
                        • الكود سيعمل فقط على الفيديو: ${title}<br>
                        • ID الفيديو: ${videoId}<br>
                        • لا يمكن استخدام الكود لأي فيديو آخر
                    </p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // إغلاق النافذة عند النقر خارجها
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function downloadCodesAsTxt(codes, videoTitle) {
    const content = `أكواد فيديو: ${videoTitle}
تم الإنشاء: ${new Date().toLocaleString('ar-EG')}
عدد الأكواد: ${codes.length}

${codes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

ملاحظة: كل كود صالح للاستخدام مرة واحدة فقط على الفيديو المحدد.`;
    
    const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `اكواد_${videoTitle.replace(/[^\w\u0600-\u06FF]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('تم تحميل الملف بنجاح', 'success');
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('تم نسخ النص بنجاح', 'success');
    }).catch(err => {
        console.error('فشل في نسخ النص: ', err);
        showNotification('فشل في نسخ النص', 'error');
    });
}

function copyAllCodes(codes) {
    const text = codes.map((code, index) => `${index + 1}. ${code}`).join('\n');
    copyToClipboard(text);
    showNotification('تم نسخ جميع الأكواد', 'success');
}

function generateCode(videoId) {
    openGenerateCodesModal(videoId);
}

// ==================== نظام الأكواد المتقدمة - نهاية ====================

// ==================== نظام رفع الفيديوهات ====================

async function uploadVideo() {
    const formData = new FormData();
    const videoFile = document.getElementById('videoFile').files[0];
    const thumbnailFile = document.getElementById('videoThumbnail').files[0];
    const title = document.getElementById('videoTitle').value;
    const description = document.getElementById('videoDescription').value;
    const grade = document.getElementById('videoGrade').value;
    
    if (!videoFile || !title || !description) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    formData.append('video', videoFile);
    if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
    }
    formData.append('title', title);
    formData.append('description', description);
    formData.append('grade', grade);
    
    try {
        const button = document.querySelector('#uploadVideoSection .btn-primary');
        const originalText = button.innerHTML;
        showLoading(button);
        
        const response = await fetch('/api/videos/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            resetUploadForm();
            loadTeacherData();
        } else {
            showAlert(result.message, 'error');
        }
        
    } catch (error) {
        console.error('Error uploading video:', error);
        showAlert('حدث خطأ أثناء رفع الفيديو', 'error');
    } finally {
        const button = document.querySelector('#uploadVideoSection .btn-primary');
        hideLoading(button, '<i class="fas fa-upload"></i> رفع الفيديو');
    }
}

function resetUploadForm() {
    document.getElementById('videoFile').value = '';
    document.getElementById('videoThumbnail').value = '';
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoDescription').value = '';
    document.getElementById('videoGrade').value = 'first';
    document.getElementById('thumbnailPreview').style.display = 'none';
    
    const fileUpload = document.querySelector('.file-upload');
    if (fileUpload) {
        fileUpload.querySelector('h3').textContent = 'انقر لرفع فيديو';
        fileUpload.querySelector('p').textContent = 'يمكنك رفع ملفات الفيديو من جهازك';
    }
}

function previewThumbnail(input) {
    const preview = document.getElementById('thumbnailPreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة المصغرة">`;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

async function deleteVideo(videoId) {
    const video = allVideos.find(v => v.id === videoId);
    const videoTitle = video ? video.title : 'هذا الفيديو';
    
    if (!confirm(`هل أنت متأكد من رغبتك في حذف الفيديو "${videoTitle}"؟\nسيتم حذف الفيديو وجميع الأكواد المرتبطة به نهائياً.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/videos/${videoId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            loadTeacherData();
        } else {
            showAlert(result.message, 'error');
        }
        
    } catch (error) {
        console.error('Error deleting video:', error);
        showAlert('حدث خطأ في الاتصال بالخادم', 'error');
    }
}

// ==================== نظام رفع الفيديوهات - نهاية ====================

// ==================== نظام إدارة الطلاب المتقدم ====================

function manageStudent(phone) {
    const student = allStudents.find(s => s.phone === phone);
    if (!student) return;
    
    document.getElementById('studentManagementContent').innerHTML = `
        <div class="user-info">
            <div class="info-grid">
                <div class="info-item">
                    <label>الطالب:</label>
                    <span>${student.name}</span>
                </div>
                <div class="info-item">
                    <label>رقم الهاتف:</label>
                    <span>${student.phone}</span>
                </div>
                <div class="info-item">
                    <label>رقم ولي الأمر:</label>
                    <span>${student.parentPhone}</span>
                </div>
                <div class="info-item">
                    <label>الصف:</label>
                    <span>${student.grade}</span>
                </div>
                <div class="info-item">
                    <label>النظام:</label>
                    <span>${student.educationType}</span>
                </div>
                <div class="info-item">
                    <label>النقاط:</label>
                    <span>${student.points || 0}</span>
                </div>
                <div class="info-item">
                    <label>الحالة:</label>
                    <span>${student.status === 'active' ? 'نشط' : 'محظور'}</span>
                </div>
            </div>
        </div>
        
        <div class="form-group">
            <label>كلمة المرور الجديدة:</label>
            <input type="password" id="newStudentPassword" placeholder="أدخل كلمة المرور الجديدة">
        </div>
        
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="changeStudentStatus('${student.phone}', '${student.status === 'active' ? 'banned' : 'active'}')">
                <i class="fas ${student.status === 'active' ? 'fa-ban' : 'fa-check'}"></i> 
                ${student.status === 'active' ? 'حظر الحساب' : 'تفعيل الحساب'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteStudent('${student.phone}')">
                <i class="fas fa-trash"></i> حذف الحساب
            </button>
        </div>
    `;
    
    showModal('studentManagementModal');
}

async function changeStudentStatus(phone, newStatus) {
    try {
        const result = await postData('/api/students/manage', {
            student_phone: phone,
            action: 'change_status',
            new_status: newStatus
        });
        
        if (result.success) {
            showAlert(`تم ${newStatus === 'active' ? 'تفعيل' : 'حظر'} الحساب بنجاح`, 'success');
            hideModal('studentManagementModal');
            loadTeacherData();
        }
        
    } catch (error) {
        console.error('Error changing student status:', error);
    }
}

async function deleteStudent(phone) {
    const student = allStudents.find(s => s.phone === phone);
    const studentName = student ? student.name : 'هذا الطالب';
    
    if (!confirm(`هل أنت متأكد من رغبتك في حذف حساب ${studentName}؟\nسيتم حذف جميع بيانات الطالب نهائياً.`)) {
        return;
    }
    
    try {
        const result = await postData('/api/students/manage', {
            student_phone: phone,
            action: 'delete'
        });
        
        if (result.success) {
            showAlert('تم حذف حساب الطالب', 'success');
            hideModal('studentManagementModal');
            loadTeacherData();
        }
        
    } catch (error) {
        console.error('Error deleting student:', error);
    }
}

async function saveStudentChanges() {
    const newPassword = document.getElementById('newStudentPassword').value;
    const studentPhone = document.querySelector('#studentManagementContent .info-item:nth-child(2) span').textContent;
    
    if (newPassword && newPassword.length >= 6) {
        try {
            const result = await postData('/api/students/manage', {
                student_phone: studentPhone,
                action: 'change_password',
                new_password: newPassword
            });
            
            if (result.success) {
                showAlert('تم تغيير كلمة المرور بنجاح', 'success');
                hideModal('studentManagementModal');
            }
            
        } catch (error) {
            console.error('Error saving student changes:', error);
        }
    } else {
        hideModal('studentManagementModal');
    }
}

// ==================== نظام إدارة الطلاب المتقدم - نهاية ====================

// ==================== نظام النقاط ====================

function refreshPointsData() {
    const activeTab = document.querySelector('.grade-tab.active');
    if (activeTab) {
        const grade = activeTab.getAttribute('onclick').match(/'(\w+)'/)[1];
        loadTeacherPointsTable(grade);
    }
}

async function loadTeacherPointsTable(grade = 'first') {
    try {
        const students = await fetchData(`/api/points/${grade}`);
        const container = document.getElementById('teacherPointsTableContainer');
        
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
                        <th>رقم الهاتف</th>
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
                        ${index < 3 ? `<span class="rank-badge">${index + 1}</span>` : ''}
                    </td>
                    <td>${student.name}</td>
                    <td>${student.phone}</td>
                    <td>${student.points}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
        
    } catch (error) {
        console.error('Error loading teacher points table:', error);
    }
}

function changeTeacherPointsTab(grade) {
    document.querySelectorAll('.grade-tabs .grade-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    loadTeacherPointsTable(grade);
}

// ==================== نظام النقاط - نهاية ====================

// ==================== الدوال الرئيسية ====================

async function loadTeacherData() {
    try {
        // تحميل قائمة الطلاب
        students = await fetchData('/api/students');
        allStudents = students;
        
        // تحميل قائمة الفيديوهات
        await loadAllVideos();
        
        // تحديث الإحصائيات
        updateTeacherStats();
        
        // تحميل الجداول
        loadStudentsTable();
        updateStudentsCount();
        
    } catch (error) {
        console.error('Error loading teacher data:', error);
    }
}

function updateTeacherStats() {
    document.getElementById('totalStudents').textContent = allStudents.length;
    document.getElementById('totalVideos').textContent = allVideos.length;
}

function showTeacherSection(sectionName) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.section-content').forEach(section => {
        section.style.display = 'none';
    });
    
    // إزالة النشاط من القائمة
    document.querySelectorAll('.sidebar li').forEach(item => {
        item.classList.remove('active');
    });
    
    // إضافة النشاط للعنصر المحدد
    event.currentTarget.classList.add('active');
    
    // إظهار القسم المطلوب
    const section = document.getElementById(sectionName + 'Section');
    if (section) {
        section.style.display = 'block';
        
        // تحميل بيانات القسم إذا لزم الأمر
        setTimeout(() => {
            if (sectionName === 'studentsList') {
                loadStudentsTable();
            } else if (sectionName === 'videosList') {
                loadAllVideos();
            } else if (sectionName === 'teacherPoints') {
                loadTeacherPointsTable();
            } else if (sectionName === 'uploadVideo') {
                resetUploadForm();
            }
        }, 100);
    }
}

// ==================== التهيئة النهائية ====================

document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('teacher-dashboard')) {
        // تهيئة أنظمة البحث
        initializeSearch();
        initializeVideoSearch();
        
        // تحميل البيانات الأولية
        loadTeacherData();
        
        // إضافة مستمعين للأحداث
        document.getElementById('uploadVideoBtn')?.addEventListener('click', uploadVideo);
        document.getElementById('videoFile')?.addEventListener('change', function() {
            const fileUpload = document.querySelector('.file-upload');
            if (this.files[0]) {
                fileUpload.querySelector('h3').textContent = this.files[0].name;
                fileUpload.querySelector('p').textContent = 'تم اختيار الملف، يمكنك الآن رفعه';
            }
        });
        
        // تحديث العدادات بانتظام
        setInterval(updateVideosCount, 5000);
        
        // بدء التحديث التلقائي
        startAutoRefresh();
        
        console.log('✅ تم تهيئة لوحة المعلم بنجاح');
    }
});

// ==================== دوال مساعدة ====================

function showNotification(message, type = 'info') {
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

async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        showNotification('حدث خطأ في تحميل البيانات', 'error');
        throw error;
    }
}

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
        showNotification('حدث خطأ في إرسال البيانات', 'error');
        throw error;
    }
}

function showLoading(element) {
    element.disabled = true;
    element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
}

function hideLoading(element, originalText) {
    element.disabled = false;
    element.innerHTML = originalText;
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showAlert(message, type = 'info') {
    showNotification(message, type);
}
// في teacher.js - تحديث وإضافة الدوال الجديدة

// ==================== نظام سجلات الطلاب - محدث ====================

let allStudentsRecords = [];
let currentRecordsSearch = '';

async function loadStudentsRecords() {
    try {
        const response = await fetch('/api/students/records');
        const result = await response.json();
        
        if (result.success) {
            allStudentsRecords = result.students;
            displayStudentsRecords(allStudentsRecords);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading students records:', error);
        showNotification('حدث خطأ في تحميل سجلات الطلاب', 'error');
    }
}

function displayStudentsRecords(students) {
    const container = document.getElementById('studentRecordsTableBody');
    if (!container) return;
    
    if (students.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    <div class="empty-state">
                        <i class="fas fa-users-slash"></i>
                        <p>لا توجد سجلات للطلاب</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = students.map(student => `
        <tr>
            <td>${student.name}</td>
            <td>${student.phone}</td>
            <td>${student.grade}</td>
            <td>
                <span class="badge badge-primary">${student.courses_count} كورس</span>
                <span class="badge badge-secondary">${student.codes_used} كود</span>
            </td>
            <td>
                ${student.last_activity ? formatDate(student.last_activity) : 'لا توجد أنشطة'}
            </td>
            <td>
                <span class="status-badge active">${student.total_activities} نشاط</span>
            </td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="viewStudentDetailedRecords('${student.phone}', '${student.name}')">
                    <i class="fas fa-eye"></i> عرض التفاصيل
                </button>
            </td>
        </tr>
    `).join('');
}

// نظام البحث في سجلات الطلاب
function initializeRecordsSearch() {
    const searchInput = document.getElementById('studentRecordsSearch');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function(e) {
        currentRecordsSearch = e.target.value.trim();
        filterStudentsRecords(currentRecordsSearch);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            filterStudentsRecords(currentRecordsSearch);
        }
    });
}

function filterStudentsRecords(searchTerm) {
    if (!searchTerm) {
        displayStudentsRecords(allStudentsRecords);
        return;
    }
    
    const filteredStudents = allStudentsRecords.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone.includes(searchTerm) ||
        student.grade.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    displayStudentsRecords(filteredStudents);
    
    // عرض معلومات البحث
    const resultsInfo = document.getElementById('recordsSearchResultsInfo');
    if (resultsInfo) {
        if (searchTerm && filteredStudents.length > 0) {
            resultsInfo.innerHTML = `
                <span>عثرنا على </span>
                <span class="results-count">${filteredStudents.length}</span>
                <span> طالب للبحث: "</span>
                <span class="search-query">${searchTerm}</span>
                <span>"</span>
            `;
            resultsInfo.classList.add('show');
        } else {
            resultsInfo.classList.remove('show');
        }
    }
}

async function viewStudentDetailedRecords(studentPhone, studentName) {
    try {
        const response = await fetch(`/api/student/records/${studentPhone}`);
        const result = await response.json();
        
        if (result.success) {
            showStudentDetailedRecordsModal(result, studentName);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading student detailed records:', error);
        showNotification('حدث خطأ في تحميل سجلات الطالب', 'error');
    }
}

function showStudentDetailedRecordsModal(data, studentName) {
    const { student, records, stats } = data;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 90vh;">
            <div class="modal-header">
                <h2><i class="fas fa-history"></i> السجلات التفصيلية - ${studentName}</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <div style="padding: 1.5rem;">
                <!-- الإحصائيات -->
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="stat-card" style="text-align: center; padding: 1rem;">
                        <h3 style="color: var(--primary-blue); font-size: 1.5rem; margin: 0;">${stats.total_activities}</h3>
                        <p style="margin: 0; color: var(--dark-gray);">إجمالي الأنشطة</p>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 1rem;">
                        <h3 style="color: var(--success); font-size: 1.5rem; margin: 0;">${stats.total_codes_used}</h3>
                        <p style="margin: 0; color: var(--dark-gray);">أكواد مستخدمة</p>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 1rem;">
                        <h3 style="color: var(--warning); font-size: 1.5rem; margin: 0;">${stats.total_courses_purchased}</h3>
                        <p style="margin: 0; color: var(--dark-gray);">كورسات مشتراة</p>
                    </div>
                </div>
                
                <!-- معلومات الطالب -->
                <div class="user-info" style="margin-bottom: 1.5rem;">
                    <div class="info-grid">
                        <div class="info-item">
                            <label>الطالب:</label>
                            <span>${student.name}</span>
                        </div>
                        <div class="info-item">
                            <label>رقم الهاتف:</label>
                            <span>${student.phone}</span>
                        </div>
                        <div class="info-item">
                            <label>الصف:</label>
                            <span>${student.grade}</span>
                        </div>
                        <div class="info-item">
                            <label>آخر نشاط:</label>
                            <span>${stats.last_activity ? formatDate(stats.last_activity) : 'لا توجد أنشطة'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- جدول السجلات -->
                <div style="max-height: 400px; overflow-y: auto;">
                    <table class="student-table">
                        <thead>
                            <tr>
                                <th>التاريخ</th>
                                <th>النوع</th>
                                <th>الكود</th>
                                <th>الفيديو</th>
                                <th>الوصف</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.length > 0 ? records.map(record => `
                                <tr>
                                    <td>${formatDate(record.date)}</td>
                                    <td>
                                        <span class="status-badge ${
                                            record.type === 'code_used' ? 'active' : 
                                            record.type === 'course_purchased' ? 'success' : 'warning'
                                        }">
                                            ${
                                                record.type === 'code_used' ? 'كود مستخدم' :
                                                record.type === 'course_purchased' ? 'كورس مشترى' : 'كود مخصص'
                                            }
                                        </span>
                                    </td>
                                    <td>
                                        <code style="font-family: 'Courier New', monospace; background: #f8f9fa; padding: 0.2rem 0.4rem; border-radius: 4px;">
                                            ${record.code}
                                        </code>
                                    </td>
                                    <td>${record.video_title}</td>
                                    <td>${record.description}</td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="5" style="text-align: center; padding: 2rem;">
                                        <div class="empty-state">
                                            <i class="fas fa-history"></i>
                                            <p>لا توجد سجلات للطالب</p>
                                        </div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
                
                <!-- أزرار التحكم -->
                <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-secondary btn-sm" onclick="downloadStudentRecords('${student.phone}', '${student.name}')">
                        <i class="fas fa-download"></i> تصدير السجلات
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="this.closest('.modal').remove()">
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // إغلاق النافذة عند النقر خارجها
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ⭐⭐⭐ تصدير السجلات إلى ملف txt ⭐⭐⭐
function downloadStudentRecords(studentPhone, studentName) {
    showNotification('جاري تحضير الملف للتحميل...', 'info');
    
    fetch(`/api/student/records/export/${studentPhone}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في تحميل الملف');
            }
            return response.blob();
        })
        .then(blob => {
            // إنشاء رابط تحميل
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `سجلات_${studentName}_${new Date().toISOString().split('T')[0]}.txt`;
            
            document.body.appendChild(a);
            a.click();
            
            // تنظيف
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showNotification('تم تصدير السجلات بنجاح', 'success');
        })
        .catch(error => {
            console.error('Error downloading records:', error);
            showNotification('حدث خطأ في تصدير السجلات', 'error');
        });
}

// تحديث دالة showTeacherSection لإضافة تحميل السجلات والبحث
function showTeacherSection(sectionName) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.section-content').forEach(section => {
        section.style.display = 'none';
    });
    
    // إزالة النشاط من القائمة
    document.querySelectorAll('.sidebar li').forEach(item => {
        item.classList.remove('active');
    });
    
    // إضافة النشاط للعنصر المحدد
    event.currentTarget.classList.add('active');
    
    // إظهار القسم المطلوب
    const section = document.getElementById(sectionName + 'Section');
    if (section) {
        section.style.display = 'block';
        
        // تحميل بيانات القسم إذا لزم الأمر
        setTimeout(() => {
            if (sectionName === 'studentsList') {
                loadStudentsTable();
            } else if (sectionName === 'videosList') {
                loadAllVideos();
            } else if (sectionName === 'teacherPoints') {
                loadTeacherPointsTable();
            } else if (sectionName === 'uploadVideo') {
                resetUploadForm();
            } else if (sectionName === 'studentRecords') {
                loadStudentsRecords();
                initializeRecordsSearch(); // ⭐ تهيئة البحث
            }
        }, 100);
    }
}

// تحديث التهيئة النهائية
document.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('teacher-dashboard')) {
        // تهيئة أنظمة البحث
        initializeSearch();
        initializeVideoSearch();
        initializeRecordsSearch(); // ⭐ تهيئة بحث السجلات
        
        // تحميل البيانات الأولية
        loadTeacherData();
        
        // إضافة مستمعين للأحداث
        document.getElementById('uploadVideoBtn')?.addEventListener('click', uploadVideo);
        document.getElementById('videoFile')?.addEventListener('change', function() {
            const fileUpload = document.querySelector('.file-upload');
            if (this.files[0]) {
                fileUpload.querySelector('h3').textContent = this.files[0].name;
                fileUpload.querySelector('p').textContent = 'تم اختيار الملف، يمكنك الآن رفعه';
            }
        });
        
        // تحديث العدادات بانتظام
        setInterval(updateVideosCount, 5000);
        
        // بدء التحديث التلقائي
        startAutoRefresh();
        
        console.log('✅ تم تهيئة لوحة المعلم بنجاح');
    }
});