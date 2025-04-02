/**
 * app.js - الملف الرئيسي لتطبيق إدارة شبكة الطاقة الكهربائية
 * ملاحظة: تم نقل معظم الوظائف إلى ملفات منفصلة في مجلد modules
 */

// استيراد وحدات API
import { 
    PowerSourceAPI, 
    PanelAPI, 
    BreakerAPI, 
    LoadAPI 
} from './api_endpoints.js';

// تحديد أي صفحة نحن فيها الآن
const currentPage = getCurrentPage();

// متغيرات للمشاركة بين الوحدات
window.selectedItems = {
    powerSourceId: null,
    panelId: null,
    breakerId: null,
    loadId: null
};

// عند تحميل المستند
document.addEventListener('DOMContentLoaded', async function() {
    setupSharedEventListeners();
    
    // تحميل الوحدة المناسبة حسب الصفحة الحالية
    switch(currentPage) {
        case 'power-sources':
            await import('./modules/power-sources.js');
            break;
        case 'panels':
            await import('./modules/panels.js');
            break;
        case 'breakers':
            await import('./modules/breakers.js');
            break;
        case 'loads':
            await import('./modules/loads.js');
            break;
        case 'index':
        default:
            // للصفحة الرئيسية قد تحتاج إلى تحميل بعض الوحدات أو البيانات العامة
            break;
    }
});

/**
 * تحديد الصفحة الحالية بناءً على مسار URL
 */
function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop();
    
    if (page === 'power-sources.html') return 'power-sources';
    if (page === 'panels.html') return 'panels';
    if (page === 'breakers.html') return 'breakers';
    if (page === 'loads.html') return 'loads';
    
    return 'index';
}

/**
 * إعداد مستمعي الأحداث المشتركة بين جميع الصفحات
 */
function setupSharedEventListeners() {
    // حدث زر تأكيد الحذف - مشترك بين جميع الصفحات
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDelete);
    }
}

/**
 * وظيفة تأكيد الحذف المشتركة
 */
async function confirmDelete() {
    const itemType = window.deleteItemType;
    const itemId = window.deleteItemId;
    
    if (!itemType || !itemId) return;
    
    try {
        let result;
        
        switch (itemType) {
            case 'power-source':
                result = await PowerSourceAPI.delete(itemId);
                break;
            case 'panel':
                result = await PanelAPI.delete(itemId);
                break;
            case 'breaker':
                result = await BreakerAPI.delete(itemId);
                break;
            case 'load':
                result = await LoadAPI.delete(itemId);
                break;
            default:
                showAlert('نوع العنصر غير معروف', 'danger');
                return;
        }
        
        if (result.success) {
            showAlert(`تم حذف العنصر بنجاح`);
            
            // إعادة تحميل البيانات - سيتم التعامل معها من خلال حدث مخصص
            const event = new CustomEvent('item-deleted', { 
                detail: { type: itemType, id: itemId } 
            });
            document.dispatchEvent(event);
            
            // إغلاق النافذة المنبثقة
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
            if (modal) modal.hide();
        } else {
            showAlert(`فشل حذف العنصر: ${result.error?.message || 'خطأ غير معروف'}`, 'danger');
        }
    } catch (error) {
        console.error('خطأ في حذف العنصر:', error);
        showAlert('حدث خطأ غير متوقع أثناء حذف العنصر', 'danger');
    }
}

/**
 * إظهار تنبيه للمستخدم - وظيفة مشتركة
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
    
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.remove();
        }
    }, 5000);
}

// تصدير الوظائف المشتركة للاستخدام في الوحدات الأخرى
window.showAlert = showAlert;

// وظائف مساعدة أخرى مشتركة
window.getVoltageDisplay = function(voltage) {
    const types = {
        '220': '220 فولت',
        '380': '380 فولت',
        '11KV': '11 كيلو فولت',
        '24': '24 فولت'
    };
    
    return types[voltage] || voltage;
};

window.getSourceTypeDisplay = function(sourceType) {
    const types = {
        'Local Grid': 'الشبكة المحلية',
        'Generator': 'مولد'
    };
    
    return types[sourceType] || sourceType;
};

window.getPanelTypeDisplay = function(panelType) {
    const types = {
        'main': 'لوحة رئيسية',
        'sub': 'لوحة فرعية'
    };
    
    return types[panelType] || panelType;
};

window.getBreakerTypeDisplay = function(breakerType) {
    const types = {
        'MCB': 'MCB - قاطع دارة مصغر',
        'MCCB': 'MCCB - قاطع دارة مشكل',
        'ACB': 'ACB - قاطع دارة هوائي',
        'ELCB': 'ELCB - قاطع دارة تسرب أرضي',
        'RCD': 'RCD - جهاز تيار متبقي',
        'RCBO': 'RCBO - قاطع دارة بتيار متبقي'
    };
    
    return types[breakerType] || breakerType;
};

window.getBreakerRoleDisplay = function(breakerRole) {
    const roles = {
        'main': 'قاطع رئيسي',
        'distribution': 'قاطع توزيع'
    };
    
    return roles[breakerRole] || breakerRole;
};