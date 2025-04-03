/**
 * breakers.js
 * ملف JavaScript الخاص بصفحة القواطع الكهربائية
 */

// استيراد الوظائف من ملف API
import { CircuitBreakerAPI, PanelAPI } from '../api_endpoints.js';

// تهيئة المتغيرات
let selectedPanelId = null;
let selectedPanelData = null;

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من وجود معلمات URL
    checkUrlParams();
    
    // تحميل البيانات الأولية
    loadPanelsDropdown();
    
    // إضافة مستمعي الأحداث
    setupEventListeners();
});

/**
 * التحقق من معلمات URL
 */
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const panelId = urlParams.get('panel');
    
    if (panelId) {
        selectedPanelId = panelId;
        // تحميل بيانات اللوحة المحددة
        loadPanelDetails(panelId);
    } else {
        // إذا لم يكن هناك لوحة محددة، قم بتحميل جميع القواطع
        loadBreakers();
    }
}

/**
 * إعداد مستمعي الأحداث للعناصر التفاعلية
 */
function setupEventListeners() {
    // فلترة القواطع حسب اللوحة
    const filterPanel = document.getElementById('breaker-filter-panel');
    if (filterPanel) {
        filterPanel.addEventListener('change', function() {
            selectedPanelId = this.value;
            
            if (selectedPanelId) {
                // تحميل بيانات اللوحة المحددة
                loadPanelDetails(selectedPanelId);
            } else {
                // إذا تم اختيار "كل اللوحات"، إخفاء معلومات اللوحة المحددة
                const panelInfoDiv = document.getElementById('selected-panel-info');
                if (panelInfoDiv) {
                    panelInfoDiv.style.display = 'none';
                }
                
                // تحميل جميع القواطع
                loadBreakers();
            }
            
            // تفعيل/تعطيل زر إضافة قاطع
            const addBreakerBtn = document.getElementById('add-breaker-btn');
            if (addBreakerBtn) {
                addBreakerBtn.disabled = !selectedPanelId;
            }
        });
    }
    
    // إضافة قاطع جديد
    const addBreakerBtn = document.getElementById('add-breaker-btn');
    if (addBreakerBtn) {
        addBreakerBtn.addEventListener('click', showAddBreakerModal);
    }
    
    const saveBreakerBtn = document.getElementById('save-breaker-btn');
    if (saveBreakerBtn) {
        saveBreakerBtn.addEventListener('click', saveBreaker);
    }
    
    // زر تأكيد الحذف
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDelete);
    }
}

/**
 * تحميل تفاصيل اللوحة المحددة
 * @param {number} panelId - معرف اللوحة
 */
async function loadPanelDetails(panelId) {
    try {
        const result = await PanelAPI.getById(panelId);
        
        if (result.success) {
            selectedPanelData = result.data;
            
            // عرض معلومات اللوحة المحددة
            updateSelectedPanelInfo(selectedPanelData);
            
            // تحميل قواطع اللوحة المحددة
            loadBreakers(panelId);
        } else {
            showAlert(`فشل تحميل بيانات اللوحة: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات اللوحة:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل بيانات اللوحة', 'danger');
    }
}

/**
 * تحديث معلومات اللوحة المحددة
 * @param {Object} panelData - بيانات اللوحة
 */
function updateSelectedPanelInfo(panelData) {
    const panelInfoDiv = document.getElementById('selected-panel-info');
    if (!panelInfoDiv) return;
    
    // تحديث محتوى العناصر
    const panelName = document.getElementById('selected-panel-name');
    const panelType = document.getElementById('selected-panel-type');
    const panelVoltage = document.getElementById('selected-panel-voltage');
    const panelAmpacity = document.getElementById('selected-panel-ampacity');
    
    if (panelName) panelName.textContent = panelData.name || `لوحة #${panelData.id}`;
    
    // عرض نوع اللوحة بشكل مناسب
    const panelTypes = {
        'main': 'لوحة رئيسية',
        'sub_main': 'لوحة رئيسية فرعية',
        'sub': 'لوحة فرعية'
    };
    if (panelType) panelType.textContent = panelTypes[panelData.panel_type] || panelData.panel_type;
    
    // عرض الجهد بشكل مناسب
    const voltageTypes = {
        '220': '220 فولت',
        '380': '380 فولت',
        '11KV': '11 كيلو فولت',
        '24': '24 فولت'
    };
    if (panelVoltage) panelVoltage.textContent = voltageTypes[panelData.voltage] || panelData.voltage;
    
    if (panelAmpacity) panelAmpacity.textContent = `${panelData.ampacity} أمبير`;
    
    // عرض الكتلة
    panelInfoDiv.style.display = 'block';
    
    // تحديث عنوان الصفحة
    document.title = `قواطع لوحة ${panelData.name} - نظام إدارة شبكة الطاقة الكهربائية`;
    
    // تغيير نص زر الإضافة
    const addBreakerBtn = document.getElementById('add-breaker-btn');
    if (addBreakerBtn) {
        addBreakerBtn.textContent = `إضافة قاطع للوحة ${panelData.name}`;
        addBreakerBtn.disabled = false;
    }
}

/**
 * إظهار تنبيه للمستخدم (نجاح أو خطأ)
 * @param {string} message - نص الرسالة
 * @param {string} type - نوع التنبيه (success/danger/warning/info)
 */
function showAlert(message, type = 'success') {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;
    
    const alertId = `alert-${Date.now()}`;
    
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="إغلاق"></button>
        </div>
    `;
    
    alertsContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    // إزالة التنبيه تلقائيًا بعد 5 ثوانٍ
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.remove();
        }
    }, 5000);
}

/**
 * تحميل القائمة المنسدلة للوحات
 */
async function loadPanelsDropdown() {
    try {
        const result = await PanelAPI.getAll();
        
        if (result.success) {
            updatePanelsDropdown(result.data);
        } else {
            showAlert(`فشل تحميل اللوحات: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل اللوحات:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل اللوحات', 'danger');
    }
}

/**
 * تحديث القائمة المنسدلة للوحات
 * @param {Array} panels - مصفوفة اللوحات
 */
function updatePanelsDropdown(panels) {
    const dropdown = document.getElementById('breaker-filter-panel');
    if (!dropdown) return;
    
    // الحفاظ على خيار "الكل" في المقدمة
    let options = '<option value="">كل اللوحات</option>';
    
    panels.forEach(panel => {
        // إضافة معلومات مصدر الطاقة إلى اسم اللوحة لتسهيل التمييز
        const powerSourceName = panel.power_source ? ` (${panel.power_source.name})` : '';
        const panelText = `${panel.name || `لوحة #${panel.id}`}${powerSourceName}`;
        
        const selected = selectedPanelId && selectedPanelId == panel.id ? 'selected' : '';
        options += `<option value="${panel.id}" ${selected}>${panelText}</option>`;
    });
    
    dropdown.innerHTML = options;
    
    // تحديث القائمة المنسدلة إذا تم تحديد لوحة من خلال الـ URL
    if (selectedPanelId) {
        dropdown.value = selectedPanelId;
        
        // تفعيل زر إضافة قاطع
        const addBreakerBtn = document.getElementById('add-breaker-btn');
        if (addBreakerBtn) {
            addBreakerBtn.disabled = false;
        }
    }
}

/**
 * تحميل بيانات القواطع
 * @param {number} panelId - معرف اللوحة (اختياري)
 */
async function loadBreakers(panelId = null) {
    try {
        const tableBody = document.getElementById('breakers-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="spinner-border text-warning" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                </td>
            </tr>
        `;
        
        let result;
        
        if (panelId) {
            // تحميل القواطع المرتبطة بلوحة محددة
            result = await PanelAPI.getBreakers(panelId);
        } else {
            // تحميل جميع القواطع
            result = await CircuitBreakerAPI.getAll();
        }
        
        if (result.success) {
            updateBreakersTable(result.data);
        } else {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">حدث خطأ أثناء تحميل البيانات</td></tr>';
            showAlert(`فشل تحميل القواطع: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل القواطع:', error);
        const tableBody = document.getElementById('breakers-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">حدث خطأ غير متوقع</td></tr>';
        }
        showAlert('حدث خطأ غير متوقع أثناء تحميل القواطع', 'danger');
    }
}

/**
 * تحديث جدول القواطع بالبيانات المستلمة
 * @param {Array} breakers - مصفوفة القواطع
 */
function updateBreakersTable(breakers) {
    const tableBody = document.getElementById('breakers-table-body');
    if (!tableBody) return;
    
    if (breakers.length === 0) {
        if (selectedPanelId) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        لا توجد قواطع في هذه اللوحة
                        <br>
                        <button class="btn btn-warning mt-2" onclick="document.getElementById('add-breaker-btn').click()">
                            <i class="fas fa-plus"></i> إضافة قاطع جديد
                        </button>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">لا توجد قواطع مسجلة</td></tr>';
        }
        return;
    }
    
    let tableHTML = '';
    
    breakers.forEach(breaker => {
        // استخراج بيانات القاطع
        const breakerName = breaker.name || `قاطع #${breaker.id}`;
        const breakerType = breaker.breaker_type || '-';
        const breakerRole = breaker.role_display || breaker.breaker_role || '-';
        const poles = breaker.number_of_poles || '-';
        const ratedCurrent = breaker.rated_current || '-';
        
        // بيانات اللوحة
        const panelName = breaker.panel_name || (breaker.panel ? breaker.panel.name : '-');
        
        tableHTML += `
            <tr data-id="${breaker.id}">
                <td>${breaker.id}</td>
                <td>${breakerName}</td>
                <td>${breakerType}</td>
                <td>${breakerRole}</td>
                <td>${poles}</td>
                <td>${ratedCurrent} A</td>
                <td>${panelName}</td>
                <td class="action-buttons">
                    <div class="btn-group" role="group">
                        <a href="/loads?breaker=${breaker.id}" class="btn btn-sm btn-primary">
                            <i class="fas fa-lightbulb"></i> الأحمال
                        </a>
                        <button class="btn btn-sm btn-warning edit-breaker" data-id="${breaker.id}">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-sm btn-danger delete-breaker" data-id="${breaker.id}" data-name="${breakerName}">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
    
    // إضافة مستمعي الأحداث للأزرار
    document.querySelectorAll('.edit-breaker').forEach(button => {
        button.addEventListener('click', (e) => editBreaker(e.target.closest('button').dataset.id));
    });
    
    document.querySelectorAll('.delete-breaker').forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            deleteBreaker(btn.dataset.id, btn.dataset.name);
        });
    });
}

/**
 * إظهار مودال إضافة قاطع جديد
 */
function showAddBreakerModal() {
    // تهيئة عنوان المودال حسب اللوحة المحددة
    const modalTitle = document.getElementById('addBreakerModalLabel');
    if (modalTitle && selectedPanelData) {
        modalTitle.textContent = `إضافة قاطع للوحة ${selectedPanelData.name}`;
    } else {
        modalTitle.textContent = 'إضافة قاطع جديد';
    }
    
    // تحضير المودال وتحديد اللوحة المحددة
    const breakerPanelIdInput = document.getElementById('breaker-panel-id');
    if (breakerPanelIdInput) {
        breakerPanelIdInput.value = selectedPanelId;
    }
    
    // إضافة معلومات اللوحة إلى المودال
    const alertElement = document.querySelector('#addBreakerModal .alert-info');
    if (alertElement && selectedPanelData) {
        alertElement.textContent = `سيتم إضافة القاطع إلى اللوحة "${selectedPanelData.name}"`;
    }
    
    // إظهار المودال
    const modal = new bootstrap.Modal(document.getElementById('addBreakerModal'));
    if (modal) {
        modal.show();
    }
}

/**
 * حفظ قاطع جديد
 */
async function saveBreaker() {
    // جمع البيانات من النموذج
    const panelId = document.getElementById('breaker-panel-id').value || selectedPanelId;
    const name = document.getElementById('breaker-name').value;
    const type = document.getElementById('breaker-type').value;
    const poles = document.getElementById('breaker-poles').value;
    const ratedCurrent = document.getElementById('breaker-rated-current').value;
    const tripCurve = document.getElementById('breaker-trip-curve').value;
    
    // التحقق من صحة البيانات
    if (!panelId) {
        showAlert('يرجى تحديد اللوحة أولاً', 'warning');
        return;
    }
    
    if (!ratedCurrent) {
        showAlert('يرجى إدخال التيار المقنن للقاطع', 'warning');
        return;
    }
    
    // تحضير البيانات للإرسال
    const breakerData = {
        name: name || null,
        breaker_type: type,
        number_of_poles: parseInt(poles),
        rated_current: parseFloat(ratedCurrent),
        trip_curve: tripCurve || 'C'
    };
    
    try {
        // إرسال البيانات للخادم
        const result = await PanelAPI.addBreaker(panelId, breakerData);
        
        if (result.success) {
            // إغلاق المودال
            const modal = bootstrap.Modal.getInstance(document.getElementById('addBreakerModal'));
            if (modal) {
                modal.hide();
            }
            
            // مسح البيانات من النموذج
            const form = document.getElementById('add-breaker-form');
            if (form) {
                form.reset();
            }
            
            // إظهار رسالة نجاح
            showAlert('تم إضافة القاطع بنجاح', 'success');
            
            // إعادة تحميل البيانات
            await loadBreakers(panelId);
        } else {
            showAlert(`فشل إضافة القاطع: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في إضافة القاطع:', error);
        showAlert('حدث خطأ غير متوقع أثناء إضافة القاطع', 'danger');
    }
}

/**
 * تعديل قاطع (للتنفيذ لاحقاً)
 * @param {number} id - معرف القاطع
 */
async function editBreaker(id) {
    alert(`سيتم تنفيذ وظيفة تعديل القاطع ذو المعرف ${id} لاحقاً`);
}

/**
 * طلب حذف قاطع
 * @param {number} id - معرف القاطع
 * @param {string} name - اسم القاطع
 */
function deleteBreaker(id, name) {
    // تخزين معرف العنصر المراد حذفه للاستخدام لاحقاً
    window.deleteItemId = id;
    
    // تحديث نص مودال التأكيد
    const deleteItemNameSpan = document.getElementById('delete-item-name');
    if (deleteItemNameSpan) {
        deleteItemNameSpan.textContent = `القاطع "${name}"`;
    }
    
    // إظهار مودال التأكيد
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    if (confirmModal) {
        confirmModal.show();
    }
}

/**
 * تنفيذ حذف القاطع بعد التأكيد
 */
async function confirmDelete() {
    const id = window.deleteItemId;
    
    // إغلاق المودال
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    if (modal) {
        modal.hide();
    }
    
    try {
        const result = await CircuitBreakerAPI.delete(id);
        
        if (result.success) {
            showAlert('تم حذف القاطع بنجاح', 'success');
            await loadBreakers(selectedPanelId);
        } else {
            showAlert(`فشل حذف القاطع: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في حذف القاطع:', error);
        showAlert('حدث خطأ غير متوقع أثناء حذف القاطع', 'danger');
    }
}