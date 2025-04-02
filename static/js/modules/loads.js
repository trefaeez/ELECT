/**
 * loads.js
 * ملف JavaScript الخاص بصفحة الأحمال الكهربائية
 */

// استيراد الوظائف من ملف API
import { CircuitBreakerAPI, LoadAPI } from '../api_endpoints.js';

// تهيئة المتغيرات
let selectedBreakerId = null;
let loadBeingEdited = null; // لتخزين معلومات الحمل الذي يتم تعديله

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
        updateAddLoadButtonState();
    });
    
    // فلترة الأحمال حسب النوع
    document.getElementById('load-filter-type').addEventListener('change', function() {
        filterLoadsByType(this.value);
    });
    
    // إضافة حمل جديد
    document.getElementById('add-load-btn').addEventListener('click', () => showLoadModal());
    document.getElementById('save-load-btn').addEventListener('click', saveLoad);
    
    // حساب استهلاك الطاقة تلقائيًا عند تغيير الأمبير أو الجهد أو معامل القدرة
    document.getElementById('load-ampacity').addEventListener('input', calculatePowerConsumption);
    document.getElementById('load-voltage').addEventListener('change', calculatePowerConsumption);
    document.getElementById('load-power-factor').addEventListener('input', calculatePowerConsumption);
    
    // زر تأكيد الحذف
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
    
    // إعادة ضبط النموذج عند إغلاق المودال
    const loadModal = document.getElementById('addLoadModal');
    if (loadModal) {
        loadModal.addEventListener('hidden.bs.modal', resetLoadForm);
    }
}

/**
 * تحديث حالة زر إضافة حمل
 */
function updateAddLoadButtonState() {
    const addLoadBtn = document.getElementById('add-load-btn');
    if (addLoadBtn) {
        addLoadBtn.disabled = !selectedBreakerId;
    }
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
    if (!alertsContainer) {
        console.error('لم يتم العثور على حاوية التنبيهات');
        return;
    }
    
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
    const modalDropdown = document.getElementById('load-breaker-id');
    
    if (!dropdown) {
        console.error('لم يتم العثور على قائمة القواطع المنسدلة');
        return;
    }
    
    // الحفاظ على خيار "الكل" في المقدمة للقائمة المنسدلة الرئيسية
    let options = '<option value="">كل القواطع</option>';
    
    // إنشاء خيارات القواطع
    const breakerOptions = breakers.map(breaker => {
        // إضافة معلومات اللوحة إلى اسم القاطع لتسهيل التمييز
        const panelName = breaker.panel_details ? ` (${breaker.panel_details.name})` : '';
        const breakerText = `${breaker.name || `قاطع #${breaker.id}`}${panelName}`;
        
        const selected = selectedBreakerId && selectedBreakerId == breaker.id ? 'selected' : '';
        return `<option value="${breaker.id}" ${selected}>${breakerText}</option>`;
    }).join('');
    
    // إضافة الخيارات للقائمة المنسدلة الرئيسية
    dropdown.innerHTML = options + breakerOptions;
    
    // إضافة الخيارات للقائمة المنسدلة في المودال (إذا وجدت)
    if (modalDropdown) {
        modalDropdown.innerHTML = breakerOptions;
        
        // تحديد القاطع المختار في المودال
        if (selectedBreakerId) {
            modalDropdown.value = selectedBreakerId;
        }
    }
    
    // تحديث حالة زر إضافة حمل
    updateAddLoadButtonState();
}

/**
 * تحميل بيانات الأحمال
 * @param {number} breakerId - معرف القاطع (اختياري)
 */
async function loadLoads(breakerId = null) {
    try {
        const tableBody = document.getElementById('loads-table-body');
        if (!tableBody) {
            console.error('لم يتم العثور على جدول الأحمال');
            return;
        }
        
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">جاري التحميل... <div class="loading-spinner"></div></td></tr>';
        
        let result;
        
        if (breakerId) {
            // تحميل الأحمال المرتبطة بقاطع محدد
            result = await CircuitBreakerAPI.getLoads(breakerId);
        } else {
            // تحميل جميع الأحمال
            result = await LoadAPI.getAll();
        }
        
        if (result.success) {
            updateLoadsTable(result.data);
        } else {
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">حدث خطأ أثناء تحميل البيانات</td></tr>';
            showAlert(`فشل تحميل الأحمال: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل الأحمال:', error);
        const tableBody = document.getElementById('loads-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">حدث خطأ غير متوقع</td></tr>';
        }
        showAlert('حدث خطأ غير متوقع أثناء تحميل الأحمال', 'danger');
    }
}

/**
 * تحديث جدول الأحمال بالبيانات المستلمة
 * @param {Array} loads - مصفوفة الأحمال
 */
function updateLoadsTable(loads) {
    const tableBody = document.getElementById('loads-table-body');
    if (!tableBody) {
        console.error('لم يتم العثور على جدول الأحمال');
        return;
    }
    
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
        const powerConsumption = load.power_consumption || (load.voltage * load.ampacity * (load.power_factor || 0.85)).toFixed(0);
        
        // إضافة الأيقونة المناسبة لنوع الحمل
        let typeIcon = getLoadTypeIcon(load.load_type);
        
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
        button.addEventListener('click', (e) => {
            const id = e.target.closest('button').dataset.id;
            if (id) editLoad(id);
        });
    });
    
    document.querySelectorAll('.delete-load').forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            if (id && name) deleteLoad(id, name);
        });
    });
    
    // تطبيق الفلتر الحالي بعد تحديث الجدول
    const currentFilter = document.getElementById('load-filter-type');
    if (currentFilter && currentFilter.value) {
        filterLoadsByType(currentFilter.value);
    }
}

/**
 * الحصول على أيقونة مناسبة لنوع الحمل
 * @param {string} loadType - نوع الحمل
 * @returns {string} - كلاس الأيقونة
 */
function getLoadTypeIcon(loadType) {
    switch(loadType) {
        case 'machine': return 'fa-cogs';
        case 'service_panel': return 'fa-table-cells';
        case 'outlet': return 'fa-plug';
        case 'lighting': return 'fa-lightbulb';
        case 'fan': return 'fa-fan';
        case 'screen': return 'fa-desktop';
        case 'exhaust': return 'fa-wind';
        case 'ac': return 'fa-snowflake';
        case 'heater': return 'fa-fire';
        case 'refrigerator': return 'fa-temperature-low';
        case 'motor': return 'fa-gauge-high';
        case 'pump': return 'fa-faucet';
        default: return 'fa-question';
    }
}

/**
 * تصفية الأحمال حسب النوع
 * @param {string} type - نوع الحمل
 */
function filterLoadsByType(type) {
    const rows = document.querySelectorAll('#loads-table-body tr[data-id]');
    
    if (!rows.length) {
        return;
    }
    
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
 * إظهار مودال إضافة/تعديل الحمل
 * @param {Object} loadData - بيانات الحمل (اختياري، للتعديل)
 */
function showLoadModal(loadData = null) {
    // تحديث عنوان المودال
    const modalTitle = document.getElementById('addLoadModalLabel');
    if (modalTitle) {
        modalTitle.textContent = loadData ? 'تعديل حمل كهربائي' : 'إضافة حمل كهربائي جديد';
    }
    
    // تعيين القاطع المحدد في المودال
    const breakerDropdown = document.getElementById('load-breaker-id');
    if (breakerDropdown) {
        if (loadData && loadData.breaker) {
            breakerDropdown.value = loadData.breaker;
        } else if (selectedBreakerId) {
            breakerDropdown.value = selectedBreakerId;
        }
    }
    
    // إذا كان هناك بيانات، ملء النموذج بها
    if (loadData) {
        loadBeingEdited = loadData;
        populateLoadForm(loadData);
    } else {
        loadBeingEdited = null;
    }
    
    // إظهار المودال
    const modal = new bootstrap.Modal(document.getElementById('addLoadModal'));
    modal.show();
}

/**
 * ملء نموذج الحمل بالبيانات
 * @param {Object} loadData - بيانات الحمل
 */
function populateLoadForm(loadData) {
    document.getElementById('load-name').value = loadData.name || '';
    document.getElementById('load-type').value = loadData.load_type || '';
    document.getElementById('load-voltage').value = loadData.voltage || 220;
    document.getElementById('load-ampacity').value = loadData.ampacity || '';
    document.getElementById('load-power-factor').value = loadData.power_factor || 0.85;
    document.getElementById('load-power-consumption').value = loadData.power_consumption || '';
    
    // تعبئة الحقول الاختيارية إذا كانت متوفرة
    if (loadData.cable_length) {
        document.getElementById('load-cable-length').value = loadData.cable_length;
    }
    
    if (loadData.estimated_usage_hours) {
        document.getElementById('load-usage-hours').value = loadData.estimated_usage_hours;
    }
    
    if (loadData.label) {
        document.getElementById('load-label').value = loadData.label;
    }
    
    if (loadData.description) {
        document.getElementById('load-description').value = loadData.description;
    }
    
    // حساب استهلاك الطاقة تلقائيًا
    calculatePowerConsumption();
}

/**
 * إعادة ضبط نموذج الحمل
 */
function resetLoadForm() {
    const form = document.getElementById('add-load-form');
    if (form) {
        form.reset();
        loadBeingEdited = null;
    }
}

/**
 * حفظ حمل (جديد أو تعديل حمل موجود)
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
        let result;
        
        if (loadBeingEdited) {
            // تحديث حمل موجود
            result = await LoadAPI.update(loadBeingEdited.id, loadData);
        } else {
            // إضافة حمل جديد
            result = await CircuitBreakerAPI.addLoad(breakerId, loadData);
        }
        
        if (result.success) {
            // إغلاق المودال
            const modal = bootstrap.Modal.getInstance(document.getElementById('addLoadModal'));
            if (modal) {
                modal.hide();
            }
            
            // إظهار رسالة نجاح
            showAlert(loadBeingEdited ? 'تم تحديث الحمل بنجاح' : 'تم إضافة الحمل بنجاح');
            
            // إعادة تحميل البيانات
            await loadLoads(selectedBreakerId);
        } else {
            showAlert(`فشل ${loadBeingEdited ? 'تحديث' : 'إضافة'} الحمل: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error(`خطأ في ${loadBeingEdited ? 'تحديث' : 'إضافة'} الحمل:`, error);
        showAlert(`حدث خطأ غير متوقع أثناء ${loadBeingEdited ? 'تحديث' : 'إضافة'} الحمل`, 'danger');
    }
}

/**
 * تحرير حمل موجود
 * @param {number} id - معرف الحمل
 */
async function editLoad(id) {
    if (!id) return;
    
    try {
        // عرض مؤشر التحميل
        showAlert('جاري تحميل بيانات الحمل...', 'info');
        
        // جلب بيانات الحمل من الخادم
        const result = await LoadAPI.getById(id);
        
        if (result.success) {
            // إزالة تنبيه التحميل
            document.querySelectorAll('.alert-info').forEach(el => el.remove());
            
            // فتح المودال مع بيانات الحمل
            showLoadModal(result.data);
        } else {
            showAlert(`فشل تحميل بيانات الحمل: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات الحمل:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل بيانات الحمل', 'danger');
    }
}

/**
 * طلب حذف حمل
 * @param {number} id - معرف الحمل
 * @param {string} name - اسم الحمل
 */
function deleteLoad(id, name) {
    if (!id) return;
    
    // تخزين معرف العنصر المراد حذفه للاستخدام لاحقًا
    window.deleteItemId = id;
    
    // تحديث نص مودال التأكيد
    const deleteItemName = document.getElementById('delete-item-name');
    if (deleteItemName) {
        deleteItemName.textContent = `الحمل "${name}"`;
    }
    
    // إظهار مودال التأكيد
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    confirmModal.show();
}

/**
 * تنفيذ حذف الحمل بعد التأكيد
 */
async function confirmDelete() {
    const id = window.deleteItemId;
    if (!id) return;
    
    // إغلاق المودال
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    if (modal) {
        modal.hide();
    }
    
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