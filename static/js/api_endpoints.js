/**
 * api_endpoints.js
 * ملف يحتوي على دوال للتعامل مع نقاط نهاية API
 */

// الرابط الأساسي للـ API
const API_BASE_URL = '/api';

/**
 * وظيفة مساعدة لإرسال طلبات للواجهة البرمجية
 * @param {string} url - مسار نقطة النهاية
 * @param {string} method - طريقة الطلب (GET, POST, PUT, DELETE)
 * @param {Object} data - البيانات المرسلة (اختياري)
 * @returns {Promise} وعد بالاستجابة
 */
async function apiRequest(url, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            }
        };
        
        // إذا كان هناك بيانات، أضفها إلى الطلب
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }
        
        // إرسال الطلب
        const response = await fetch(url, options);
        
        // التحقق من نجاح الطلب
        if (response.ok) {
            // إذا كانت الاستجابة فارغة، إرجاع نجاح بدون بيانات
            if (response.status === 204) {
                return { success: true };
            }
            
            // محاولة تحليل البيانات كـ JSON
            const responseData = await response.json();
            return { success: true, data: responseData };
        } else {
            // محاولة استخراج رسالة الخطأ من الاستجابة
            let errorMessage = 'حدث خطأ غير معروف';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.detail || JSON.stringify(errorData);
            } catch (e) {
                errorMessage = `خطأ ${response.status}: ${response.statusText}`;
            }
            
            return { 
                success: false, 
                error: { 
                    status: response.status, 
                    message: errorMessage 
                } 
            };
        }
    } catch (error) {
        console.error('خطأ في طلب API:', error);
        return { 
            success: false, 
            error: { 
                message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.' 
            } 
        };
    }
}

/**
 * استخراج رمز CSRF من الكوكيز
 * @returns {string} رمز CSRF
 */
function getCsrfToken() {
    // استخراج رمز CSRF من ملفات تعريف الارتباط
    const csrfCookie = document.cookie
        .split(';')
        .map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith('csrftoken='));
    
    return csrfCookie ? csrfCookie.split('=')[1] : '';
}

/**
 * واجهة برمجة تطبيقات مصادر الطاقة
 */
export const PowerSourceAPI = {
    /**
     * الحصول على جميع مصادر الطاقة
     * @returns {Promise} وعد بالاستجابة
     */
    getAll: async function() {
        return await apiRequest(`${API_BASE_URL}/powersources/`);
    },
    
    /**
     * الحصول على تفاصيل مصدر طاقة محدد
     * @param {number} id - معرف مصدر الطاقة
     * @returns {Promise} وعد بالاستجابة
     */
    getById: async function(id) {
        return await apiRequest(`${API_BASE_URL}/powersources/${id}/`);
    },
    
    /**
     * إضافة مصدر طاقة جديد
     * @param {Object} data - بيانات مصدر الطاقة
     * @returns {Promise} وعد بالاستجابة
     */
    add: async function(data) {
        return await apiRequest(`${API_BASE_URL}/powersources/`, 'POST', data);
    },
    
    /**
     * تحديث مصدر طاقة
     * @param {number} id - معرف مصدر الطاقة
     * @param {Object} data - بيانات مصدر الطاقة المحدثة
     * @returns {Promise} وعد بالاستجابة
     */
    update: async function(id, data) {
        return await apiRequest(`${API_BASE_URL}/powersources/${id}/`, 'PUT', data);
    },
    
    /**
     * حذف مصدر طاقة
     * @param {number} id - معرف مصدر الطاقة
     * @returns {Promise} وعد بالاستجابة
     */
    delete: async function(id) {
        return await apiRequest(`${API_BASE_URL}/powersources/${id}/`, 'DELETE');
    },
    
    /**
     * الحصول على اللوحات المرتبطة بمصدر طاقة
     * @param {number} id - معرف مصدر الطاقة
     * @returns {Promise} وعد بالاستجابة
     */
    getPanels: async function(id) {
        return await apiRequest(`${API_BASE_URL}/powersources/${id}/panels/`);
    },
    
    /**
     * إضافة لوحة جديدة لمصدر طاقة
     * @param {number} id - معرف مصدر الطاقة
     * @param {Object} data - بيانات اللوحة
     * @returns {Promise} وعد بالاستجابة
     */
    addPanel: async function(id, data) {
        return await apiRequest(`${API_BASE_URL}/powersources/${id}/panels/`, 'POST', data);
    }
};

/**
 * واجهة برمجة تطبيقات اللوحات
 */
export const PanelAPI = {
    /**
     * الحصول على جميع اللوحات
     * @returns {Promise} وعد بالاستجابة
     */
    getAll: async function() {
        return await apiRequest(`${API_BASE_URL}/panels/`);
    },
    
    /**
     * الحصول على تفاصيل لوحة محددة
     * @param {number} id - معرف اللوحة
     * @returns {Promise} وعد بالاستجابة
     */
    getById: async function(id) {
        return await apiRequest(`${API_BASE_URL}/panels/${id}/`);
    },
    
    /**
     * إضافة لوحة جديدة
     * @param {Object} data - بيانات اللوحة
     * @returns {Promise} وعد بالاستجابة
     */
    add: async function(data) {
        return await apiRequest(`${API_BASE_URL}/panels/`, 'POST', data);
    },
    
    /**
     * تحديث لوحة
     * @param {number} id - معرف اللوحة
     * @param {Object} data - بيانات اللوحة المحدثة
     * @returns {Promise} وعد بالاستجابة
     */
    update: async function(id, data) {
        return await apiRequest(`${API_BASE_URL}/panels/${id}/`, 'PUT', data);
    },
    
    /**
     * حذف لوحة
     * @param {number} id - معرف اللوحة
     * @returns {Promise} وعد بالاستجابة
     */
    delete: async function(id) {
        return await apiRequest(`${API_BASE_URL}/panels/${id}/`, 'DELETE');
    },
    
    /**
     * الحصول على القواطع المرتبطة بلوحة
     * @param {number} id - معرف اللوحة
     * @returns {Promise} وعد بالاستجابة
     */
    getBreakers: async function(id) {
        return await apiRequest(`${API_BASE_URL}/panels/${id}/breakers/`);
    },
    
    /**
     * إضافة قاطع جديد للوحة
     * @param {number} id - معرف اللوحة
     * @param {Object} data - بيانات القاطع
     * @returns {Promise} وعد بالاستجابة
     */
    addBreaker: async function(id, data) {
        return await apiRequest(`${API_BASE_URL}/panels/${id}/breakers/`, 'POST', data);
    }
};

/**
 * واجهة برمجة تطبيقات القواطع
 */
export const CircuitBreakerAPI = {
    /**
     * الحصول على جميع القواطع
     * @returns {Promise} وعد بالاستجابة
     */
    getAll: async function() {
        return await apiRequest(`${API_BASE_URL}/circuitbreakers/`);
    },
    
    /**
     * الحصول على تفاصيل قاطع محدد
     * @param {number} id - معرف القاطع
     * @returns {Promise} وعد بالاستجابة
     */
    getById: async function(id) {
        return await apiRequest(`${API_BASE_URL}/circuitbreakers/${id}/`);
    },
    
    /**
     * إضافة قاطع جديد
     * @param {Object} data - بيانات القاطع
     * @returns {Promise} وعد بالاستجابة
     */
    add: async function(data) {
        return await apiRequest(`${API_BASE_URL}/circuitbreakers/`, 'POST', data);
    },
    
    /**
     * تحديث قاطع
     * @param {number} id - معرف القاطع
     * @param {Object} data - بيانات القاطع المحدثة
     * @returns {Promise} وعد بالاستجابة
     */
    update: async function(id, data) {
        return await apiRequest(`${API_BASE_URL}/circuitbreakers/${id}/`, 'PUT', data);
    },
    
    /**
     * حذف قاطع
     * @param {number} id - معرف القاطع
     * @returns {Promise} وعد بالاستجابة
     */
    delete: async function(id) {
        return await apiRequest(`${API_BASE_URL}/circuitbreakers/${id}/`, 'DELETE');
    },
    
    /**
     * الحصول على الأحمال المرتبطة بقاطع
     * @param {number} id - معرف القاطع
     * @returns {Promise} وعد بالاستجابة
     */
    getLoads: async function(id) {
        return await apiRequest(`${API_BASE_URL}/circuitbreakers/${id}/loads/`);
    },
    
    /**
     * إضافة حمل جديد لقاطع
     * @param {number} id - معرف القاطع
     * @param {Object} data - بيانات الحمل
     * @returns {Promise} وعد بالاستجابة
     */
    addLoad: async function(id, data) {
        return await apiRequest(`${API_BASE_URL}/circuitbreakers/${id}/loads/`, 'POST', data);
    }
};

/**
 * واجهة برمجة تطبيقات الأحمال
 */
export const LoadAPI = {
    /**
     * الحصول على جميع الأحمال
     * @returns {Promise} وعد بالاستجابة
     */
    getAll: async function() {
        return await apiRequest(`${API_BASE_URL}/loads/`);
    },
    
    /**
     * الحصول على تفاصيل حمل محدد
     * @param {number} id - معرف الحمل
     * @returns {Promise} وعد بالاستجابة
     */
    getById: async function(id) {
        return await apiRequest(`${API_BASE_URL}/loads/${id}/`);
    },
    
    /**
     * إضافة حمل جديد
     * @param {Object} data - بيانات الحمل
     * @returns {Promise} وعد بالاستجابة
     */
    add: async function(data) {
        return await apiRequest(`${API_BASE_URL}/loads/`, 'POST', data);
    },
    
    /**
     * تحديث حمل
     * @param {number} id - معرف الحمل
     * @param {Object} data - بيانات الحمل المحدثة
     * @returns {Promise} وعد بالاستجابة
     */
    update: async function(id, data) {
        return await apiRequest(`${API_BASE_URL}/loads/${id}/`, 'PUT', data);
    },
    
    /**
     * حذف حمل
     * @param {number} id - معرف الحمل
     * @returns {Promise} وعد بالاستجابة
     */
    delete: async function(id) {
        return await apiRequest(`${API_BASE_URL}/loads/${id}/`, 'DELETE');
    }
};