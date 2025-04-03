/**
 * panel-breakers.js
 * ملف JavaScript المسؤول عن إدارة القواطع المرتبطة باللوحات الكهربائية
 */

import { PanelAPI, CircuitBreakerAPI } from '../api_endpoints.js';
import { showAlert, loadPanels } from './panel-core.js';
import { buildBreakersDropdown } from './panel-ui.js';

/**
 * إعداد مستمعي الأحداث للقواطع
 */
function setupBreakerEventListeners() {
    // زر حفظ القاطع الرئيسي
    const saveMainBreakerBtn = document.getElementById('save-main-breaker-btn');
    if (saveMainBreakerBtn) {
        saveMainBreakerBtn.addEventListener('click', saveMainBreaker);
    }
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
        
        // الحصول على عناصر النافذة
        const panelIdInput = document.getElementById('main-breaker-panel-id');
        const panelNameSpan = document.getElementById('main-breaker-panel-name');
        const breakerSelect = document.getElementById('panel-main-breaker');
        
        // التحقق من وجود العناصر
        if (!panelIdInput || !panelNameSpan || !breakerSelect) {
            console.error('عناصر نافذة تعيين القاطع الرئيسي غير موجودة');
            return;
        }
        
        // تعيين معرف واسم اللوحة
        panelIdInput.value = panelId;
        panelNameSpan.textContent = panel.name;
        
        // تحضير قائمة القواطع
        breakerSelect.innerHTML = '<option value="">-- اختر القاطع الرئيسي --</option>';
        
        if (breakers.length === 0) {
            breakerSelect.innerHTML += '<option value="" disabled>لا توجد قواطع متاحة في هذه اللوحة</option>';
        } else {
            let selectedBreakerId = panel.main_breaker ? panel.main_breaker.id : null;
            buildBreakersDropdown(breakers, 'panel-main-breaker', selectedBreakerId);
        }
        
        // عرض النافذة
        const modal = new bootstrap.Modal(document.getElementById('setMainBreakerModal'));
        modal.show();
    } catch (error) {
        console.error('خطأ في تحميل بيانات القاطع الرئيسي:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل بيانات القاطع الرئيسي', 'danger');
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
        return { 
            success: false, 
            error: { 
                message: 'حدث خطأ غير متوقع أثناء تحميل قواطع اللوحة' 
            } 
        };
    }
}

/**
 * حفظ القاطع الرئيسي للوحة
 */
async function saveMainBreaker() {
    // الحصول على القيم المطلوبة
    const panelIdInput = document.getElementById('main-breaker-panel-id');
    const breakerSelect = document.getElementById('panel-main-breaker');
    
    // التحقق من وجود العناصر
    if (!panelIdInput || !breakerSelect) {
        showAlert('عناصر نافذة تعيين القاطع الرئيسي غير موجودة', 'danger');
        return;
    }
    
    const panelId = panelIdInput.value;
    const breakerId = breakerSelect.value;
    
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
            const modal = bootstrap.Modal.getInstance(document.getElementById('setMainBreakerModal'));
            if (modal) modal.hide();
            
            // تحديث عرض اللوحات
            loadPanels();
        }
    } catch (error) {
        console.error('خطأ في حفظ القاطع الرئيسي:', error);
        showAlert('حدث خطأ غير متوقع أثناء حفظ القاطع الرئيسي', 'danger');
    }
}

// تصدير الوظائف اللازمة
export {
    setupBreakerEventListeners,
    showSetMainBreakerModal,
    getBreakersByPanel,
    saveMainBreaker
};