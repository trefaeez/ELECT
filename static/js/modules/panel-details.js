/**
 * panel-details.js
 * ملف JavaScript المسؤول عن عرض تفاصيل اللوحات الكهربائية
 */

import { PanelAPI } from '../api_endpoints.js';
import { showAlert, getPanelTypeDisplay, getVoltageDisplay } from './panel-core.js';
import { showAddChildPanelModal } from './panel-forms.js';
import { showSetMainBreakerModal } from './panel-breakers.js';

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
        updatePanelDetailsModalContent(panel, breakers, childPanels);
        
        // عرض النافذة
        const modal = new bootstrap.Modal(document.getElementById('panelDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('خطأ في عرض تفاصيل اللوحة:', error);
        showAlert('حدث خطأ غير متوقع أثناء تحميل تفاصيل اللوحة', 'danger');
    }
}

/**
 * تحديث محتوى نافذة تفاصيل اللوحة
 * @param {Object} panel - بيانات اللوحة
 * @param {Array} breakers - قواطع اللوحة
 * @param {Array} childPanels - اللوحات الفرعية
 */
function updatePanelDetailsModalContent(panel, breakers, childPanels) {
    // عناصر النافذة الأساسية
    const panelNameElement = document.getElementById('detail-panel-name');
    const panelTypeElement = document.getElementById('detail-panel-type');
    const panelVoltageElement = document.getElementById('detail-panel-voltage');
    const panelAmpacityElement = document.getElementById('detail-panel-ampacity');
    const panelDescriptionElement = document.getElementById('detail-panel-description');
    const sourceInfoElement = document.getElementById('detail-panel-source');
    const mainBreakerElement = document.getElementById('detail-panel-main-breaker');
    const breakersElement = document.getElementById('detail-panel-breakers');
    const childPanelsElement = document.getElementById('detail-panel-child-panels');
    const pathElement = document.getElementById('detail-panel-path');
    const pathContainer = document.getElementById('panel-path-container');
    const gotoPanelBtn = document.getElementById('goto-panel-btn');
    
    // التحقق من وجود عناصر واجهة المستخدم
    if (!panelNameElement || !panelTypeElement || !panelVoltageElement || 
        !panelAmpacityElement || !panelDescriptionElement || !sourceInfoElement || 
        !mainBreakerElement || !breakersElement || !childPanelsElement) {
        console.error('بعض عناصر نافذة تفاصيل اللوحة غير موجودة');
        return;
    }
    
    // تعبئة البيانات الأساسية
    panelNameElement.textContent = panel.name;
    panelTypeElement.innerHTML = getPanelTypeDisplay(panel.panel_type);
    panelVoltageElement.textContent = getVoltageDisplay(panel.voltage);
    panelAmpacityElement.textContent = `${panel.ampacity} A`;
    panelDescriptionElement.textContent = panel.description || 'لا يوجد وصف';
    
    // عرض معلومات مصدر التغذية
    updatePanelSourceInfo(panel, sourceInfoElement);
    
    // عرض معلومات القاطع الرئيسي
    updateMainBreakerInfo(panel, mainBreakerElement);
    
    // عرض القواطع في اللوحة
    updateBreakersInfo(panel.id, breakers, breakersElement);
    
    // عرض اللوحات الفرعية
    updateChildPanelsInfo(panel.id, childPanels, childPanelsElement);
    
    // عرض المسار الكامل للوحة
    if (pathElement && pathContainer) {
        if (panel.full_path) {
            pathElement.textContent = panel.full_path;
            pathContainer.classList.remove('d-none');
        } else {
            pathContainer.classList.add('d-none');
        }
    }
    
    // تعيين رابط زر الانتقال إلى صفحة اللوحة
    if (gotoPanelBtn) {
        gotoPanelBtn.href = `/panels?id=${panel.id}`;
    }
}

/**
 * تحديث معلومات مصدر التغذية للوحة
 * @param {Object} panel - بيانات اللوحة
 * @param {HTMLElement} sourceInfoElement - عنصر HTML لعرض المعلومات
 */
function updatePanelSourceInfo(panel, sourceInfoElement) {
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
                const currentModal = bootstrap.Modal.getInstance(document.getElementById('panelDetailsModal'));
                currentModal.hide();
                
                // فتح تفاصيل اللوحة الأم
                viewPanelDetails(this.dataset.id);
            });
        });
    } else {
        sourceInfoElement.innerHTML = '<div class="mb-2">لا يوجد مصدر تغذية محدد</div>';
    }
}

/**
 * تحديث معلومات القاطع الرئيسي للوحة
 * @param {Object} panel - بيانات اللوحة
 * @param {HTMLElement} mainBreakerElement - عنصر HTML لعرض المعلومات
 */
function updateMainBreakerInfo(panel, mainBreakerElement) {
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
            const detailModal = bootstrap.Modal.getInstance(document.getElementById('panelDetailsModal'));
            detailModal.hide();
            
            // فتح نافذة تعيين القاطع الرئيسي
            showSetMainBreakerModal(this.dataset.id);
        });
    }
}

/**
 * تحديث معلومات القواطع في اللوحة
 * @param {number} panelId - معرف اللوحة
 * @param {Array} breakers - قائمة القواطع
 * @param {HTMLElement} breakersElement - عنصر HTML لعرض القواطع
 */
function updateBreakersInfo(panelId, breakers, breakersElement) {
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
}

/**
 * تحديث معلومات اللوحات الفرعية
 * @param {number} panelId - معرف اللوحة
 * @param {Array} childPanels - قائمة اللوحات الفرعية
 * @param {HTMLElement} childPanelsElement - عنصر HTML لعرض اللوحات الفرعية
 */
function updateChildPanelsInfo(panelId, childPanels, childPanelsElement) {
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
                const currentModal = bootstrap.Modal.getInstance(document.getElementById('panelDetailsModal'));
                currentModal.hide();
                
                // فتح تفاصيل اللوحة الفرعية
                viewPanelDetails(this.dataset.id);
            });
        });
    } else {
        childPanelsElement.innerHTML = `
            <div class="alert alert-secondary">
                لا توجد لوحات فرعية متصلة بهذه اللوحة
                <button class="btn btn-sm btn-success ms-2 add-subpanel-btn" data-id="${panelId}">
                    <i class="fas fa-plus"></i> إضافة لوحة فرعية
                </button>
            </div>
        `;
        
        // إضافة مستمع الأحداث لزر إضافة لوحة فرعية
        const addButton = childPanelsElement.querySelector('.add-subpanel-btn');
        if (addButton) {
            addButton.addEventListener('click', function(e) {
                e.preventDefault();
                
                // إغلاق نافذة التفاصيل
                const detailModal = bootstrap.Modal.getInstance(document.getElementById('panelDetailsModal'));
                detailModal.hide();
                
                // فتح نافذة إضافة لوحة فرعية
                showAddChildPanelModal(this.dataset.id);
            });
        }
    }
}

// تصدير الوظائف اللازمة
export {
    viewPanelDetails
};