/**
 * breakers.js
 * ملف JavaScript الخاص بصفحة القواطع الكهربائية
 */

// استيراد الوظائف من ملف API
import { CircuitBreakerAPI, PanelAPI } from '../api_endpoints.js';

// تهيئة المتغيرات
let selectedPanelId = null;

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من وجود معلمات URL
    checkUrlParams();
    
    // تحميل البيانات الأولية
    loadPanelsDropdown();
    loadBreakers();
    
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
    }
}

/**
 * إعداد مستمعي الأحداث للعناصر التفاعلية
 */
function setupEventListeners() {
    // فلترة القواطع حسب اللوحة
    document.getElementById('breaker-filter-panel').addEventListener('change', function() {
        selectedPanelId = this.value;
        loadBreakers(selectedPanelId);
        
        // تفعيل/تعطيل زر إضافة قاطع
        const addBreakerBtn = document.getElementById('add-breaker-btn');
        addBreakerBtn.disabled = !selectedPanelId;
    });
    
    // إضافة قاطع جديد
    document.getElementById('add-breaker-btn').addEventListener('click', showAddBreakerModal);
    document.getElementById('save-breaker-btn').addEventListener('click', saveBreaker);
    
    // زر تأكيد الحذف
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
}

/**
 * إظهار تنبيه للمستخدم (نجاح أو خطأ)
 * @param {string} message - نص الرسالة
 * @param {string} type - نوع التنبيه (success/danger/warning/info)
 */
function showAlert(message, type = 'success') {
    const alertsContainer = document.getElementById('alerts-container');
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
    
    // الحفاظ على خيار "الكل" في المقدمة
    let options = '<option value="">كل اللوحات</option>';
    
    panels.forEach(panel => {
        // إضافة معلومات مصدر الطاقة إلى اسم اللوحة لتسهيل التمييز
        const powerSourceName = panel.power_source_details ? ` (${panel.power_source_details.name})` : '';
        const panelText = `${panel.name || `لوحة #${panel.id}`}${powerSourceName}`;
        
        const selected = selectedPanelId && selectedPanelId == panel.id ? 'selected' : '';
        options += `<option value="${panel.id}" ${selected}>${panelText}</option>`;
    });
    
    dropdown.innerHTML = options;
    
    // تفعيل زر إضافة قاطع إذا تم تحديد لوحة
    const addBreakerBtn = document.getElementById('add-breaker-btn');
    addBreakerBtn.disabled = !selectedPanelId;
    
    // تحديث القائمة المنسدلة إذا تم تحديد لوحة من خلال الـ URL
    if (selectedPanelId) {
        dropdown.value = selectedPanelId;
    }
}

/**
 * تحميل بيانات القواطع
 * @param {number} panelId - معرف اللوحة (اختياري)
 */
async function loadBreakers(panelId = null) {
    try {
        const tableBody = document.getElementById('breakers-table-body');
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">جاري التحميل... <div class="loading-spinner"></div></td></tr>';
        
        let result;
        
        if (panelId) {
            // تحميل القواطع المرتبطة بلوحة محددة
            // هنا لابد من استخدام PanelAPI.getBreakers حيث لا يوجد تعديل مطلوب
            result = await PanelAPI.getBreakers(panelId);
        } else {
            // تحميل جميع القواطع
            // استخدام مسار API الصحيح من خلال CircuitBreakerAPI التي تم تعديلها
            result = await CircuitBreakerAPI.getAll();
        }
        
        if (result.success) {
            updateBreakersTable(result.data);
        } else {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">حدث خطأ أثناء تحميل البيانات</td></tr>';
            showAlert(`فشل تحميل القواطع: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل القواطع:', error);
        document.getElementById('breakers-table-body').innerHTML = 
            '<tr><td colspan="7" class="text-center text-danger">حدث خطأ غير متوقع</td></tr>';
        showAlert('حدث خطأ غير متوقع أثناء تحميل القواطع', 'danger');
    }
}

/**
 * تحديث جدول القواطع بالبيانات المستلمة
 * @param {Array} breakers - مصفوفة القواطع
 */
function updateBreakersTable(breakers) {
    const tableBody = document.getElementById('breakers-table-body');
    
    if (breakers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد قواطع مسجلة</td></tr>';
        return;
    }
    
    let tableHTML = '';
    
    breakers.forEach(breaker => {
        // استخراج معلومات اللوحة
        const panelName = breaker.panel_details ? breaker.panel_details.name || `لوحة #${breaker.panel_details.id}` : '-';
        
        // حساب عدد الأحمال المرتبطة
        const loadsCount = breaker.loads_count || 0;
        
        tableHTML += `
            <tr data-id="${breaker.id}">
                <td>${breaker.id}</td>
                <td>${breaker.name || `قاطع #${breaker.id}`}</td>
                <td>${breaker.ampacity} A</td>
                <td>${breaker.type || '-'}</td>
                <td>${panelName}</td>
                <td>
                    <span class="badge ${loadsCount > 0 ? 'bg-primary' : 'bg-secondary'}">
                        ${loadsCount} حمل
                    </span>
                </td>
                <td class="action-buttons">
                    <a href="/loads?breaker=${breaker.id}" class="btn btn-sm btn-primary view-loads">
                        <i class="fas fa-lightbulb"></i> عرض الأحمال
                    </a>
                    <button class="btn btn-sm btn-info edit-breaker" data-id="${breaker.id}">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-danger delete-breaker" data-id="${breaker.id}" data-name="${breaker.name || `قاطع #${breaker.id}`}">
                        <i class="fas fa-trash"></i> حذف
                    </button>
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
    // تحضير المودال وتحديد اللوحة المحددة
    document.getElementById('breaker-panel-id').value = selectedPanelId;
    
    // إظهار المودال
    const modal = new bootstrap.Modal(document.getElementById('addBreakerModal'));
    modal.show();
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
    
    if (!name || !ratedCurrent) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    // تحضير البيانات للإرسال
    const breakerData = {
        name: name,
        type: type,
        poles: parseInt(poles),
        ampacity: parseFloat(ratedCurrent),
        trip_curve: tripCurve
    };
    
    try {
        // إرسال البيانات للخادم
        const result = await PanelAPI.addBreaker(panelId, breakerData);
        
        if (result.success) {
            // إغلاق المودال
            const modal = bootstrap.Modal.getInstance(document.getElementById('addBreakerModal'));
            modal.hide();
            
            // مسح البيانات من النموذج
            document.getElementById('add-breaker-form').reset();
            
            // إظهار رسالة نجاح
            showAlert('تم إضافة القاطع بنجاح');
            
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
    document.getElementById('delete-item-name').textContent = `القاطع "${name}"`;
    
    // إظهار مودال التأكيد
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    confirmModal.show();
}

/**
 * تنفيذ حذف القاطع بعد التأكيد
 */
async function confirmDelete() {
    const id = window.deleteItemId;
    
    // إغلاق المودال
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    modal.hide();
    
    try {
        const result = await CircuitBreakerAPI.delete(id);
        
        if (result.success) {
            showAlert('تم حذف القاطع بنجاح');
            await loadBreakers(selectedPanelId);
        } else {
            showAlert(`فشل حذف القاطع: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في حذف القاطع:', error);
        showAlert('حدث خطأ غير متوقع أثناء حذف القاطع', 'danger');
    }
}