/**
 * panel-core.js
 * ملف JavaScript الأساسي الخاص بإدارة اللوحات الكهربائية
 */

// استيراد الوظائف من ملف API
import { PowerSourceAPI, PanelAPI, CircuitBreakerAPI } from '../api_endpoints.js';
import { loadPanelsTable } from './panel-ui.js';
import { setupFormEventListeners } from './panel-forms.js';
import { setupBreakerEventListeners } from './panel-breakers.js';

// تهيئة المتغيرات المشتركة
let selectedPowerSourceId = null;
let selectedPanelTypeFilter = '';
let mainPanels = []; // اللوحات الرئيسية
let allPanels = []; // جميع اللوحات
let allPowerSources = []; // جميع مصادر الطاقة
let isEditMode = false;
let editPanelId = null;

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
    const panelType = urlParams.get('type');
    
    if (sourceId) {
        selectedPowerSourceId = sourceId;
    }
    
    if (panelType) {
        selectedPanelTypeFilter = panelType;
        const filterElement = document.getElementById('panel-filter-type');
        if (filterElement) {
            filterElement.value = panelType;
        }
    }
}

/**
 * إعداد مستمعي الأحداث للعناصر التفاعلية
 */
function setupEventListeners() {
    // فلترة اللوحات حسب مصدر الطاقة
    const sourceFilter = document.getElementById('panel-filter-source');
    if (sourceFilter) {
        sourceFilter.addEventListener('change', function() {
            selectedPowerSourceId = this.value;
            loadPanels();
        });
    }
    
    // فلترة اللوحات حسب النوع
    const typeFilter = document.getElementById('panel-filter-type');
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            selectedPanelTypeFilter = this.value;
            loadPanels();
        });
    }
    
    // إضافة مستمعي الأحداث للنماذج والأزرار
    setupFormEventListeners();
    setupBreakerEventListeners();
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
 * تحميل القائمة المنسدلة لمصادر الطاقة
 */
async function loadPowerSourcesDropdown() {
    try {
        const result = await PowerSourceAPI.getAll();
        
        if (result.success) {
            allPowerSources = result.data;
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
    if (!dropdown) return;
    
    // الحفاظ على خيار "الكل" في المقدمة
    let options = '<option value="">كل مصادر الطاقة</option>';
    
    powerSources.forEach(source => {
        const selected = selectedPowerSourceId && selectedPowerSourceId == source.id ? 'selected' : '';
        options += `<option value="${source.id}" ${selected}>${source.name}</option>`;
    });
    
    dropdown.innerHTML = options;
    
    // تفعيل زر إضافة لوحة إذا كان هناك مصادر طاقة متاحة
    const addPanelBtn = document.getElementById('add-panel-btn');
    if (addPanelBtn) {
        addPanelBtn.disabled = powerSources.length === 0;
    }
    
    // تحديث اللوحات المعروضة إذا تم تحديد مصدر طاقة
    if (selectedPowerSourceId) {
        dropdown.value = selectedPowerSourceId;
    }
}

/**
 * تحميل بيانات اللوحات
 */
async function loadPanels() {
    try {
        const tableBody = document.getElementById('panels-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                </td>
            </tr>
        `;
        
        // تحميل جميع اللوحات
        const result = await PanelAPI.getAll();
        
        if (result.success) {
            allPanels = result.data;
            
            // تطبيق الفلاتر
            let filteredPanels = allPanels;
            
            if (selectedPowerSourceId) {
                filteredPanels = filteredPanels.filter(panel => 
                    panel.power_source && panel.power_source.id == selectedPowerSourceId
                );
            }
            
            if (selectedPanelTypeFilter) {
                filteredPanels = filteredPanels.filter(panel => 
                    panel.panel_type === selectedPanelTypeFilter
                );
            }
            
            // تحديث الجدول
            loadPanelsTable(filteredPanels);
        } else {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">حدث خطأ أثناء تحميل البيانات</td></tr>';
            showAlert(`فشل تحميل اللوحات: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل اللوحات:', error);
        const tableBody = document.getElementById('panels-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">حدث خطأ غير متوقع</td></tr>';
        }
        showAlert('حدث خطأ غير متوقع أثناء تحميل اللوحات', 'danger');
    }
}

/**
 * تحميل القائمة المنسدلة للوحات الرئيسية
 * @param {string} elementId - معرف عنصر القائمة المنسدلة
 */
async function loadMainPanelsDropdown(elementId = 'panel-parent') {
    try {
        // تحميل جميع اللوحات
        const result = await PanelAPI.getAll();
        
        if (!result.success) {
            showAlert(`فشل تحميل بيانات اللوحات: ${result.error.message}`, 'danger');
            return;
        }
        
        // تصفية اللوحات الرئيسية والرئيسية الفرعية
        const mainPanelsList = result.data.filter(panel => 
            panel.panel_type === 'main' || panel.panel_type === 'sub_main'
        );
        
        // حفظ في المتغير العام
        mainPanels = mainPanelsList;
        
        // تحضير القائمة المنسدلة
        const dropdown = document.getElementById(elementId);
        if (!dropdown) return;
        
        dropdown.innerHTML = '<option value="">-- اختر اللوحة الأم --</option>';
        
        mainPanelsList.forEach(panel => {
            const option = document.createElement('option');
            option.value = panel.id;
            option.textContent = `${panel.name} (${getPanelTypeDisplay(panel.panel_type)})`;
            dropdown.appendChild(option);
        });
    } catch (error) {
        console.error('خطأ في تحميل قائمة اللوحات الرئيسية:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل قائمة اللوحات الرئيسية', 'danger');
    }
}

/**
 * عرض نص وصفي لنوع اللوحة
 * @param {string} panelType - رمز نوع اللوحة
 * @returns {string} النص الوصفي
 */
function getPanelTypeDisplay(panelType) {
    const types = {
        'main': '<span class="badge bg-success">لوحة رئيسية</span>',
        'sub_main': '<span class="badge bg-warning text-dark">لوحة رئيسية فرعية</span>',
        'sub': '<span class="badge bg-info">لوحة فرعية</span>'
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

// تصدير الوظائف والمتغيرات اللازمة للاستخدام في الملفات الأخرى
export {
    showAlert,
    loadPanels,
    loadMainPanelsDropdown,
    getPanelTypeDisplay,
    getVoltageDisplay,
    allPanels,
    allPowerSources,
    mainPanels,
    selectedPowerSourceId,
    selectedPanelTypeFilter,
    isEditMode,
    editPanelId
};