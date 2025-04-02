/**
 * panels.js
 * ملف JavaScript الخاص بصفحة اللوحات الكهربائية
 * تم تحديثه ليدعم الهيكلية الشجرية للوحات
 */

// استيراد الوظائف من ملف API
import { PowerSourceAPI, PanelAPI, CircuitBreakerAPI } from '../api_endpoints.js';

// تهيئة المتغيرات
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
    
    // تفعيل التبديل بين طرق العرض (جدول/هيكل شجري)
    setupViewToggle();
});

/**
 * تفعيل التبديل بين طرق العرض
 */
function setupViewToggle() {
    // التحقق أولاً من وجود عناصر التبديل
    const tableToggle = document.getElementById('view-toggle-table');
    const treeToggle = document.getElementById('view-toggle-tree');
    
    // إذا لم تكن العناصر موجودة، نخرج من الدالة بدون خطأ
    if (!tableToggle || !treeToggle) {
        console.log('عناصر التبديل بين طرق العرض غير موجودة في هذه الصفحة');
        return;
    }
    
    // التبديل بين عرض الجدول وعرض الهيكل الشجري
    tableToggle.addEventListener('click', function() {
        document.getElementById('panels-table-view').classList.remove('d-none');
        document.getElementById('panels-tree-container').classList.add('d-none');
        this.classList.add('active');
        treeToggle.classList.remove('active');
    });
    
    treeToggle.addEventListener('click', function() {
        document.getElementById('panels-table-view').classList.add('d-none');
        document.getElementById('panels-tree-container').classList.remove('d-none');
        this.classList.add('active');
        tableToggle.classList.remove('active');
    });
}

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
        document.getElementById('panel-filter-type').value = panelType;
    }
}

/**
 * إعداد مستمعي الأحداث للعناصر التفاعلية
 */
function setupEventListeners() {
    // فلترة اللوحات حسب مصدر الطاقة
    document.getElementById('panel-filter-source').addEventListener('change', function() {
        selectedPowerSourceId = this.value;
        loadPanels();
    });
    
    // فلترة اللوحات حسب النوع
    document.getElementById('panel-filter-type').addEventListener('change', function() {
        selectedPanelTypeFilter = this.value;
        loadPanels();
    });
    
    // إضافة لوحة جديدة
    document.getElementById('add-panel-btn').addEventListener('click', () => showAddPanelModal(false));
    document.getElementById('save-panel-btn').addEventListener('click', savePanel);
    
    // زر تأكيد الحذف
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
    
    // تغيير نوع اللوحة (رئيسية، رئيسية فرعية، فرعية)
    document.getElementById('panel-type').addEventListener('change', togglePanelSourceFields);
    
    // تغيير اللوحة الأم
    document.getElementById('panel-parent').addEventListener('change', loadParentPanelBreakers);
    
    // تعيين القاطع الرئيسي للوحة
    document.getElementById('save-main-breaker-btn').addEventListener('click', saveMainBreaker);
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
        const mainPanels = result.data.filter(panel => 
            panel.panel_type === 'main' || panel.panel_type === 'sub_main'
        );
        
        // تحضير القائمة المنسدلة
        const dropdown = document.getElementById(elementId);
        dropdown.innerHTML = '<option value="">-- اختر اللوحة الأم --</option>';
        
        mainPanels.forEach(panel => {
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
 * تحميل القواطع الموجودة في اللوحة الأم
 */
async function loadParentPanelBreakers() {
    const parentPanelId = document.getElementById('panel-parent').value;
    const feederBreakerSelect = document.getElementById('panel-feeder-breaker');
    
    if (!parentPanelId) {
        feederBreakerSelect.innerHTML = '<option value="">-- اختر القاطع المغذي --</option>';
        feederBreakerSelect.disabled = true;
        return;
    }
    
    try {
        // تحميل القواطع الموجودة في اللوحة الأم
        const result = await PanelAPI.getBreakers(parentPanelId);
        
        if (!result.success) {
            showAlert(`فشل تحميل قواطع اللوحة الأم: ${result.error.message}`, 'danger');
            return;
        }
        
        const breakers = result.data;
        
        // تحضير القائمة المنسدلة
        feederBreakerSelect.innerHTML = '<option value="">-- اختر القاطع المغذي --</option>';
        
        if (breakers.length === 0) {
            feederBreakerSelect.innerHTML += '<option value="" disabled>لا توجد قواطع في اللوحة الأم</option>';
        } else {
            breakers.forEach(breaker => {
                const option = document.createElement('option');
                option.value = breaker.id;
                option.textContent = `${breaker.name} (${breaker.type} - ${breaker.ampacity}A)`;
                feederBreakerSelect.appendChild(option);
            });
            
            feederBreakerSelect.disabled = false;
        }
    } catch (error) {
        console.error('خطأ في تحميل قواطع اللوحة الأم:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل قواطع اللوحة الأم', 'danger');
    }
}

/**
 * تحميل بيانات اللوحات
 */
async function loadPanels() {
    try {
        const tableBody = document.getElementById('panels-table-body');
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                </td>
            </tr>
        `;
        
        const treeView = document.getElementById('panels-tree-view');
        treeView.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">جاري التحميل...</span>
                </div>
            </div>
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
            
            // تحديث الجدول والهيكل الشجري
            updatePanelsTable(filteredPanels);
            updatePanelsTreeView(allPanels);
        } else {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">حدث خطأ أثناء تحميل البيانات</td></tr>';
            treeView.innerHTML = '<div class="text-center text-danger">حدث خطأ أثناء تحميل البيانات</div>';
            showAlert(`فشل تحميل اللوحات: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل اللوحات:', error);
        document.getElementById('panels-table-body').innerHTML = 
            '<tr><td colspan="8" class="text-center text-danger">حدث خطأ غير متوقع</td></tr>';
        document.getElementById('panels-tree-view').innerHTML = 
            '<div class="text-center text-danger">حدث خطأ غير متوقع</div>';
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
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">لا توجد لوحات مسجلة</td></tr>';
        return;
    }
    
    let tableHTML = '';
    
    panels.forEach(panel => {
        // تحديد مصدر التغذية (إما مصدر طاقة أو لوحة أم)
        let powerSourceInfo = '-';
        if (panel.power_source) {
            powerSourceInfo = `<span class="badge bg-primary">مصدر طاقة:</span> ${panel.power_source.name}`;
        } else if (panel.parent_panel) {
            powerSourceInfo = `<span class="badge bg-success">لوحة أم:</span> ${panel.parent_panel.name}`;
        }
        
        // تحضير المسار الكامل للوحة
        const fullPath = panel.full_path || '-';
        
        tableHTML += `
            <tr data-id="${panel.id}">
                <td>${panel.id}</td>
                <td>${panel.name}</td>
                <td>${getPanelTypeDisplay(panel.panel_type)}</td>
                <td>${getVoltageDisplay(panel.voltage)}</td>
                <td>${panel.ampacity} A</td>
                <td>${powerSourceInfo}</td>
                <td class="small text-muted">${fullPath}</td>
                <td class="action-buttons">
                    <div class="dropdown">
                        <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                            الإجراءات
                        </button>
                        <ul class="dropdown-menu">
                            <li>
                                <a class="dropdown-item" href="/breakers?panel=${panel.id}">
                                    <i class="fas fa-toggle-on"></i> القواطع
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item view-panel" href="#" data-id="${panel.id}">
                                    <i class="fas fa-eye"></i> عرض التفاصيل
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item set-main-breaker" href="#" data-id="${panel.id}">
                                    <i class="fas fa-plug"></i> تعيين القاطع الرئيسي
                                </a>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item edit-panel" href="#" data-id="${panel.id}">
                                    <i class="fas fa-edit"></i> تعديل
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item add-child-panel" href="#" data-id="${panel.id}">
                                    <i class="fas fa-plus"></i> إضافة لوحة فرعية
                                </a>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item text-danger delete-panel" href="#" data-id="${panel.id}" data-name="${panel.name}">
                                    <i class="fas fa-trash"></i> حذف
                                </a>
                            </li>
                        </ul>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
    
    // إضافة مستمعي الأحداث للأزرار
    document.querySelectorAll('.view-panel').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            viewPanelDetails(e.target.closest('a').dataset.id);
        });
    });
    
    document.querySelectorAll('.edit-panel').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            showAddPanelModal(true, e.target.closest('a').dataset.id);
        });
    });
    
    document.querySelectorAll('.add-child-panel').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            showAddChildPanelModal(e.target.closest('a').dataset.id);
        });
    });
    
    document.querySelectorAll('.set-main-breaker').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            showSetMainBreakerModal(e.target.closest('a').dataset.id);
        });
    });
    
    document.querySelectorAll('.delete-panel').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const btn = e.target.closest('a');
            deletePanel(btn.dataset.id, btn.dataset.name);
        });
    });
}

/**
 * تحديث عرض الهيكل الشجري للوحات
 * @param {Array} panels - مصفوفة اللوحات
 */
function updatePanelsTreeView(panels) {
    const treeView = document.getElementById('panels-tree-view');
    
    // تصنيف اللوحات حسب النوع
    const mainPanels = panels.filter(panel => panel.panel_type === 'main');
    const powerSources = allPowerSources;
    
    if (mainPanels.length === 0 && powerSources.length === 0) {
        treeView.innerHTML = '<div class="text-center py-3">لا توجد لوحات مسجلة</div>';
        return;
    }
    
    let treeHTML = '';
    
    // إضافة مصادر الطاقة في المستوى الأول
    if (powerSources.length > 0) {
        treeHTML += '<ul class="tree-root">';
        
        powerSources.forEach(source => {
            const sourcePanels = panels.filter(panel => panel.power_source && panel.power_source.id === source.id);
            
            let className = 'tree-item-collapsed'; // مغلق افتراضياً
            let iconClass = 'fa-plus-square'; // أيقونة الإضافة
            
            // إذا كان هناك مصدر طاقة واحد وتم اختياره في الفلتر، افتح الشجرة تلقائياً
            if (selectedPowerSourceId && selectedPowerSourceId == source.id) {
                className = '';
                iconClass = 'fa-minus-square';
            }
            
            treeHTML += `
                <li class="tree-item ${className}">
                    <div class="tree-item-header">
                        <i class="tree-toggle far ${iconClass}"></i>
                        <i class="fas fa-plug text-primary"></i>
                        <span class="tree-item-name">${source.name}</span>
                        <span class="tree-item-badge">${source.voltage} | ${source.total_ampacity}A</span>
                    </div>
            `;
            
            if (sourcePanels.length > 0) {
                treeHTML += buildPanelTreeBranch(sourcePanels, panels, source.id);
            } else {
                treeHTML += '<ul class="tree-children"><li class="text-muted small">لا توجد لوحات</li></ul>';
            }
            
            treeHTML += '</li>';
        });
        
        treeHTML += '</ul>';
    }
    
    treeView.innerHTML = treeHTML;
    
    // إضافة مستمعي الأحداث لطي وفتح الشجرة
    document.querySelectorAll('.tree-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const treeItem = e.target.closest('.tree-item');
            treeItem.classList.toggle('tree-item-collapsed');
            
            // تبديل الأيقونة
            e.target.classList.toggle('fa-plus-square');
            e.target.classList.toggle('fa-minus-square');
        });
    });
    
    // إضافة مستمعي الأحداث لعناصر الشجرة
    document.querySelectorAll('.open-panel').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            viewPanelDetails(e.target.dataset.id);
        });
    });
}

/**
 * بناء فرع الهيكل الشجري للوحات
 * @param {Array} branchPanels - اللوحات في هذا الفرع
 * @param {Array} allPanels - جميع اللوحات للبحث عن اللوحات الفرعية
 * @param {number} parentSourceId - معرف المصدر الأب (مصدر طاقة أو لوحة)
 * @param {boolean} isFromPanel - هل الأب هو لوحة (وليس مصدر طاقة)
 * @returns {string} HTML للفرع
 */
function buildPanelTreeBranch(branchPanels, allPanels, parentSourceId, isFromPanel = false) {
    if (branchPanels.length === 0) return '';
    
    let html = '<ul class="tree-children">';
    
    // فرز اللوحات حسب الاسم
    branchPanels.sort((a, b) => a.name.localeCompare(b.name));
    
    branchPanels.forEach(panel => {
        // البحث عن اللوحات الفرعية لهذه اللوحة
        const childPanels = allPanels.filter(p => p.parent_panel && p.parent_panel.id === panel.id);
        
        // تحديد لون وأيقونة اللوحة حسب نوعها
        let iconClass = 'fa-server';
        let textColorClass = 'text-success';
        
        if (panel.panel_type === 'sub_main') {
            iconClass = 'fa-network-wired';
            textColorClass = 'text-warning';
        } else if (panel.panel_type === 'sub') {
            iconClass = 'fa-cube';
            textColorClass = 'text-info';
        }
        
        html += `
            <li class="tree-item tree-item-collapsed">
                <div class="tree-item-header">
                    ${childPanels.length > 0 ? '<i class="tree-toggle far fa-plus-square"></i>' : '<i class="tree-spacer"></i>'}
                    <i class="fas ${iconClass} ${textColorClass}"></i>
                    <a href="#" class="tree-item-name open-panel" data-id="${panel.id}">${panel.name}</a>
                    <span class="tree-item-badge">${panel.voltage} | ${panel.ampacity}A</span>
                </div>
        `;
        
        if (childPanels.length > 0) {
            html += buildPanelTreeBranch(childPanels, allPanels, panel.id, true);
        }
        
        html += '</li>';
    });
    
    html += '</ul>';
    return html;
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

/**
 * عرض نافذة إضافة/تعديل لوحة
 * @param {boolean} isEdit - هل هي عملية تعديل
 * @param {number} panelId - معرف اللوحة (في حالة التعديل)
 */
async function showAddPanelModal(isEdit = false, panelId = null) {
    const modalTitle = document.getElementById('addPanelModalLabel');
    const saveButton = document.getElementById('save-panel-btn');
    const form = document.getElementById('add-panel-form');
    
    // التحقق من وجود النموذج قبل استخدامه
    if (!form) {
        console.log('نموذج إضافة اللوحة غير موجود في هذه الصفحة');
        return;
    }
    
    // إعادة ضبط النموذج
    form.reset();
    
    if (isEdit && panelId) {
        modalTitle.textContent = 'تعديل لوحة';
        saveButton.textContent = 'حفظ التعديلات';
        
        // تحميل بيانات اللوحة
        const result = await PanelAPI.getById(panelId);
        
        if (result.success) {
            const panel = result.data;
            
            // ملء حقول النموذج
            document.getElementById('panel-power-source-id').value = panel.power_source ? panel.power_source.id : '';
            document.getElementById('panel-name').value = panel.name;
            document.getElementById('panel-voltage').value = panel.voltage;
            document.getElementById('panel-ampacity').value = panel.ampacity;
        } else {
            showAlert(`فشل تحميل بيانات اللوحة: ${result.error.message}`, 'danger');
            return;
        }
    } else {
        modalTitle.textContent = 'إضافة لوحة جديدة';
        saveButton.textContent = 'إضافة';
        
        // تعيين معرف مصدر الطاقة من عنصر الفلترة
        const powerSourceSelect = document.getElementById('panel-filter-source');
        if (powerSourceSelect && powerSourceSelect.value) {
            document.getElementById('panel-power-source-id').value = powerSourceSelect.value;
        }
    }
    
    // عرض النافذة
    const modal = new bootstrap.Modal(document.getElementById('addPanelModal'));
    modal.show();
}

/**
 * عرض نافذة إضافة لوحة فرعية
 * @param {number} parentPanelId - معرف اللوحة الأم
 */
async function showAddChildPanelModal(parentPanelId) {
    const modalTitle = document.getElementById('panelModalLabel');
    const saveButton = document.getElementById('save-panel-btn');
    const form = document.getElementById('panel-form');
    
    // إعادة ضبط النموذج
    form.reset();
    
    // إخفاء نموذج مصدر الطاقة وإظهار نموذج اللوحة الأم
    document.getElementById('powerSourceForm').style.display = 'none';
    document.getElementById('parentPanelForm').style.display = 'block';
    
    // تحميل بيانات اللوحات الرئيسية
    await loadMainPanelsDropdown('panel-parent-panel');
    
    // تعيين اللوحة الأم في القائمة المنسدلة
    document.getElementById('power-source-type').value = 'parent-panel';
    document.getElementById('panel-parent-panel').value = parentPanelId;
    
    // تحميل بيانات اللوحة الأم لتحديد نوع اللوحة الفرعية
    const result = await PanelAPI.getById(parentPanelId);
    
    if (result.success) {
        const parentPanel = result.data;
        
        modalTitle.textContent = `إضافة لوحة فرعية لـ ${parentPanel.name}`;
        saveButton.textContent = 'إضافة';
        document.getElementById('panel-id').value = '';
        
        // تعيين نوع اللوحة بناءً على نوع اللوحة الأم
        if (parentPanel.panel_type === 'main') {
            document.getElementById('panel-type').value = 'sub_main';
        } else {
            document.getElementById('panel-type').value = 'sub';
        }
        
        // نسخ قيمة الجهد من اللوحة الأم
        document.getElementById('panel-voltage').value = parentPanel.voltage;
        
        // تفعيل التحقق من الحقول
        validatePanelForm();
    } else {
        showAlert(`فشل تحميل بيانات اللوحة الأم: ${result.error.message}`, 'danger');
        return;
    }
    
    // عرض النافذة
    const modal = new bootstrap.Modal(document.getElementById('panelModal'));
    modal.show();
}

/**
 * عرض نافذة تعيين القاطع الرئيسي للوحة
 * @param {number} panelId - معرف اللوحة
 */
async function showSetMainBreakerModal(panelId) {
    try {
        // تحميل بيانات اللوحة
        const panelResult = await PanelAPI.getById(panelId);
        
        if (!panelResult.success) {
            showAlert(`فشل تحميل بيانات اللوحة: ${panelResult.error.message}`, 'danger');
            return;
        }
        
        const panel = panelResult.data;
        
        // تحميل بيانات القواطع المتاحة
        const breakersResult = await CircuitBreakerAPI.getByPanel(panelId);
        
        if (!breakersResult.success) {
            showAlert(`فشل تحميل بيانات القواطع: ${breakersResult.error.message}`, 'danger');
            return;
        }
        
        const breakers = breakersResult.data;
        
        // تحضير القائمة المنسدلة للقواطع
        const selectBreaker = document.getElementById('main-breaker-select');
        selectBreaker.innerHTML = '<option value="">-- اختر القاطع الرئيسي --</option>';
        
        breakers.forEach(breaker => {
            const option = document.createElement('option');
            option.value = breaker.id;
            option.textContent = `${breaker.name} (${breaker.type} - ${breaker.ampacity}A)`;
            
            // تحديد القاطع الرئيسي الحالي إن وجد
            if (panel.main_breaker && panel.main_breaker.id === breaker.id) {
                option.selected = true;
            }
            
            selectBreaker.appendChild(option);
        });
        
        // تعيين معرف اللوحة في النموذج
        document.getElementById('main-breaker-panel-id').value = panelId;
        document.getElementById('main-breaker-panel-name').textContent = panel.name;
        
        // عرض النافذة
        const modal = new bootstrap.Modal(document.getElementById('mainBreakerModal'));
        modal.show();
    } catch (error) {
        console.error('خطأ في تحميل بيانات القاطع الرئيسي:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل بيانات القاطع الرئيسي', 'danger');
    }
}

/**
 * إظهار/إخفاء الحقول المتعلقة بمصدر التغذية بناءً على نوع اللوحة
 */
function togglePanelSourceFields() {
    const panelType = document.getElementById('panel-type').value;
    const sourceForms = document.querySelectorAll('.source-form');
    const powerSourceRadio = document.getElementById('power-source-radio');
    const parentPanelRadio = document.getElementById('parent-panel-radio');
    
    // عرض أو إخفاء خيارات مصدر التغذية حسب نوع اللوحة
    if (panelType === 'main') {
        // لوحة رئيسية يمكن أن تتصل بمصدر طاقة فقط
        powerSourceRadio.checked = true;
        parentPanelRadio.disabled = true;
        
        document.getElementById('powerSourceForm').style.display = 'block';
        document.getElementById('parentPanelForm').style.display = 'none';
    } else {
        // لوحة فرعية أو رئيسية فرعية يمكن أن تتصل بلوحة أخرى
        parentPanelRadio.disabled = false;
    }
    
    // إظهار نموذج مصدر التغذية المحدد
    document.querySelectorAll('input[name="power-source-type"]').forEach(radio => {
        radio.addEventListener('change', updateSourceForm);
    });
    
    updateSourceForm();
}

/**
 * تحديث نموذج مصدر التغذية بناءً على الاختيار
 */
function updateSourceForm() {
    const selectedSourceType = document.querySelector('input[name="power-source-type"]:checked').value;
    
    if (selectedSourceType === 'power-source') {
        document.getElementById('powerSourceForm').style.display = 'block';
        document.getElementById('parentPanelForm').style.display = 'none';
    } else {
        document.getElementById('powerSourceForm').style.display = 'none';
        document.getElementById('parentPanelForm').style.display = 'block';
    }
}

/**
 * التحقق من صحة نموذج اللوحة
 */
function validatePanelForm() {
    const panelName = document.getElementById('panel-name').value.trim();
    const panelAmpacity = document.getElementById('panel-ampacity').value.trim();
    const powerSourceType = document.querySelector('input[name="power-source-type"]:checked').value;
    
    let isValid = true;
    
    // التحقق من اسم اللوحة
    if (panelName === '') {
        document.getElementById('panel-name').classList.add('is-invalid');
        isValid = false;
    } else {
        document.getElementById('panel-name').classList.remove('is-invalid');
    }
    
    // التحقق من سعة اللوحة
    if (panelAmpacity === '' || isNaN(panelAmpacity) || parseInt(panelAmpacity) <= 0) {
        document.getElementById('panel-ampacity').classList.add('is-invalid');
        isValid = false;
    } else {
        document.getElementById('panel-ampacity').classList.remove('is-invalid');
    }
    
    // التحقق من مصدر التغذية
    if (powerSourceType === 'power-source') {
        const powerSource = document.getElementById('panel-power-source').value;
        if (powerSource === '') {
            document.getElementById('panel-power-source').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('panel-power-source').classList.remove('is-invalid');
        }
    } else {
        const parentPanel = document.getElementById('panel-parent').value;
        if (parentPanel === '') {
            document.getElementById('panel-parent').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('panel-parent').classList.remove('is-invalid');
        }
    }
    
    // تفعيل/تعطيل زر الحفظ بناءً على صحة النموذج
    document.getElementById('save-panel-btn').disabled = !isValid;
    
    return isValid;
}

/**
 * حفظ بيانات اللوحة (إضافة/تعديل)
 */
async function savePanel() {
    // التحقق من صحة النموذج
    if (!validatePanelForm()) {
        return;
    }
    
    // تجميع بيانات اللوحة من النموذج
    const panelId = document.getElementById('panel-id').value;
    const panelName = document.getElementById('panel-name').value.trim();
    const panelType = document.getElementById('panel-type').value;
    const panelVoltage = document.getElementById('panel-voltage').value;
    const panelAmpacity = parseInt(document.getElementById('panel-ampacity').value.trim());
    const panelDescription = document.getElementById('panel-description').value.trim();
    
    // تحديد مصدر التغذية (مصدر طاقة أو لوحة أم)
    const powerSourceType = document.querySelector('input[name="power-source-type"]:checked').value;
    let powerSourceId = null;
    let parentPanelId = null;
    let feederBreakerId = null;
    
    if (powerSourceType === 'power-source') {
        powerSourceId = document.getElementById('panel-power-source').value;
    } else {
        parentPanelId = document.getElementById('panel-parent').value;
        feederBreakerId = document.getElementById('panel-feeder-breaker').value || null;
    }
    
    // تحضير البيانات للإرسال
    const panelData = {
        name: panelName,
        panel_type: panelType,
        voltage: panelVoltage,
        ampacity: panelAmpacity,
        description: panelDescription,
        power_source: powerSourceType === 'power-source' ? powerSourceId : null,
        parent_panel: powerSourceType === 'parent-panel' ? parentPanelId : null
    };
    
    try {
        let result;
        
        // إضافة لوحة جديدة أو تعديل لوحة موجودة
        if (panelId) {
            // تحديث لوحة موجودة
            result = await PanelAPI.update(panelId, panelData);
            
            if (result.success) {
                showAlert(`تم تحديث اللوحة "${panelName}" بنجاح`, 'success');
                
                // إذا تم تحديد قاطع مغذي، تحديثه
                if (powerSourceType === 'parent-panel' && feederBreakerId) {
                    await PanelAPI.setFeederBreaker(panelId, feederBreakerId);
                }
            } else {
                showAlert(`فشل تحديث اللوحة: ${result.error.message}`, 'danger');
            }
        } else {
            // إضافة لوحة جديدة
            if (powerSourceType === 'power-source') {
                // إضافة اللوحة إلى مصدر طاقة
                result = await PowerSourceAPI.addPanel(powerSourceId, panelData);
            } else {
                // إضافة لوحة فرعية إلى لوحة أم
                result = await PanelAPI.addChildPanel(parentPanelId, panelData);
                
                // إذا تم تحديد قاطع مغذي، تعيينه
                if (result.success && feederBreakerId) {
                    const newPanelId = result.data.id;
                    await PanelAPI.setFeederBreaker(newPanelId, feederBreakerId);
                }
            }
            
            if (result.success) {
                showAlert(`تم إضافة اللوحة "${panelName}" بنجاح`, 'success');
            } else {
                showAlert(`فشل إضافة اللوحة: ${result.error.message}`, 'danger');
            }
        }
        
        // إغلاق النافذة وتحديث البيانات
        if (result.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('panelModal'));
            modal.hide();
            
            // تحديث عرض اللوحات
            loadPanels();
        }
    } catch (error) {
        console.error('خطأ في حفظ اللوحة:', error);
        showAlert('حدث خطأ غير متوقع أثناء حفظ اللوحة', 'danger');
    }
}

/**
 * حذف لوحة
 * @param {number} panelId - معرف اللوحة
 * @param {string} panelName - اسم اللوحة
 */
async function deletePanel(panelId, panelName) {
    try {
        // تحقق إذا كانت اللوحة تحتوي على لوحات فرعية
        const childPanelsResult = await PanelAPI.getChildPanels(panelId);
        
        if (childPanelsResult.success && childPanelsResult.data.length > 0) {
            showAlert('لا يمكن حذف هذه اللوحة لأنها تحتوي على لوحات فرعية. يرجى حذف اللوحات الفرعية أولاً.', 'warning');
            return;
        }
        
        // إعداد نافذة تأكيد الحذف
        document.getElementById('delete-panel-id').value = panelId;
        document.getElementById('delete-panel-name').textContent = panelName;
        
        // عرض نافذة التأكيد
        const modal = new bootstrap.Modal(document.getElementById('deletePanelModal'));
        modal.show();
    } catch (error) {
        console.error('خطأ أثناء التحقق من اللوحات الفرعية:', error);
        showAlert('حدث خطأ غير متوقع أثناء التحقق من اللوحات الفرعية', 'danger');
    }
}

/**
 * تأكيد حذف اللوحة
 */
async function confirmDelete() {
    const panelId = document.getElementById('delete-panel-id').value;
    const panelName = document.getElementById('delete-panel-name').textContent;
    
    try {
        // حذف اللوحة
        const result = await PanelAPI.delete(panelId);
        
        // إغلاق نافذة التأكيد
        const modal = bootstrap.Modal.getInstance(document.getElementById('deletePanelModal'));
        modal.hide();
        
        if (result.success) {
            showAlert(`تم حذف اللوحة "${panelName}" بنجاح`, 'success');
            
            // تحديث عرض اللوحات
            loadPanels();
        } else {
            showAlert(`فشل حذف اللوحة: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في حذف اللوحة:', error);
        showAlert('حدث خطأ غير متوقع أثناء حذف اللوحة', 'danger');
    }
}

/**
 * حفظ القاطع الرئيسي للوحة
 */
async function saveMainBreaker() {
    const panelId = document.getElementById('main-breaker-panel-id').value;
    const breakerId = document.getElementById('main-breaker-select').value;
    
    try {
        let result;
        
        if (breakerId) {
            // تعيين القاطع الرئيسي
            result = await PanelAPI.setMainBreaker(panelId, breakerId);
            
            if (result.success) {
                showAlert('تم تعيين القاطع الرئيسي بنجاح', 'success');
            } else {
                showAlert(`فشل تعيين القاطع الرئيسي: ${result.error.message}`, 'danger');
            }
        } else {
            // إزالة القاطع الرئيسي
            result = await PanelAPI.setMainBreaker(panelId, null);
            
            if (result.success) {
                showAlert('تم إزالة القاطع الرئيسي بنجاح', 'success');
            } else {
                showAlert(`فشل إزالة القاطع الرئيسي: ${result.error.message}`, 'danger');
            }
        }
        
        // إغلاق النافذة وتحديث البيانات
        if (result.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('mainBreakerModal'));
            modal.hide();
            
            // تحديث عرض اللوحات
            loadPanels();
        }
    } catch (error) {
        console.error('خطأ في حفظ القاطع الرئيسي:', error);
        showAlert('حدث خطأ غير متوقع أثناء حفظ القاطع الرئيسي', 'danger');
    }
}

/**
 * عرض تفاصيل لوحة
 * @param {number} panelId - معرف اللوحة
 */
async function viewPanelDetails(panelId) {
    try {
        // تحميل بيانات اللوحة
        const result = await PanelAPI.getById(panelId);
        
        if (!result.success) {
            showAlert(`فشل تحميل بيانات اللوحة: ${result.error.message}`, 'danger');
            return;
        }
        
        const panel = result.data;
        
        // تحميل بيانات القواطع في اللوحة
        const breakersResult = await PanelAPI.getBreakers(panelId);
        const breakers = breakersResult.success ? breakersResult.data : [];
        
        // تحميل بيانات اللوحات الفرعية
        const childPanelsResult = await PanelAPI.getChildPanels(panelId);
        const childPanels = childPanelsResult.success ? childPanelsResult.data : [];
        
        // تعبئة بيانات النافذة
        document.getElementById('detail-panel-name').textContent = panel.name;
        document.getElementById('detail-panel-type').textContent = getPanelTypeDisplay(panel.panel_type);
        document.getElementById('detail-panel-voltage').textContent = getVoltageDisplay(panel.voltage);
        document.getElementById('detail-panel-ampacity').textContent = `${panel.ampacity} A`;
        document.getElementById('detail-panel-description').textContent = panel.description || 'لا يوجد وصف';
        
        // عرض معلومات مصدر التغذية
        const sourceInfoElement = document.getElementById('detail-panel-source');
        
        if (panel.power_source) {
            sourceInfoElement.innerHTML = `
                <div class="mb-2">
                    <span class="badge bg-primary">مصدر طاقة:</span>
                    <strong>${panel.power_source.name}</strong>
                </div>
            `;
        } else if (panel.parent_panel) {
            sourceInfoElement.innerHTML = `
                <div class="mb-2">
                    <span class="badge bg-success">لوحة أم:</span>
                    <a href="#" class="view-panel-link" data-id="${panel.parent_panel.id}">
                        ${panel.parent_panel.name}
                    </a>
                </div>
            `;
            
            // إضافة مستمع الأحداث للرابط
            document.querySelectorAll('.view-panel-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // إغلاق النافذة الحالية
                    const currentModal = bootstrap.Modal.getInstance(document.getElementById('panelDetailModal'));
                    currentModal.hide();
                    
                    // فتح تفاصيل اللوحة الأم
                    viewPanelDetails(this.dataset.id);
                });
            });
        } else {
            sourceInfoElement.innerHTML = '<div class="mb-2">لا يوجد مصدر تغذية محدد</div>';
        }
        
        // عرض معلومات القاطع الرئيسي
        const mainBreakerElement = document.getElementById('detail-panel-main-breaker');
        
        if (panel.main_breaker) {
            mainBreakerElement.innerHTML = `
                <div class="mb-2">
                    <span class="badge bg-danger">القاطع الرئيسي:</span>
                    <strong>${panel.main_breaker.name} (${panel.main_breaker.type} - ${panel.main_breaker.ampacity}A)</strong>
                </div>
            `;
        } else {
            mainBreakerElement.innerHTML = `
                <div class="mb-2 text-muted">
                    لم يتم تعيين قاطع رئيسي
                    <a href="#" class="btn btn-sm btn-primary ms-2 set-main-breaker" data-id="${panel.id}">
                        <i class="fas fa-plug"></i> تعيين قاطع رئيسي
                    </a>
                </div>
            `;
            
            // إضافة مستمع الأحداث لزر تعيين القاطع الرئيسي
            document.querySelector('.set-main-breaker').addEventListener('click', function(e) {
                e.preventDefault();
                
                // إغلاق نافذة التفاصيل
                const detailModal = bootstrap.Modal.getInstance(document.getElementById('panelDetailModal'));
                detailModal.hide();
                
                // فتح نافذة تعيين القاطع الرئيسي
                showSetMainBreakerModal(this.dataset.id);
            });
        }
        
        // عرض القواطع في اللوحة
        const breakersElement = document.getElementById('detail-panel-breakers');
        
        if (breakers.length > 0) {
            let breakersHTML = '<div class="list-group mt-2">';
            
            breakers.forEach(breaker => {
                const fedItems = [];
                
                // إضافة اللوحات الفرعية المتصلة بالقاطع
                if (breaker.fed_panels && breaker.fed_panels.length > 0) {
                    breaker.fed_panels.forEach(fedPanel => {
                        fedItems.push(`<span class="badge bg-success me-1">لوحة: ${fedPanel.name}</span>`);
                    });
                }
                
                // إضافة القواطع الأخرى المتصلة بالقاطع
                if (breaker.fed_breakers && breaker.fed_breakers.length > 0) {
                    breaker.fed_breakers.forEach(fedBreaker => {
                        fedItems.push(`<span class="badge bg-warning me-1">قاطع: ${fedBreaker.name}</span>`);
                    });
                }
                
                // إضافة الأحمال المتصلة بالقاطع
                if (breaker.loads && breaker.loads.length > 0) {
                    breaker.loads.forEach(load => {
                        fedItems.push(`<span class="badge bg-info me-1">حمل: ${load.name}</span>`);
                    });
                }
                
                const fedItemsHTML = fedItems.length > 0 
                    ? `<div class="mt-1">${fedItems.join(' ')}</div>` 
                    : '<div class="mt-1"><span class="text-muted small">لا توجد عناصر متصلة</span></div>';
                
                breakersHTML += `
                    <div class="list-group-item">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">${breaker.name}</h6>
                            <small>${breaker.ampacity}A</small>
                        </div>
                        <small>${breaker.type}</small>
                        ${fedItemsHTML}
                    </div>
                `;
            });
            
            breakersHTML += '</div>';
            breakersElement.innerHTML = breakersHTML;
        } else {
            breakersElement.innerHTML = `
                <div class="alert alert-secondary">
                    لا توجد قواطع مسجلة في هذه اللوحة
                    <a href="/breakers?panel=${panelId}" class="btn btn-sm btn-success ms-2">
                        <i class="fas fa-plus"></i> إضافة قاطع
                    </a>
                </div>
            `;
        }
        
        // عرض اللوحات الفرعية
        const childPanelsElement = document.getElementById('detail-panel-child-panels');
        
        if (childPanels.length > 0) {
            let childPanelsHTML = '<div class="list-group mt-2">';
            
            childPanels.forEach(childPanel => {
                childPanelsHTML += `
                    <a href="#" class="list-group-item list-group-item-action view-child-panel" data-id="${childPanel.id}">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">${childPanel.name}</h6>
                            <small>${childPanel.ampacity}A</small>
                        </div>
                        <div class="d-flex justify-content-between">
                            <small>${getPanelTypeDisplay(childPanel.panel_type)}</small>
                            <small>
                                <i class="fas fa-arrow-right"></i> 
                                ${childPanel.feeder_breaker ? childPanel.feeder_breaker.name : 'غير متصل بقاطع'}
                            </small>
                        </div>
                    </a>
                `;
            });
            
            childPanelsHTML += '</div>';
            childPanelsElement.innerHTML = childPanelsHTML;
            
            // إضافة مستمعي الأحداث لروابط اللوحات الفرعية
            document.querySelectorAll('.view-child-panel').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // إغلاق النافذة الحالية
                    const currentModal = bootstrap.Modal.getInstance(document.getElementById('panelDetailModal'));
                    currentModal.hide();
                    
                    // فتح تفاصيل اللوحة الفرعية
                    viewPanelDetails(this.dataset.id);
                });
            });
        } else {
            childPanelsElement.innerHTML = `
                <div class="alert alert-secondary">
                    لا توجد لوحات فرعية متصلة بهذه اللوحة
                    <button class="btn btn-sm btn-success ms-2 add-subpanel-btn" data-id="${panel.id}">
                        <i class="fas fa-plus"></i> إضافة لوحة فرعية
                    </button>
                </div>
            `;
            
            // إضافة مستمع الأحداث لزر إضافة لوحة فرعية
            document.querySelector('.add-subpanel-btn').addEventListener('click', function(e) {
                e.preventDefault();
                
                // إغلاق نافذة التفاصيل
                const detailModal = bootstrap.Modal.getInstance(document.getElementById('panelDetailModal'));
                detailModal.hide();
                
                // فتح نافذة إضافة لوحة فرعية
                showAddChildPanelModal(this.dataset.id);
            });
        }
        
        // عرض المسار الكامل للوحة
        if (panel.full_path) {
            document.getElementById('detail-panel-path').textContent = panel.full_path;
            document.getElementById('panel-path-container').classList.remove('d-none');
        } else {
            document.getElementById('panel-path-container').classList.add('d-none');
        }
        
        // عرض النافذة
        const modal = new bootstrap.Modal(document.getElementById('panelDetailModal'));
        modal.show();
    } catch (error) {
        console.error('خطأ في عرض تفاصيل اللوحة:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل تفاصيل اللوحة', 'danger');
    }
}

/**
 * استدعاء API لتحميل قواطع اللوحة
 * @param {number} panelId - معرف اللوحة
 * @returns {Promise} وعد بنتيجة استدعاء API
 */
async function getBreakersByPanel(panelId) {
    try {
        return await CircuitBreakerAPI.getByPanel(panelId);
    } catch (error) {
        console.error('خطأ في تحميل قواطع اللوحة:', error);
        return { success: false, error: { message: 'حدث خطأ غير متوقع أثناء تحميل قواطع اللوحة' } };
    }
}

/**
 * بناء قائمة منسدلة للقواطع المتاحة
 * @param {Array} breakers - قائمة القواطع
 * @param {string} selectId - معرف عنصر القائمة المنسدلة
 * @param {number} selectedBreakerId - معرف القاطع المحدد (اختياري)
 */
function buildBreakersDropdown(breakers, selectId, selectedBreakerId = null) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">-- اختر قاطع --</option>';
    
    if (breakers.length === 0) {
        select.innerHTML += '<option value="" disabled>لا توجد قواطع متاحة</option>';
        return;
    }
    
    breakers.forEach(breaker => {
        const option = document.createElement('option');
        option.value = breaker.id;
        option.textContent = `${breaker.name} (${breaker.type} - ${breaker.ampacity}A)`;
        
        if (selectedBreakerId && breaker.id == selectedBreakerId) {
            option.selected = true;
        }
        
        select.appendChild(option);
    });
}

// تصدير الوظائف اللازمة للاستخدام الخارجي
export {
    viewPanelDetails,
    saveMainBreaker,
    deletePanel
};