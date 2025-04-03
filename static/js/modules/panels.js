/**
 * panels.js
 * ملف JavaScript الخاص بصفحة اللوحات الكهربائية (الملف الرئيسي)
 * هذا الملف يستورد جميع الوحدات المطلوبة ويعمل كنقطة دخول رئيسية
 */

// استيراد الوحدات
import {
    showAlert,
    loadPanels,
    loadMainPanelsDropdown,
    getPanelTypeDisplay,
    getVoltageDisplay
} from './panel-core.js';

import { viewPanelDetails } from './panel-details.js';
import { saveMainBreaker } from './panel-breakers.js';
import { deletePanel } from './panel-forms.js';

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    console.log('تم تحميل وحدات اللوحات الكهربائية بنجاح');
});

// تصدير الوظائف الرئيسية للاستخدام الخارجي
export {
    viewPanelDetails,
    saveMainBreaker,
    deletePanel,
    loadPanels,
    getPanelTypeDisplay,
    getVoltageDisplay
};