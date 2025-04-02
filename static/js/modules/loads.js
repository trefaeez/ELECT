/**
 * loads.js
 * ملف JavaScript الخاص بصفحة الأحمال الكهربائية
 */

// استيراد الوظائف من ملف API
import { CircuitBreakerAPI, LoadAPI } from '../api_endpoints.js';

// تهيئة المتغيرات
let selectedBreakerId = null;

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من وجود معلمات URL
    checkUrlParams();
    
    // تحميل البيانات الأولية
    loadBreakersDropdown();
    loadLoads();
    
    // إضافة مستمعي الأحداث
    setupEventListeners();
});

/**
 * التحقق من معلمات URL
 */
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const breakerId = urlParams.get('breaker');
    
    if (breakerId) {
        selectedBreakerId = breakerId;
    }
}

/**
 * إعداد مستمعي الأحداث للعناصر التفاعلية
 */
function setupEventListeners() {
    // فلترة الأحمال حسب القاطع
    document.getElementById('load-filter-breaker').addEventListener('change', function() {
        selectedBreakerId = this.value;
        loadLoads(selectedBreakerId);
        
        // تفعيل/تعطيل زر إضافة حمل
        const addLoadBtn = document.getElementById('add-load-btn');
        addLoadBtn.disabled = !selectedBreakerId;
    });
    
    // فلترة الأحمال حسب النوع
    document.getElementById('load-filter-type').addEventListener('change', function() {
        filterLoadsByType(this.value);
    });
    
    // إضافة حمل جديد
    document.getElementById('add-load-btn').addEventListener('click', showAddLoadModal);
    document.getElementById('save-load-btn').addEventListener('click', saveLoad);
    
    // حساب استهلاك الطاقة تلقائيًا عند تغيير الأمبير أو الجهد
    document.getElementById('load-ampacity').addEventListener('input', calculatePowerConsumption);
    document.getElementById('load-voltage').addEventListener('change', calculatePowerConsumption);
    document.getElementById('load-power-factor').addEventListener('input', calculatePowerConsumption);
    
    // زر تأكيد الحذف
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
}

/**
 * حساب استهلاك الطاقة تلقائيًا
 */
function calculatePowerConsumption() {
    const ampacity = parseFloat(document.getElementById('load-ampacity').value) || 0;
    const voltageEl = document.getElementById('load-voltage');
    const powerFactorEl = document.getElementById('load-power-factor');
    
    if (ampacity > 0 && voltageEl && powerFactorEl) {
        const voltage = parseFloat(voltageEl.value) || 220;
        const powerFactor = parseFloat(powerFactorEl.value) || 0.85;
        
        // P = V × I × PF للتيار المتردد
        const power = voltage * ampacity * powerFactor;
        
        // تحديث قيمة استهلاك الطاقة
        document.getElementById('load-power-consumption').value = Math.round(power);
    }
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
 * تحميل القائمة المنسدلة للقواطع
 */
async function loadBreakersDropdown() {
    try {
        const result = await CircuitBreakerAPI.getAll();
        
        if (result.success) {
            updateBreakersDropdown(result.data);
        } else {
            showAlert(`فشل تحميل القواطع: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل القواطع:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل القواطع', 'danger');
    }
}

/**
 * تحديث القائمة المنسدلة للقواطع
 * @param {Array} breakers - مصفوفة القواطع
 */
function updateBreakersDropdown(breakers) {
    const dropdown = document.getElementById('load-filter-breaker');
    
    // الحفاظ على خيار "الكل" في المقدمة
    let options = '<option value="">كل القواطع</option>';
    
    breakers.forEach(breaker => {
        // إضافة معلومات اللوحة إلى اسم القاطع لتسهيل التمييز
        const panelName = breaker.panel_details ? ` (${breaker.panel_details.name})` : '';
        const breakerText = `${breaker.name || `قاطع #${breaker.id}`}${panelName}`;
        
        const selected = selectedBreakerId && selectedBreakerId == breaker.id ? 'selected' : '';
        options += `<option value="${breaker.id}" ${selected}>${breakerText}</option>`;
    });
    
    dropdown.innerHTML = options;
    
    // تفعيل زر إضافة حمل إذا تم تحديد قاطع
    const addLoadBtn = document.getElementById('add-load-btn');
    addLoadBtn.disabled = !selectedBreakerId;
    
    // تحديث القائمة المنسدلة إذا تم تحديد قاطع من خلال الـ URL
    if (selectedBreakerId) {
        dropdown.value = selectedBreakerId;
    }
}

/**
 * تحميل بيانات الأحمال
 * @param {number} breakerId - معرف القاطع (اختياري)
 */
async function loadLoads(breakerId = null) {
    try {
        const tableBody = document.getElementById('loads-table-body');
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">جاري التحميل... <div class="loading-spinner"></div></td></tr>';
        
        let result;
        
        if (breakerId) {
            // تحميل الأحمال المرتبطة بقاطع محدد
            // استخدام circuitbreakers بدلاً من breakers للتوافق مع المسارات في urls.py
            result = await CircuitBreakerAPI.getLoads(breakerId);
        } else {
            // تحميل جميع الأحمال
            result = await LoadAPI.getAll();
        }
        
        if (result.success) {
            updateLoadsTable(result.data);
        } else {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">حدث خطأ أثناء تحميل البيانات</td></tr>';
            showAlert(`فشل تحميل الأحمال: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل الأحمال:', error);
        document.getElementById('loads-table-body').innerHTML = 
            '<tr><td colspan="8" class="text-center text-danger">حدث خطأ غير متوقع</td></tr>';
        showAlert('حدث خطأ غير متوقع أثناء تحميل الأحمال', 'danger');
    }
}

/**
 * تحديث جدول الأحمال بالبيانات المستلمة
 * @param {Array} loads - مصفوفة الأحمال
 */
function updateLoadsTable(loads) {
    const tableBody = document.getElementById('loads-table-body');
    
    if (loads.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">لا توجد أحمال مسجلة</td></tr>';
        return;
    }
    
    let tableHTML = '';
    
    loads.forEach(load => {
        // استخراج معلومات القاطع واللوحة
        const breakerName = load.breaker_details ? load.breaker_details.name || `قاطع #${load.breaker_details.id}` : '-';
        const panelName = load.panel_details ? load.panel_details.name : '-';
        
        // استخراج نوع الحمل
        const loadType = load.load_type_display || 'غير محدد';
        
        // حساب الطاقة إذا لم تكن محددة
        const powerConsumption = load.power_consumption || (load.voltage * load.ampacity).toFixed(0);
        
        // إضافة الأيقونة المناسبة لنوع الحمل
        let typeIcon = '';
        switch(load.load_type) {
            case 'machine': typeIcon = 'fa-cogs'; break;
            case 'service_panel': typeIcon = 'fa-table-cells'; break;
            case 'outlet': typeIcon = 'fa-plug'; break;
            case 'lighting': typeIcon = 'fa-lightbulb'; break;
            case 'fan': typeIcon = 'fa-fan'; break;
            case 'screen': typeIcon = 'fa-desktop'; break;
            case 'exhaust': typeIcon = 'fa-wind'; break;
            case 'ac': typeIcon = 'fa-snowflake'; break;
            case 'heater': typeIcon = 'fa-fire'; break;
            case 'refrigerator': typeIcon = 'fa-temperature-low'; break;
            case 'motor': typeIcon = 'fa-gauge-high'; break;
            case 'pump': typeIcon = 'fa-faucet'; break;
            default: typeIcon = 'fa-question'; break;
        }
        
        tableHTML += `
            <tr data-id="${load.id}" data-type="${load.load_type || ''}">
                <td>${load.id}</td>
                <td>${load.name}</td>
                <td><i class="fas ${typeIcon} me-1"></i> ${loadType}</td>
                <td>${load.voltage} V</td>
                <td>${load.ampacity} A</td>
                <td>${powerConsumption} W</td>
                <td>${breakerName}</td>
                <td>${panelName}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-info edit-load" data-id="${load.id}">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-danger delete-load" data-id="${load.id}" data-name="${load.name}">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
    
    // إضافة مستمعي الأحداث للأزرار
    document.querySelectorAll('.edit-load').forEach(button => {
        button.addEventListener('click', (e) => editLoad(e.target.closest('button').dataset.id));
    });
    
    document.querySelectorAll('.delete-load').forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            deleteLoad(btn.dataset.id, btn.dataset.name);
        });
    });
    
    // تطبيق الفلتر الحالي بعد تحديث الجدول
    const currentFilter = document.getElementById('load-filter-type').value;
    if (currentFilter) {
        filterLoadsByType(currentFilter);
    }
}

/**
 * تصفية الأحمال حسب النوع
 * @param {string} type - نوع الحمل
 */
function filterLoadsByType(type) {
    const rows = document.querySelectorAll('#loads-table-body tr[data-id]');
    
    if (!type) {
        // إظهار جميع الصفوف إذا لم يتم تحديد نوع
        rows.forEach(row => row.style.display = '');
        return;
    }
    
    // إخفاء أو إظهار الصفوف حسب النوع
    rows.forEach(row => {
        if (row.dataset.type === type) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * حفظ حمل جديد
 */
async function saveLoad() {
    // جمع البيانات من النموذج
    const breakerId = document.getElementById('load-breaker-id').value || selectedBreakerId;
    const name = document.getElementById('load-name').value;
    const loadType = document.getElementById('load-type').value;
    const voltage = document.getElementById('load-voltage').value;
    const ampacity = document.getElementById('load-ampacity').value;
    const powerConsumption = document.getElementById('load-power-consumption').value;
    const powerFactor = document.getElementById('load-power-factor').value;
    const cableLength = document.getElementById('load-cable-length').value;
    const usageHours = document.getElementById('load-usage-hours').value;
    const label = document.getElementById('load-label').value;
    const description = document.getElementById('load-description').value;
    
    // التحقق من صحة البيانات
    if (!breakerId) {
        showAlert('يرجى تحديد القاطع أولاً', 'warning');
        return;
    }
    
    if (!name || !voltage || !ampacity || !loadType) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    // تحضير البيانات للإرسال
    const loadData = {
        name: name,
        load_type: loadType,
        voltage: parseInt(voltage),
        ampacity: parseFloat(ampacity),
        power_factor: parseFloat(powerFactor) || 0.85,
        estimated_usage_hours: parseFloat(usageHours) || 8.0
    };
    
    // إضافة البيانات الاختيارية إذا تم توفيرها
    if (powerConsumption) {
        loadData.power_consumption = parseFloat(powerConsumption);
    }
    
    if (cableLength) {
        loadData.cable_length = parseFloat(cableLength);
    }
    
    if (label) {
        loadData.label = label;
    }
    
    if (description) {
        loadData.description = description;
    }
    
    try {
        // إرسال البيانات للخادم
        const result = await CircuitBreakerAPI.addLoad(breakerId, loadData);
        
        if (result.success) {
            // إغلاق المودال
            const modal = bootstrap.Modal.getInstance(document.getElementById('addLoadModal'));
            modal.hide();
            
            // مسح البيانات من النموذج
            document.getElementById('add-load-form').reset();
            
            // إظهار رسالة نجاح
            showAlert('تم إضافة الحمل بنجاح');
            
            // إعادة تحميل البيانات
            await loadLoads(breakerId);
        } else {
            showAlert(`فشل إضافة الحمل: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في إضافة الحمل:', error);
        showAlert('حدث خطأ غير متوقع أثناء إضافة الحمل', 'danger');
    }
}

/**
 * تعديل حمل (للتنفيذ لاحقاً)
 * @param {number} id - معرف الحمل
 */
async function editLoad(id) {
    alert(`سيتم تنفيذ وظيفة تعديل الحمل ذو المعرف ${id} لاحقاً`);
}

/**
 * طلب حذف حمل
 * @param {number} id - معرف الحمل
 * @param {string} name - اسم الحمل
 */
function deleteLoad(id, name) {
    // تخزين معرف العنصر المراد حذفه للاستخدام لاحقاً
    window.deleteItemId = id;
    
    // تحديث نص مودال التأكيد
    document.getElementById('delete-item-name').textContent = `الحمل "${name}"`;
    
    // إظهار مودال التأكيد
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    confirmModal.show();
}

/**
 * تنفيذ حذف الحمل بعد التأكيد
 */
async function confirmDelete() {
    const id = window.deleteItemId;
    
    // إغلاق المودال
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    modal.hide();
    
    try {
        const result = await LoadAPI.delete(id);
        
        if (result.success) {
            showAlert('تم حذف الحمل بنجاح');
            await loadLoads(selectedBreakerId);
        } else {
            showAlert(`فشل حذف الحمل: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في حذف الحمل:', error);
        showAlert('حدث خطأ غير متوقع أثناء حذف الحمل', 'danger');
    }
}

/**
 * تعديل حمل (للتنفيذ لاحقاً)
 * @param {number} id - معرف الحمل
 */
async function editLoad(id) {
    alert(`سيتم تنفيذ وظيفة تعديل الحمل ذو المعرف ${id} لاحقاً`);
}

/**
 * طلب حذف حمل
 * @param {number} id - معرف الحمل
 * @param {string} name - اسم الحمل
 */
function deleteLoad(id, name) {
    // تخزين معرف العنصر المراد حذفه للاستخدام لاحقاً
    window.deleteItemId = id;
    
    // تحديث نص مودال التأكيد
    document.getElementById('delete-item-name').textContent = `الحمل "${name}"`;
    
    // إظهار مودال التأكيد
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    confirmModal.show();
}

/**
 * تنفيذ حذف الحمل بعد التأكيد
 */
async function confirmDelete() {
    const id = window.deleteItemId;
    
    // إغلاق المودال
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    modal.hide();
    
    try {
        const result = await LoadAPI.delete(id);
        
        if (result.success) {
            showAlert('تم حذف الحمل بنجاح');
            await loadLoads(selectedBreakerId);
        } else {
            showAlert(`فشل حذف الحمل: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في حذف الحمل:', error);
        showAlert('حدث خطأ غير متوقع أثناء حذف الحمل', 'danger');
    }
}