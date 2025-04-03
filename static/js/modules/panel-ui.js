/**
 * panel-ui.js
 * ملف JavaScript المسؤول عن واجهة المستخدم لصفحة اللوحات الكهربائية
 */

import { showAlert, getPanelTypeDisplay, getVoltageDisplay } from './panel-core.js';
import { showAddPanelModal, showAddChildPanelModal, deletePanel } from './panel-forms.js';
import { showSetMainBreakerModal } from './panel-breakers.js';
import { viewPanelDetails } from './panel-details.js';

/**
 * تحديث جدول اللوحات بالبيانات المستلمة
 * @param {Array} panels - مصفوفة اللوحات
 */
function loadPanelsTable(panels) {
    const tableBody = document.getElementById('panels-table-body');
    
    if (!tableBody) return;
    
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
                    <div class="btn-group" role="group">
                        <a href="/breakers?panel=${panel.id}" class="btn btn-sm btn-primary">
                            <i class="fas fa-toggle-on"></i> القواطع
                        </a>
                        <button class="btn btn-sm btn-info view-panel" data-id="${panel.id}">
                            <i class="fas fa-eye"></i> تفاصيل
                        </button>
                        <button class="btn btn-sm btn-warning edit-panel" data-id="${panel.id}">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-sm btn-success add-child-panel" data-id="${panel.id}">
                            <i class="fas fa-plus"></i> لوحة فرعية
                        </button>
                        <button class="btn btn-sm btn-danger delete-panel" data-id="${panel.id}" data-name="${panel.name}">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
    
    // إضافة مستمعي الأحداث للأزرار
    attachTableEventListeners();
}

/**
 * إضافة مستمعي الأحداث لأزرار الجدول
 */
function attachTableEventListeners() {
    document.querySelectorAll('.view-panel').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            viewPanelDetails(e.target.closest('button').dataset.id);
        });
    });
    
    document.querySelectorAll('.edit-panel').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            showAddPanelModal(true, e.target.closest('button').dataset.id);
        });
    });
    
    document.querySelectorAll('.add-child-panel').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            showAddChildPanelModal(e.target.closest('button').dataset.id);
        });
    });
    
    document.querySelectorAll('.set-main-breaker').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            showSetMainBreakerModal(e.target.closest('button').dataset.id);
        });
    });
    
    document.querySelectorAll('.delete-panel').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const btn = e.target.closest('button');
            deletePanel(btn.dataset.id, btn.dataset.name);
        });
    });
}

/**
 * بناء قائمة منسدلة للقواطع المتاحة
 * @param {Array} breakers - قائمة القواطع
 * @param {string} selectId - معرف عنصر القائمة المنسدلة
 * @param {number} selectedBreakerId - معرف القاطع المحدد (اختياري)
 */
function buildBreakersDropdown(breakers, selectId, selectedBreakerId = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
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

// تصدير الوظائف اللازمة
export {
    loadPanelsTable,
    buildBreakersDropdown
};