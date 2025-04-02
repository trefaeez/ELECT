/**
 * panels.js
 * ملف JavaScript الخاص بصفحة اللوحات الكهربائية
 */

// استيراد الوظائف من ملف API
import { PowerSourceAPI, PanelAPI } from '../api_endpoints.js';

// تهيئة المتغيرات
let selectedPowerSourceId = null;

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من وجود معلمات URL
    checkUrlParams();
    
    // تحميل البيانات الأولية
    loadPowerSourcesDropdown();
    loadPanels();
    
    // إضافة مستمعي الأحداث
    setupEventListeners();
});

/**
 * التحقق من معلمات URL
 */
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const sourceId = urlParams.get('source');
    
    if (sourceId) {
        selectedPowerSourceId = sourceId;
    }
}

/**
 * إعداد مستمعي الأحداث للعناصر التفاعلية
 */
function setupEventListeners() {
    // فلترة اللوحات حسب مصدر الطاقة
    document.getElementById('panel-filter-source').addEventListener('change', function() {
        selectedPowerSourceId = this.value;
        loadPanels(selectedPowerSourceId);
    });
    
    // إضافة لوحة جديدة
    document.getElementById('add-panel-btn').addEventListener('click', showAddPanelModal);
    document.getElementById('save-panel-btn').addEventListener('click', savePanel);
    
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
 * تحميل القائمة المنسدلة لمصادر الطاقة
 */
async function loadPowerSourcesDropdown() {
    try {
        const result = await PowerSourceAPI.getAll();
        
        if (result.success) {
            updatePowerSourcesDropdown(result.data);
        } else {
            showAlert(`فشل تحميل مصادر الطاقة: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل مصادر الطاقة:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل مصادر الطاقة', 'danger');
    }
}

/**
 * تحديث القائمة المنسدلة لمصادر الطاقة
 * @param {Array} powerSources - مصفوفة مصادر الطاقة
 */
function updatePowerSourcesDropdown(powerSources) {
    const dropdown = document.getElementById('panel-filter-source');
    
    // الحفاظ على خيار "الكل" في المقدمة
    let options = '<option value="">كل مصادر الطاقة</option>';
    
    powerSources.forEach(source => {
        const selected = selectedPowerSourceId && selectedPowerSourceId == source.id ? 'selected' : '';
        options += `<option value="${source.id}" ${selected}>${source.name}</option>`;
    });
    
    dropdown.innerHTML = options;
    
    // تفعيل زر إضافة لوحة إذا كان هناك مصادر طاقة متاحة
    const addPanelBtn = document.getElementById('add-panel-btn');
    if (powerSources.length > 0) {
        addPanelBtn.disabled = false;
    } else {
        addPanelBtn.disabled = true;
    }
    
    // تحديث اللوحات المعروضة إذا تم تحديد مصدر طاقة
    if (selectedPowerSourceId) {
        dropdown.value = selectedPowerSourceId;
    }
}

/**
 * تحميل بيانات اللوحات
 * @param {number} sourceId - معرف مصدر الطاقة (اختياري)
 */
async function loadPanels(sourceId = null) {
    try {
        const tableBody = document.getElementById('panels-table-body');
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">جاري التحميل... <div class="loading-spinner"></div></td></tr>';
        
        let result;
        
        if (sourceId) {
            // تحميل اللوحات المرتبطة بمصدر طاقة محدد
            result = await PowerSourceAPI.getPanels(sourceId);
        } else {
            // تحميل جميع اللوحات
            result = await PanelAPI.getAll();
        }
        
        if (result.success) {
            updatePanelsTable(result.data);
        } else {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">حدث خطأ أثناء تحميل البيانات</td></tr>';
            showAlert(`فشل تحميل اللوحات: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل اللوحات:', error);
        document.getElementById('panels-table-body').innerHTML = 
            '<tr><td colspan="7" class="text-center text-danger">حدث خطأ غير متوقع</td></tr>';
        showAlert('حدث خطأ غير متوقع أثناء تحميل اللوحات', 'danger');
    }
}

/**
 * تحديث جدول اللوحات بالبيانات المستلمة
 * @param {Array} panels - مصفوفة اللوحات
 */
function updatePanelsTable(panels) {
    const tableBody = document.getElementById('panels-table-body');
    
    if (panels.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد لوحات مسجلة</td></tr>';
        return;
    }
    
    let tableHTML = '';
    
    panels.forEach(panel => {
        // تحديد اسم مصدر الطاقة واللوحة الأم
        const powerSourceName = panel.power_source_details ? panel.power_source_details.name : '-';
        const parentPanelName = panel.parent_panel_details ? panel.parent_panel_details.name : '-';
        
        tableHTML += `
            <tr data-id="${panel.id}">
                <td>${panel.id}</td>
                <td>${panel.name}</td>
                <td>${getPanelTypeDisplay(panel.panel_type)}</td>
                <td>${getVoltageDisplay(panel.voltage)}</td>
                <td>${powerSourceName}</td>
                <td>${parentPanelName}</td>
                <td class="action-buttons">
                    <a href="/breakers?panel=${panel.id}" class="btn btn-sm btn-primary">
                        <i class="fas fa-toggle-on"></i> القواطع
                    </a>
                    <button class="btn btn-sm btn-info edit-panel" data-id="${panel.id}">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-danger delete-panel" data-id="${panel.id}" data-name="${panel.name}">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
    
    // إضافة مستمعي الأحداث للأزرار
    document.querySelectorAll('.edit-panel').forEach(button => {
        button.addEventListener('click', (e) => editPanel(e.target.closest('button').dataset.id));
    });
    
    document.querySelectorAll('.delete-panel').forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            deletePanel(btn.dataset.id, btn.dataset.name);
        });
    });
}

/**
 * عرض نص وصفي لنوع اللوحة
 * @param {string} panelType - رمز نوع اللوحة
 * @returns {string} النص الوصفي
 */
function getPanelTypeDisplay(panelType) {
    const types = {
        'main': 'لوحة رئيسية',
        'sub': 'لوحة فرعية'
    };
    
    return types[panelType] || panelType;
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
 * إظهار مودال إضافة لوحة جديدة
 */
function showAddPanelModal() {
    // تحضير المودال وتحديد مصدر الطاقة المحدد
    document.getElementById('panel-power-source-id').value = selectedPowerSourceId;
    
    // إظهار المودال
    const modal = new bootstrap.Modal(document.getElementById('addPanelModal'));
    modal.show();
}

/**
 * حفظ لوحة جديدة
 */
async function savePanel() {
    // جمع البيانات من النموذج
    const powerSourceId = document.getElementById('panel-power-source-id').value || selectedPowerSourceId;
    const name = document.getElementById('panel-name').value;
    const voltage = document.getElementById('panel-voltage').value;
    const ampacity = document.getElementById('panel-ampacity').value;
    
    // التحقق من صحة البيانات
    if (!powerSourceId) {
        showAlert('يرجى تحديد مصدر الطاقة أولاً', 'warning');
        return;
    }
    
    if (!name || !voltage || !ampacity) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    // تحضير البيانات للإرسال
    const panelData = {
        name: name,
        voltage: voltage,
        ampacity: parseFloat(ampacity)
    };
    
    try {
        // إرسال البيانات للخادم
        const result = await PowerSourceAPI.addPanel(powerSourceId, panelData);
        
        if (result.success) {
            // إغلاق المودال
            const modal = bootstrap.Modal.getInstance(document.getElementById('addPanelModal'));
            modal.hide();
            
            // مسح البيانات من النموذج
            document.getElementById('add-panel-form').reset();
            
            // إظهار رسالة نجاح
            showAlert('تم إضافة اللوحة بنجاح');
            
            // إعادة تحميل البيانات
            await loadPanels(powerSourceId);
        } else {
            showAlert(`فشل إضافة اللوحة: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في إضافة اللوحة:', error);
        showAlert('حدث خطأ غير متوقع أثناء إضافة اللوحة', 'danger');
    }
}

/**
 * تعديل لوحة (للتنفيذ لاحقاً)
 * @param {number} id - معرف اللوحة
 */
async function editPanel(id) {
    alert(`سيتم تنفيذ وظيفة تعديل اللوحة ذات المعرف ${id} لاحقاً`);
}

/**
 * طلب حذف لوحة
 * @param {number} id - معرف اللوحة
 * @param {string} name - اسم اللوحة
 */
function deletePanel(id, name) {
    // تخزين معرف العنصر المراد حذفه ونوعه للاستخدام لاحقاً
    window.deleteItemId = id;
    
    // تحديث نص مودال التأكيد
    document.getElementById('delete-item-name').textContent = `اللوحة "${name}"`;
    
    // إظهار مودال التأكيد
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    confirmModal.show();
}

/**
 * تنفيذ حذف اللوحة بعد التأكيد
 */
async function confirmDelete() {
    const id = window.deleteItemId;
    
    // إغلاق المودال
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    modal.hide();
    
    try {
        const result = await PanelAPI.delete(id);
        
        if (result.success) {
            showAlert('تم حذف اللوحة بنجاح');
            await loadPanels(selectedPowerSourceId);
        } else {
            showAlert(`فشل حذف اللوحة: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في حذف اللوحة:', error);
        showAlert('حدث خطأ غير متوقع أثناء حذف اللوحة', 'danger');
    }
}