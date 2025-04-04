/**
 * breakers.js
 * ملف JavaScript الخاص بصفحة القواطع الكهربائية
 */

// استيراد الوظائف من ملف API
import { CircuitBreakerAPI, PanelAPI, PowerSourceAPI } from '../api_endpoints.js';

// تهيئة المتغيرات
let selectedPanelId = null;
let selectedPanelData = null;
let selectedSourceId = null;
let selectedSourceData = null;

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
    const sourceId = urlParams.get('source');
    
    if (panelId) {
        selectedPanelId = panelId;
        // تحميل بيانات اللوحة المحددة
        loadPanelDetails(panelId);
    } else if (sourceId) {
        selectedSourceId = sourceId;
        // تحميل بيانات مصدر الطاقة المحدد
        loadPowerSourceDetails(sourceId);
    } else {
        // إذا لم يكن هناك لوحة أو مصدر طاقة محدد، قم بتحميل جميع القواطع
        loadBreakers();
        
        // تحميل القوائم المنسدلة
        loadPowerSourcesDropdown();
        loadPanelsDropdown();
    }
}

/**
 * إعداد مستمعي الأحداث للعناصر التفاعلية
 */
function setupEventListeners() {
    // فلترة القواطع حسب مصدر الطاقة
    const filterSource = document.getElementById('breaker-filter-source');
    if (filterSource) {
        filterSource.addEventListener('change', function() {
            selectedSourceId = this.value;
            selectedPanelId = null; // إلغاء تحديد اللوحة عند تغيير مصدر الطاقة
            
            // إعادة تعيين قائمة اللوحات
            const panelFilter = document.getElementById('breaker-filter-panel');
            if (panelFilter) {
                panelFilter.value = '';
            }
            
            if (selectedSourceId) {
                // تحميل بيانات مصدر الطاقة المحدد
                loadPowerSourceDetails(selectedSourceId);
            } else {
                // إذا تم اختيار "كل مصادر الطاقة"، إخفاء معلومات مصدر الطاقة
                const sourceInfoDiv = document.getElementById('selected-source-info');
                if (sourceInfoDiv) {
                    sourceInfoDiv.style.display = 'none';
                }
                
                // تحميل جميع القواطع
                loadBreakers();
            }
        });
    }
    
    // فلترة القواطع حسب اللوحة
    const filterPanel = document.getElementById('breaker-filter-panel');
    if (filterPanel) {
        filterPanel.addEventListener('change', function() {
            selectedPanelId = this.value;
            selectedSourceId = null; // إلغاء تحديد مصدر الطاقة عند تغيير اللوحة
            
            // إعادة تعيين قائمة مصادر الطاقة
            const sourceFilter = document.getElementById('breaker-filter-source');
            if (sourceFilter) {
                sourceFilter.value = '';
            }
            
            // إخفاء معلومات مصدر الطاقة إن وجدت
            const sourceInfoDiv = document.getElementById('selected-source-info');
            if (sourceInfoDiv) {
                sourceInfoDiv.style.display = 'none';
            }
            
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
    // تهيئة عنوان المودال حسب سياق العرض
    const modalTitle = document.getElementById('addBreakerModalLabel');
    
    if (modalTitle) {
        if (selectedPanelData) {
            modalTitle.textContent = `إضافة قاطع للوحة ${selectedPanelData.name}`;
        } else if (selectedSourceData) {
            modalTitle.textContent = `إضافة قاطع لمصدر الطاقة ${selectedSourceData.name}`;
        } else {
            modalTitle.textContent = 'إضافة قاطع جديد';
        }
    }
    
    // تعيين معرّف اللوحة أو مصدر الطاقة المحدد
    if (selectedPanelId) {
        document.getElementById('breaker-panel-id').value = selectedPanelId;
    }
    
    if (selectedSourceId) {
        document.getElementById('breaker-source-id').value = selectedSourceId;
    }
    
    // تحميل القوائم المنسدلة للمودال
    updateModalDropdowns();
    
    // تعيين نوع الاتصال الافتراضي بناءً على السياق
    const connectionTypeSelect = document.getElementById('breaker-connection-type');
    if (connectionTypeSelect) {
        if (selectedSourceId) {
            connectionTypeSelect.value = 'source';
        } else if (selectedPanelId) {
            connectionTypeSelect.value = 'panel';
        }
        
        // تطبيق التغيير لعرض الحقول المناسبة
        connectionTypeSelect.dispatchEvent(new Event('change'));
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
    const connectionType = document.getElementById('breaker-connection-type').value;
    const name = document.getElementById('breaker-name').value;
    const role = document.getElementById('breaker-role').value;
    const type = document.getElementById('breaker-type').value;
    const poles = document.getElementById('breaker-poles').value;
    const ratedCurrent = document.getElementById('breaker-rated-current').value;
    const tripCurve = document.getElementById('breaker-trip-curve').value;
    
    // التحقق من صحة البيانات الرئيسية
    if (!name || !ratedCurrent) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    // تحضير البيانات المشتركة للإرسال
    const breakerData = {
        name: name,
        breaker_role: role,
        breaker_type: type,
        number_of_poles: parseInt(poles),
        rated_current: parseFloat(ratedCurrent),
        trip_curve: tripCurve || 'C'
    };
    
    try {
        let result;
        
        // التحقق من نوع الاتصال (لوحة أو مصدر طاقة)
        if (connectionType === 'panel') {
            // جمع بيانات اللوحة
            const panelId = document.getElementById('breaker-panel-selector').value || document.getElementById('breaker-panel-id').value || selectedPanelId;
            
            if (!panelId) {
                showAlert('يرجى تحديد اللوحة المرتبطة بالقاطع', 'warning');
                return;
            }
            
            // إضافة معرف اللوحة إلى بيانات القاطع
            breakerData.panel = panelId;
            
            // إرسال البيانات للخادم لإضافة قاطع للوحة
            result = await PanelAPI.addBreaker(panelId, breakerData);
            
            if (result.success) {
                showAlert('تم إضافة القاطع للوحة بنجاح', 'success');
                
                // إعادة تحميل بيانات اللوحة المحددة
                if (selectedPanelId) {
                    await loadBreakers(panelId);
                } else {
                    await loadBreakers();
                }
            }
        } else if (connectionType === 'source') {
            // جمع بيانات مصدر الطاقة
            const sourceId = document.getElementById('breaker-source-selector').value || document.getElementById('breaker-source-id').value || selectedSourceId;
            
            if (!sourceId) {
                showAlert('يرجى تحديد مصدر الطاقة المرتبط بالقاطع', 'warning');
                return;
            }
            
            // بدلاً من استخدام PowerSourceAPI.addBreaker الذي لا يعمل
            // سنستخدم CircuitBreakerAPI.add مع تحديد معرف مصدر الطاقة في البيانات
            
            // إضافة معرف مصدر الطاقة إلى بيانات القاطع
            breakerData.power_source = sourceId;
            
            // استخدام نقطة نهاية API العامة لإضافة القاطع
            result = await CircuitBreakerAPI.add(breakerData);
            
            if (result.success) {
                showAlert('تم إضافة القاطع لمصدر الطاقة بنجاح', 'success');
                
                // إعادة تحميل البيانات
                if (selectedSourceId) {
                    await loadPowerSourceDetails(sourceId);
                } else {
                    await loadBreakers();
                }
            }
        } else {
            showAlert('يرجى تحديد نوع الاتصال (لوحة أو مصدر طاقة)', 'warning');
            return;
        }
        
        // إذا نجحت العملية، أغلق المودال ونظف البيانات
        if (result && result.success) {
            // إغلاق المودال
            const modal = bootstrap.Modal.getInstance(document.getElementById('addBreakerModal'));
            if (modal) {
                modal.hide();
            }
            
            // مسح البيانات من النموذج
            document.getElementById('add-breaker-form').reset();
        } else if (result && !result.success) {
            // إظهار رسالة الخطأ من الخادم
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
    const dropdown = document.getElementById('breaker-filter-source');
    if (!dropdown) return;
    
    // الحفاظ على خيار "الكل" في المقدمة
    let options = '<option value="">كل مصادر الطاقة</option>';
    
    powerSources.forEach(source => {
        const selected = selectedSourceId && selectedSourceId == source.id ? 'selected' : '';
        options += `<option value="${source.id}" ${selected}>${source.name}</option>`;
    });
    
    dropdown.innerHTML = options;
    
    // تحديث القائمة المنسدلة إذا تم تحديد مصدر طاقة من خلال الـ URL
    if (selectedSourceId) {
        dropdown.value = selectedSourceId;
    }
    
    // إضافة مستمع الحدث للتصفية حسب مصدر الطاقة
    dropdown.addEventListener('change', function() {
        selectedSourceId = this.value;
        
        if (selectedSourceId) {
            // تحميل بيانات مصدر الطاقة المحدد
            loadPowerSourceDetails(selectedSourceId);
            
            // إلغاء تحديد اللوحة
            const panelDropdown = document.getElementById('breaker-filter-panel');
            if (panelDropdown) {
                panelDropdown.value = '';
                selectedPanelId = null;
                selectedPanelData = null;
            }
        } else {
            // إذا تم اختيار "كل مصادر الطاقة"، إخفاء معلومات مصدر الطاقة المحدد
            const sourceInfoDiv = document.getElementById('selected-source-info');
            if (sourceInfoDiv) {
                sourceInfoDiv.style.display = 'none';
            }
            
            // تحميل جميع القواطع
            loadBreakers();
        }
    });
    
    // تحديث القوائم المنسدلة في مودال إضافة القاطع
    updateModalSourceDropdown(powerSources);
}

/**
 * تحميل تفاصيل مصدر الطاقة المحدد
 * @param {number} sourceId - معرف مصدر الطاقة
 */
async function loadPowerSourceDetails(sourceId) {
    try {
        const result = await PowerSourceAPI.getById(sourceId);
        
        if (result.success) {
            selectedSourceData = result.data;
            
            // عرض معلومات مصدر الطاقة المحدد
            updateSelectedSourceInfo(selectedSourceData);
            
            // تحميل قواطع مصدر الطاقة المحدد
            loadPowerSourceBreakers(sourceId);
        } else {
            showAlert(`فشل تحميل بيانات مصدر الطاقة: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل بيانات مصدر الطاقة:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل بيانات مصدر الطاقة', 'danger');
    }
}

/**
 * تحديث معلومات مصدر الطاقة المحدد
 * @param {Object} sourceData - بيانات مصدر الطاقة
 */
function updateSelectedSourceInfo(sourceData) {
    // إضافة قسم معلومات مصدر الطاقة إذا لم يكن موجودًا
    let sourceInfoDiv = document.getElementById('selected-source-info');
    if (!sourceInfoDiv) {
        // إنشاء عنصر جديد وإضافته قبل القسم الرئيسي
        const container = document.querySelector('.container section');
        if (container) {
            sourceInfoDiv = document.createElement('div');
            sourceInfoDiv.id = 'selected-source-info';
            sourceInfoDiv.className = 'alert alert-primary mb-4';
            sourceInfoDiv.innerHTML = `
                <h5><i class="fas fa-plug"></i> مصدر الطاقة: <span id="selected-source-name"></span></h5>
                <div class="row mb-2">
                    <div class="col-md-3"><strong>النوع:</strong> <span id="selected-source-type"></span></div>
                    <div class="col-md-3"><strong>الجهد:</strong> <span id="selected-source-voltage"></span></div>
                    <div class="col-md-3"><strong>الأمبير الكلي:</strong> <span id="selected-source-ampacity"></span></div>
                    <div class="col-md-3"><strong>القاطع الرئيسي:</strong> <span id="selected-source-main-breaker"></span></div>
                </div>
            `;
            container.parentNode.insertBefore(sourceInfoDiv, container);
        }
    }
    
    // تحديث محتوى العناصر
    const sourceName = document.getElementById('selected-source-name');
    const sourceType = document.getElementById('selected-source-type');
    const sourceVoltage = document.getElementById('selected-source-voltage');
    const sourceAmpacity = document.getElementById('selected-source-ampacity');
    const sourceMainBreaker = document.getElementById('selected-source-main-breaker');
    
    if (sourceName) sourceName.textContent = sourceData.name || `مصدر طاقة #${sourceData.id}`;
    
    // عرض نوع مصدر الطاقة بشكل مناسب
    const sourceTypes = {
        'Local Grid': 'الشبكة المحلية',
        'Generator': 'مولد'
    };
    if (sourceType) sourceType.textContent = sourceTypes[sourceData.source_type] || sourceData.source_type;
    
    // عرض الجهد بشكل مناسب
    const voltageTypes = {
        '220': '220 فولت',
        '380': '380 فولت',
        '11KV': '11 كيلو فولت',
        '24': '24 فولت'
    };
    if (sourceVoltage) sourceVoltage.textContent = voltageTypes[sourceData.voltage] || sourceData.voltage;
    
    if (sourceAmpacity) sourceAmpacity.textContent = `${sourceData.total_ampacity} أمبير`;
    
    // عرض معلومات القاطع الرئيسي
    if (sourceMainBreaker) {
        if (sourceData.main_breaker_details) {
            sourceMainBreaker.innerHTML = `<span class="badge bg-success">${sourceData.main_breaker_details.name || 'قاطع رئيسي #' + sourceData.main_breaker}</span>`;
        } else {
            sourceMainBreaker.innerHTML = '<span class="badge bg-warning">غير محدد</span>';
        }
    }
    
    // عرض الكتلة
    sourceInfoDiv.style.display = 'block';
    
    // تحديث عنوان الصفحة
    document.title = `قواطع مصدر الطاقة ${sourceData.name} - نظام إدارة شبكة الطاقة الكهربائية`;
    
    // تغيير نص زر الإضافة
    const addBreakerBtn = document.getElementById('add-breaker-btn');
    if (addBreakerBtn) {
        addBreakerBtn.textContent = `إضافة قاطع لمصدر الطاقة ${sourceData.name}`;
        addBreakerBtn.disabled = false;
    }
}

/**
 * تحميل قواطع مصدر الطاقة
 * @param {number} sourceId - معرف مصدر الطاقة
 */
async function loadPowerSourceBreakers(sourceId) {
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
        
        // استدعاء API لجلب القواطع المرتبطة بمصدر الطاقة
        const result = await PowerSourceAPI.getBreakers(sourceId);
        
        if (result.success) {
            updateBreakersTable(result.data);
        } else {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">حدث خطأ أثناء تحميل البيانات</td></tr>';
            showAlert(`فشل تحميل قواطع مصدر الطاقة: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل قواطع مصدر الطاقة:', error);
        const tableBody = document.getElementById('breakers-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">حدث خطأ غير متوقع</td></tr>';
        }
        showAlert('حدث خطأ غير متوقع أثناء تحميل قواطع مصدر الطاقة', 'danger');
    }
}

/**
 * تحديث قوائم مصادر الطاقة واللوحات المنسدلة في مودال إضافة القاطع
 * @param {Array} powerSources - مصفوفة مصادر الطاقة (اختياري)
 * @param {Array} panels - مصفوفة اللوحات (اختياري)
 */
function updateModalDropdowns(powerSources = null, panels = null) {
    // تحديث قائمة مصادر الطاقة في المودال
    if (powerSources) {
        updateModalSourceDropdown(powerSources);
    } else {
        // إذا لم يتم تمرير مصادر طاقة، قم بتحميلها
        loadModalPowerSources();
    }
    
    // تحديث قائمة اللوحات في المودال
    if (panels) {
        updateModalPanelDropdown(panels);
    } else {
        // إذا لم يتم تمرير لوحات، قم بتحميلها
        loadModalPanels();
    }
    
    // إعداد حدث تغيير نوع الاتصال
    setupConnectionTypeChangeEvent();
}

/**
 * تحميل مصادر الطاقة لقائمة المودال
 */
async function loadModalPowerSources() {
    try {
        const result = await PowerSourceAPI.getAll();
        
        if (result.success) {
            updateModalSourceDropdown(result.data);
        } else {
            showAlert(`فشل تحميل مصادر الطاقة: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل مصادر الطاقة للمودال:', error);
    }
}

/**
 * تحميل اللوحات لقائمة المودال
 */
async function loadModalPanels() {
    try {
        const result = await PanelAPI.getAll();
        
        if (result.success) {
            updateModalPanelDropdown(result.data);
        } else {
            showAlert(`فشل تحميل اللوحات: ${result.error.message}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في تحميل اللوحات للمودال:', error);
    }
}

/**
 * تحديث قائمة مصادر الطاقة المنسدلة في المودال
 * @param {Array} powerSources - مصفوفة مصادر الطاقة
 */
function updateModalSourceDropdown(powerSources) {
    const dropdown = document.getElementById('breaker-source-selector');
    if (!dropdown) return;
    
    // الحفاظ على خيار الافتراضي في المقدمة
    let options = '<option value="">-- اختر مصدر طاقة --</option>';
    
    powerSources.forEach(source => {
        const selected = selectedSourceId && selectedSourceId == source.id ? 'selected' : '';
        options += `<option value="${source.id}" ${selected}>${source.name}</option>`;
    });
    
    dropdown.innerHTML = options;
    
    // تحديث المحتوى المحدد إذا كان هناك مصدر طاقة محدد
    if (selectedSourceId) {
        dropdown.value = selectedSourceId;
        document.getElementById('breaker-source-id').value = selectedSourceId;
    }
}

/**
 * تحديث قائمة اللوحات المنسدلة في المودال
 * @param {Array} panels - مصفوفة اللوحات
 */
function updateModalPanelDropdown(panels) {
    const dropdown = document.getElementById('breaker-panel-selector');
    if (!dropdown) return;
    
    // الحفاظ على خيار الافتراضي في المقدمة
    let options = '<option value="">-- اختر لوحة --</option>';
    
    panels.forEach(panel => {
        // إضافة معلومات مصدر الطاقة إلى اسم اللوحة لتسهيل التمييز
        const powerSourceName = panel.power_source ? ` (${panel.power_source.name})` : '';
        const panelText = `${panel.name || `لوحة #${panel.id}`}${powerSourceName}`;
        
        const selected = selectedPanelId && selectedPanelId == panel.id ? 'selected' : '';
        options += `<option value="${panel.id}" ${selected}>${panelText}</option>`;
    });
    
    dropdown.innerHTML = options;
    
    // تحديث المحتوى المحدد إذا كان هناك لوحة محددة
    if (selectedPanelId) {
        dropdown.value = selectedPanelId;
        document.getElementById('breaker-panel-id').value = selectedPanelId;
    }
}

/**
 * إعداد حدث تغيير نوع الاتصال في المودال
 */
function setupConnectionTypeChangeEvent() {
    const connectionTypeSelect = document.getElementById('breaker-connection-type');
    const panelSection = document.getElementById('panel-connection-section');
    const sourceSection = document.getElementById('source-connection-section');
    const breakerRoleSelect = document.getElementById('breaker-role');
    
    // التأكد من وجود العناصر
    if (!connectionTypeSelect || !panelSection || !sourceSection || !breakerRoleSelect) {
        console.error('لم يتم العثور على أحد العناصر المطلوبة للنموذج');
        return;
    }
    
    // إضافة مستمع الحدث
    connectionTypeSelect.addEventListener('change', function() {
        const connectionType = this.value;
        console.log('تم تغيير نوع الاتصال إلى:', connectionType);
        
        if (connectionType === 'panel') {
            // عرض قسم اللوحات وإخفاء قسم مصادر الطاقة
            panelSection.style.display = 'block';
            sourceSection.style.display = 'none';
            
            // تحديث خيارات دور القاطع للوحات
            breakerRoleSelect.innerHTML = `
                <option value="main">قاطع رئيسي</option>
                <option value="sub_main">قاطع رئيسي فرعي</option>
                <option value="distribution">قاطع توزيع</option>
            `;
        } else if (connectionType === 'source') {
            // إخفاء قسم اللوحات وعرض قسم مصادر الطاقة
            panelSection.style.display = 'none';
            sourceSection.style.display = 'block';
            
            // تحديث خيارات دور القاطع لمصادر الطاقة
            breakerRoleSelect.innerHTML = `
                <option value="main">قاطع رئيسي</option>
            `;
            breakerRoleSelect.value = 'main';
        }
    });
    
    // تنفيذ الحدث مرة واحدة لتهيئة الحالة الأولية
    if (selectedSourceId) {
        connectionTypeSelect.value = 'source';
    } else if (selectedPanelId) {
        connectionTypeSelect.value = 'panel';
    }
    
    // استخدام dispatchEvent لتطبيق التغييرات الأولية
    connectionTypeSelect.dispatchEvent(new Event('change'));
}