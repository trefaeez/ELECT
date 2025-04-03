/**
 * panel-forms.js
 * ملف JavaScript المسؤول عن إدارة نماذج إضافة وتعديل وحذف اللوحات الكهربائية
 */

import { PanelAPI, PowerSourceAPI } from '../api_endpoints.js';
import { showAlert, loadPanels, loadMainPanelsDropdown, getPanelTypeDisplay } from './panel-core.js';

/**
 * إعداد مستمعي الأحداث للنماذج
 */
function setupFormEventListeners() {
    // زر إضافة لوحة جديدة
    const addPanelBtn = document.getElementById('add-panel-btn');
    if (addPanelBtn) {
        addPanelBtn.addEventListener('click', () => showAddPanelModal(false));
    }
    
    // زر حفظ اللوحة
    const savePanelBtn = document.getElementById('save-panel-btn');
    if (savePanelBtn) {
        savePanelBtn.addEventListener('click', savePanel);
    }
    
    // زر تأكيد الحذف
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDelete);
    }
    
    // تغيير نوع اللوحة (رئيسية، رئيسية فرعية، فرعية)
    const panelTypeSelect = document.getElementById('panel-type');
    if (panelTypeSelect) {
        panelTypeSelect.addEventListener('change', togglePanelSourceFields);
    }
    
    // تغيير اللوحة الأم
    const parentPanelSelect = document.getElementById('panel-parent');
    if (parentPanelSelect) {
        parentPanelSelect.addEventListener('change', loadParentPanelBreakers);
    }
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
            document.getElementById('panel-id').value = panel.id;
            document.getElementById('panel-name').value = panel.name;
            document.getElementById('panel-voltage').value = panel.voltage;
            document.getElementById('panel-ampacity').value = panel.ampacity;
            document.getElementById('panel-description').value = panel.description || '';
            
            // تعيين نوع اللوحة وإظهار/إخفاء الحقول المناسبة
            document.getElementById('panel-type').value = panel.panel_type;
            
            // تعيين مصدر الطاقة أو اللوحة الأم
            if (panel.power_source) {
                const powerSourceRadio = document.getElementById('power-source-radio');
                if (powerSourceRadio) powerSourceRadio.checked = true;
                
                const powerSourceSelect = document.getElementById('panel-power-source');
                if (powerSourceSelect) powerSourceSelect.value = panel.power_source.id;
                
                // تحديث حالة نموذج مصدر التغذية
                updateSourceForm();
            } else if (panel.parent_panel) {
                const parentPanelRadio = document.getElementById('parent-panel-radio');
                if (parentPanelRadio) parentPanelRadio.checked = true;
                
                // تحميل اللوحات الأم وتعيين اللوحة الأم المحددة
                await loadMainPanelsDropdown('panel-parent');
                const parentPanelSelect = document.getElementById('panel-parent');
                if (parentPanelSelect) parentPanelSelect.value = panel.parent_panel.id;
                
                // تحميل قواطع اللوحة الأم وتحديد القاطع المغذي
                await loadParentPanelBreakers();
                
                if (panel.feeder_breaker) {
                    const feederBreakerSelect = document.getElementById('panel-feeder-breaker');
                    if (feederBreakerSelect) feederBreakerSelect.value = panel.feeder_breaker.id;
                }
                
                // تحديث حالة نموذج مصدر التغذية
                updateSourceForm();
            }
            
            // تنفيذ togglePanelSourceFields لإظهار/إخفاء الحقول المناسبة
            togglePanelSourceFields();
        } else {
            showAlert(`فشل تحميل بيانات اللوحة: ${result.error.message}`, 'danger');
            return;
        }
    } else {
        modalTitle.textContent = 'إضافة لوحة جديدة';
        saveButton.textContent = 'إضافة';
        
        // Verificar que el elemento existe antes de modificar su valor
        const panelIdInput = document.getElementById('panel-id');
        if (panelIdInput) {
            panelIdInput.value = '';
        }
        
        // تحميل مصادر الطاقة المتاحة
        await loadPowerSourcesDropdown();
        
        // تحميل قائمة اللوحات الأم
        await loadMainPanelsDropdown('panel-parent');
        
        // تعيين معرف مصدر الطاقة من عنصر الفلترة
        const powerSourceSelect = document.getElementById('panel-filter-source');
        const powerSourceInput = document.getElementById('panel-power-source');
        
        if (powerSourceSelect && powerSourceInput && powerSourceSelect.value) {
            powerSourceInput.value = powerSourceSelect.value;
        }
        
        // تنفيذ togglePanelSourceFields لإظهار/إخفاء الحقول المناسبة
        togglePanelSourceFields();
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
    const modalTitle = document.getElementById('addPanelModalLabel');
    const saveButton = document.getElementById('save-panel-btn');
    const form = document.getElementById('add-panel-form');
    
    if (!form || !modalTitle || !saveButton) {
        console.log('عناصر نموذج إضافة لوحة فرعية غير موجودة');
        return;
    }
    
    // إعادة ضبط النموذج
    form.reset();
    
    // إخفاء نموذج مصدر الطاقة وإظهار نموذج اللوحة الأم
    const powerSourceForm = document.getElementById('power-source-section');
    const parentPanelForm = document.getElementById('parent-panel-section');
    const parentPanelRadio = document.getElementById('parent-panel-radio');
    
    if (powerSourceForm) powerSourceForm.style.display = 'none';
    if (parentPanelForm) parentPanelForm.style.display = 'block';
    if (parentPanelRadio) parentPanelRadio.checked = true;
    
    // تحميل بيانات اللوحات الرئيسية
    await loadMainPanelsDropdown('panel-parent');
    
    // تعيين اللوحة الأم في القائمة المنسدلة
    const parentPanelSelect = document.getElementById('panel-parent');
    if (parentPanelSelect) parentPanelSelect.value = parentPanelId;
    
    // تحميل بيانات اللوحة الأم لتحديد نوع اللوحة الفرعية
    const result = await PanelAPI.getById(parentPanelId);
    
    if (result.success) {
        const parentPanel = result.data;
        
        modalTitle.textContent = `إضافة لوحة فرعية لـ ${parentPanel.name}`;
        saveButton.textContent = 'إضافة';
        
        // Verificar que el elemento existe antes de modificar su valor
        const panelIdInput = document.getElementById('panel-id');
        if (panelIdInput) {
            panelIdInput.value = '';
        }
        
        // تعيين نوع اللوحة بناءً على نوع اللوحة الأم
        const panelTypeSelect = document.getElementById('panel-type');
        if (panelTypeSelect) {
            if (parentPanel.panel_type === 'main') {
                panelTypeSelect.value = 'sub_main';
            } else {
                panelTypeSelect.value = 'sub';
            }
        }
        
        // نسخ قيمة الجهد من اللوحة الأم
        const panelVoltageSelect = document.getElementById('panel-voltage');
        if (panelVoltageSelect) {
            panelVoltageSelect.value = parentPanel.voltage;
        }
        
        // تحميل قواطع اللوحة الأم
        await loadParentPanelBreakers();
        
        // تفعيل التحقق من الحقول
        validatePanelForm();
    } else {
        showAlert(`فشل تحميل بيانات اللوحة الأم: ${result.error.message}`, 'danger');
        return;
    }
    
    // عرض النافذة
    const modal = new bootstrap.Modal(document.getElementById('addPanelModal'));
    modal.show();
}

/**
 * تحميل القواطع الموجودة في اللوحة الأم
 */
async function loadParentPanelBreakers() {
    const parentPanelSelect = document.getElementById('panel-parent');
    const feederBreakerSelect = document.getElementById('panel-feeder-breaker');
    const feederSection = document.getElementById('feeder-breaker-section');
    
    if (!parentPanelSelect || !feederBreakerSelect) return;
    
    const parentPanelId = parentPanelSelect.value;
    
    if (!parentPanelId) {
        feederBreakerSelect.innerHTML = '<option value="">-- اختر القاطع المغذي --</option>';
        feederBreakerSelect.disabled = true;
        if (feederSection) feederSection.style.display = 'none';
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
        
        // إظهار قسم القاطع المغذي
        if (feederSection) feederSection.style.display = 'block';
    } catch (error) {
        console.error('خطأ في تحميل قواطع اللوحة الأم:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل قواطع اللوحة الأم', 'danger');
    }
}

/**
 * تحميل قائمة مصادر الطاقة المتاحة
 */
async function loadPowerSourcesDropdown() {
    try {
        // تحميل مصادر الطاقة
        const result = await PowerSourceAPI.getAll();
        
        if (!result.success) {
            showAlert(`فشل تحميل مصادر الطاقة: ${result.error.message}`, 'danger');
            return;
        }
        
        const powerSources = result.data;
        
        // تحضير القائمة المنسدلة
        const dropdown = document.getElementById('panel-power-source');
        if (!dropdown) return;
        
        dropdown.innerHTML = '<option value="">-- اختر مصدر الطاقة --</option>';
        
        if (powerSources.length === 0) {
            dropdown.innerHTML += '<option value="" disabled>لا توجد مصادر طاقة مسجلة</option>';
            showAlert('لا توجد مصادر طاقة مسجلة. يرجى إضافة مصدر طاقة أولاً.', 'warning');
        } else {
            powerSources.forEach(source => {
                const option = document.createElement('option');
                option.value = source.id;
                option.textContent = `${source.name} (${source.type})`;
                dropdown.appendChild(option);
            });
        }
        
        // إذا كان هناك اختيار من فلتر مصادر الطاقة، اختر نفس المصدر تلقائياً
        const filterSource = document.getElementById('panel-filter-source');
        if (filterSource && filterSource.value && dropdown.querySelector(`option[value="${filterSource.value}"]`)) {
            dropdown.value = filterSource.value;
        }
    } catch (error) {
        console.error('خطأ في تحميل مصادر الطاقة:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل مصادر الطاقة', 'danger');
    }
}

/**
 * إظهار/إخفاء الحقول المتعلقة بمصدر التغذية بناءً على نوع اللوحة
 */
function togglePanelSourceFields() {
    const panelType = document.getElementById('panel-type');
    if (!panelType) return;
    
    const typeValue = panelType.value;
    const sourceForms = document.querySelectorAll('.source-form');
    const powerSourceRadio = document.getElementById('power-source-radio');
    const parentPanelRadio = document.getElementById('parent-panel-radio');
    const powerSourceForm = document.getElementById('power-source-section');
    const parentPanelForm = document.getElementById('parent-panel-section');
    
    // عرض أو إخفاء خيارات مصدر التغذية حسب نوع اللوحة
    if (typeValue === 'main') {
        // لوحة رئيسية يمكن أن تتصل بمصدر طاقة فقط
        if (powerSourceRadio) powerSourceRadio.checked = true;
        if (parentPanelRadio) parentPanelRadio.disabled = true;
        
        if (powerSourceForm) powerSourceForm.style.display = 'block';
        if (parentPanelForm) parentPanelForm.style.display = 'none';
    } else {
        // لوحة فرعية أو رئيسية فرعية يمكن أن تتصل بلوحة أخرى
        if (parentPanelRadio) parentPanelRadio.disabled = false;
    }
    
    // إظهار نموذج مصدر التغذية المحدد
    const radios = document.querySelectorAll('input[name="power-source-type"]');
    if (radios.length > 0) {
        radios.forEach(radio => {
            radio.addEventListener('change', updateSourceForm);
        });
        
        updateSourceForm();
    }
}

/**
 * تحديث نموذج مصدر التغذية بناءً على الاختيار
 */
function updateSourceForm() {
    const selectedRadio = document.querySelector('input[name="power-source-type"]:checked');
    if (!selectedRadio) return; // لا يوجد زر راديو محدد
    
    const selectedSourceType = selectedRadio.value;
    const powerSourceForm = document.getElementById('power-source-section');
    const parentPanelForm = document.getElementById('parent-panel-section');
    
    if (selectedSourceType === 'power-source') {
        if (powerSourceForm) powerSourceForm.style.display = 'block';
        if (parentPanelForm) parentPanelForm.style.display = 'none';
    } else {
        if (powerSourceForm) powerSourceForm.style.display = 'none';
        if (parentPanelForm) parentPanelForm.style.display = 'block';
    }
}

/**
 * التحقق من صحة نموذج اللوحة
 */
function validatePanelForm() {
    const panelNameInput = document.getElementById('panel-name');
    const panelAmpacityInput = document.getElementById('panel-ampacity');
    const powerSourceTypeRadio = document.querySelector('input[name="power-source-type"]:checked');
    
    if (!panelNameInput || !panelAmpacityInput || !powerSourceTypeRadio) return false;
    
    const panelName = panelNameInput.value.trim();
    const panelAmpacity = panelAmpacityInput.value.trim();
    const powerSourceType = powerSourceTypeRadio.value;
    
    let isValid = true;
    
    // التحقق من اسم اللوحة
    if (panelName === '') {
        panelNameInput.classList.add('is-invalid');
        isValid = false;
    } else {
        panelNameInput.classList.remove('is-invalid');
    }
    
    // التحقق من سعة اللوحة
    if (panelAmpacity === '' || isNaN(panelAmpacity) || parseInt(panelAmpacity) <= 0) {
        panelAmpacityInput.classList.add('is-invalid');
        isValid = false;
    } else {
        panelAmpacityInput.classList.remove('is-invalid');
    }
    
    // التحقق من مصدر التغذية
    if (powerSourceType === 'power-source') {
        const powerSourceSelect = document.getElementById('panel-power-source');
        if (powerSourceSelect && powerSourceSelect.value === '') {
            powerSourceSelect.classList.add('is-invalid');
            isValid = false;
        } else if (powerSourceSelect) {
            powerSourceSelect.classList.remove('is-invalid');
        }
    } else {
        const parentPanelSelect = document.getElementById('panel-parent');
        if (parentPanelSelect && parentPanelSelect.value === '') {
            parentPanelSelect.classList.add('is-invalid');
            isValid = false;
        } else if (parentPanelSelect) {
            parentPanelSelect.classList.remove('is-invalid');
        }
    }
    
    // تفعيل/تعطيل زر الحفظ بناءً على صحة النموذج
    const saveButton = document.getElementById('save-panel-btn');
    if (saveButton) {
        saveButton.disabled = !isValid;
    }
    
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
    
    const panelIdInput = document.getElementById('panel-id');
    const panelNameInput = document.getElementById('panel-name');
    const panelTypeSelect = document.getElementById('panel-type');
    const panelVoltageSelect = document.getElementById('panel-voltage');
    const panelAmpacityInput = document.getElementById('panel-ampacity');
    const panelDescriptionInput = document.getElementById('panel-description');
    const powerSourceTypeRadio = document.querySelector('input[name="power-source-type"]:checked');
    
    if (!panelNameInput || !panelTypeSelect || !panelVoltageSelect || !panelAmpacityInput || !powerSourceTypeRadio) {
        showAlert('بعض عناصر النموذج غير موجودة', 'danger');
        return;
    }
    
    // تجميع بيانات اللوحة من النموذج
    const panelId = panelIdInput ? panelIdInput.value : '';
    const panelName = panelNameInput.value.trim();
    const panelType = panelTypeSelect.value;
    const panelVoltage = panelVoltageSelect.value;
    const panelAmpacity = parseInt(panelAmpacityInput.value.trim());
    const panelDescription = panelDescriptionInput ? panelDescriptionInput.value.trim() : '';
    
    // تحديد مصدر التغذية (مصدر طاقة أو لوحة أم)
    const powerSourceType = powerSourceTypeRadio.value;
    let powerSourceId = null;
    let parentPanelId = null;
    let feederBreakerId = null;
    
    if (powerSourceType === 'power-source') {
        const powerSourceSelect = document.getElementById('panel-power-source');
        if (powerSourceSelect) {
            powerSourceId = powerSourceSelect.value;
        }
    } else {
        const parentPanelSelect = document.getElementById('panel-parent');
        const feederBreakerSelect = document.getElementById('panel-feeder-breaker');
        
        if (parentPanelSelect) {
            parentPanelId = parentPanelSelect.value;
        }
        
        if (feederBreakerSelect) {
            feederBreakerId = feederBreakerSelect.value || null;
        }
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
            const modal = bootstrap.Modal.getInstance(document.getElementById('addPanelModal'));
            if (modal) modal.hide();
            
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
        const deletePanelIdInput = document.getElementById('delete-panel-id');
        const deletePanelNameSpan = document.getElementById('delete-item-name');
        
        if (deletePanelIdInput && deletePanelNameSpan) {
            deletePanelIdInput.value = panelId;
            deletePanelNameSpan.textContent = panelName;
            
            // عرض نافذة التأكيد
            const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
            modal.show();
        } else {
            showAlert('عناصر نافذة تأكيد الحذف غير موجودة', 'danger');
        }
    } catch (error) {
        console.error('خطأ أثناء التحقق من اللوحات الفرعية:', error);
        showAlert('حدث خطأ غير متوقع أثناء التحقق من اللوحات الفرعية', 'danger');
    }
}

/**
 * تأكيد حذف اللوحة
 */
async function confirmDelete() {
    const deletePanelIdInput = document.getElementById('delete-panel-id');
    const deletePanelNameSpan = document.getElementById('delete-item-name');
    
    if (!deletePanelIdInput || !deletePanelNameSpan) {
        showAlert('عناصر نافذة تأكيد الحذف غير موجودة', 'danger');
        return;
    }
    
    const panelId = deletePanelIdInput.value;
    const panelName = deletePanelNameSpan.textContent;
    
    try {
        // حذف اللوحة
        const result = await PanelAPI.delete(panelId);
        
        // إغلاق نافذة التأكيد
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
        if (modal) modal.hide();
        
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

// تصدير الوظائف اللازمة
export {
    setupFormEventListeners,
    showAddPanelModal,
    showAddChildPanelModal,
    togglePanelSourceFields,
    updateSourceForm,
    validatePanelForm,
    savePanel,
    deletePanel,
    confirmDelete,
    loadParentPanelBreakers,
    loadPowerSourcesDropdown
};