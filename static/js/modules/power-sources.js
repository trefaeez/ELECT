/**
 * power-sources.js
 * ملف JavaScript الخاص بصفحة مصادر الطاقة
 */

// استيراد الوظائف من ملف API
import { PowerSourceAPI } from '../api_endpoints.js';

// تهيئة المتغيرات
let selectedPowerSourceId = null;

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // تحميل بيانات مصادر الطاقة
    loadPowerSources();
    
    // إضافة مستمعي الأحداث
    setupEventListeners();
});

/**
 * إعداد مستمعي الأحداث للعناصر التفاعلية
 */
function setupEventListeners() {
    // زر حفظ مصدر الطاقة
    document.getElementById('save-power-source-btn').addEventListener('click', savePowerSource);
    
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
 * تحميل بيانات مصادر الطاقة
 */
async function loadPowerSources() {
    try {
        const tableBody = document.getElementById('power-sources-table-body');
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">جاري التحميل... <div class="loading-spinner"></div></td></tr>';
        
        const result = await PowerSourceAPI.getAll();
        
        if (result.success) {
            updatePowerSourcesTable(result.data);
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">حدث خطأ أثناء تحميل البيانات</td></tr>';
            showAlert(`فشل تحميل مصادر الطاقة: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل مصادر الطاقة:', error);
        document.getElementById('power-sources-table-body').innerHTML = 
            '<tr><td colspan="6" class="text-center text-danger">حدث خطأ غير متوقع</td></tr>';
        showAlert('حدث خطأ غير متوقع أثناء تحميل مصادر الطاقة', 'danger');
    }
}

/**
 * تحديث جدول مصادر الطاقة بالبيانات المستلمة
 * @param {Array} powerSources - مصفوفة مصادر الطاقة
 */
function updatePowerSourcesTable(powerSources) {
    const tableBody = document.getElementById('power-sources-table-body');
    
    if (powerSources.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد مصادر طاقة مسجلة</td></tr>';
        return;
    }
    
    let tableHTML = '';
    
    powerSources.forEach(source => {
        tableHTML += `
            <tr data-id="${source.id}">
                <td>${source.id}</td>
                <td>${source.name}</td>
                <td>${getSourceTypeDisplay(source.source_type)}</td>
                <td>${getVoltageDisplay(source.voltage)}</td>
                <td>${source.total_ampacity} A</td>
                <td class="action-buttons">
                    <a href="/panels?source=${source.id}" class="btn btn-sm btn-primary">
                        <i class="fas fa-server"></i> اللوحات
                    </a>
                    <button class="btn btn-sm btn-info edit-power-source" data-id="${source.id}">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-danger delete-power-source" data-id="${source.id}" data-name="${source.name}">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
    
    // إضافة مستمعي الأحداث للأزرار
    document.querySelectorAll('.edit-power-source').forEach(button => {
        button.addEventListener('click', (e) => editPowerSource(e.target.closest('button').dataset.id));
    });
    
    document.querySelectorAll('.delete-power-source').forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            deletePowerSource(btn.dataset.id, btn.dataset.name);
        });
    });
}

/**
 * عرض نص وصفي لنوع مصدر الطاقة
 * @param {string} sourceType - رمز نوع المصدر
 * @returns {string} النص الوصفي
 */
function getSourceTypeDisplay(sourceType) {
    const types = {
        'Local Grid': 'الشبكة المحلية',
        'Generator': 'مولد'
    };
    
    return types[sourceType] || sourceType;
}

/**
 * عرض نص وصفي للجهد الكهربائي
 * @param {string} voltage - رمز الجهد
 * @returns {string} النص الوصفي
 */
function getVoltageDisplay(voltage) {
    const types = {
        '220': '220 فولت',
        '380': '380 فولت',
        '11KV': '11 كيلو فولت',
        '24': '24 فولت'
    };
    
    return types[voltage] || voltage;
}

/**
 * حفظ مصدر طاقة جديد
 */
async function savePowerSource() {
    // جمع البيانات من النموذج
    const name = document.getElementById('power-source-name').value;
    const sourceType = document.getElementById('power-source-type').value;
    const voltage = document.getElementById('power-source-voltage').value;
    const ampacity = document.getElementById('power-source-ampacity').value;
    
    // التحقق من صحة البيانات
    if (!name || !sourceType || !voltage || !ampacity) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    // تحضير البيانات للإرسال
    const powerSourceData = {
        name: name,
        source_type: sourceType,
        voltage: voltage,
        total_ampacity: parseFloat(ampacity)
    };
    
    try {
        // إرسال البيانات للخادم
        const result = await PowerSourceAPI.add(powerSourceData);
        
        if (result.success) {
            // إغلاق المودال
            const modal = bootstrap.Modal.getInstance(document.getElementById('addPowerSourceModal'));
            modal.hide();
            
            // مسح البيانات من النموذج
            document.getElementById('add-power-source-form').reset();
            
            // إظهار رسالة نجاح
            showAlert('تم إضافة مصدر الطاقة بنجاح');
            
            // إعادة تحميل البيانات
            loadPowerSources();
        } else {
            showAlert(`فشل إضافة مصدر الطاقة: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في إضافة مصدر الطاقة:', error);
        showAlert('حدث خطأ غير متوقع أثناء إضافة مصدر الطاقة', 'danger');
    }
}

/**
 * تعديل مصدر طاقة (للتنفيذ لاحقاً)
 * @param {number} id - معرف مصدر الطاقة
 */
async function editPowerSource(id) {
    alert(`سيتم تنفيذ وظيفة تعديل مصدر الطاقة ذو المعرف ${id} لاحقاً`);
}

/**
 * طلب حذف مصدر طاقة
 * @param {number} id - معرف مصدر الطاقة
 * @param {string} name - اسم مصدر الطاقة
 */
function deletePowerSource(id, name) {
    // تخزين معرف العنصر المراد حذفه ونوعه للاستخدام لاحقاً
    window.deleteItemId = id;
    
    // تحديث نص مودال التأكيد
    document.getElementById('delete-item-name').textContent = `مصدر الطاقة "${name}"`;
    
    // إظهار مودال التأكيد
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    confirmModal.show();
}

/**
 * تنفيذ حذف مصدر الطاقة بعد التأكيد
 */
async function confirmDelete() {
    const id = window.deleteItemId;
    
    // إغلاق المودال
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    modal.hide();
    
    try {
        const result = await PowerSourceAPI.delete(id);
        
        if (result.success) {
            showAlert('تم حذف مصدر الطاقة بنجاح');
            loadPowerSources();
        } else {
            showAlert(`فشل حذف مصدر الطاقة: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في حذف مصدر الطاقة:', error);
        showAlert('حدث خطأ غير متوقع أثناء حذف مصدر الطاقة', 'danger');
    }
}