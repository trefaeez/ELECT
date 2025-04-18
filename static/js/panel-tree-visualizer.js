/**
 * panel-tree-visualizer.js
 * هذا الملف يوفر وظائف لعرض هيكل اللوحات الكهربائية بشكل شجري منظم
 */

// واجهة برمجة التطبيقات للتعامل مع الخادم
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
                'Content-Type': 'application/json'
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

// واجهات برمجة تطبيقات للحصول على بيانات الشبكة
const NetworkAPI = {
    getPowerSources: async function() {
        return await apiRequest(`${API_BASE_URL}/powersources/`);
    },
    
    getPanels: async function() {
        return await apiRequest(`${API_BASE_URL}/panels/`);
    },
    
    getPowerSourceById: async function(id) {
        return await apiRequest(`${API_BASE_URL}/powersources/${id}/`);
    },
    
    getPanelById: async function(id) {
        return await apiRequest(`${API_BASE_URL}/panels/${id}/`);
    },
    
    getPanelsByPowerSource: async function(powerSourceId) {
        return await apiRequest(`${API_BASE_URL}/powersources/${powerSourceId}/panels/`);
    },
    
    getChildPanels: async function(panelId) {
        return await apiRequest(`${API_BASE_URL}/panels/${panelId}/child_panels/`);
    },
    
    getPanelBreakers: async function(panelId) {
        return await apiRequest(`${API_BASE_URL}/panels/${panelId}/breakers/`);
    }
};

/**
 * فئة لعرض هيكل اللوحات الشجري
 */
class PanelTreeVisualizer {
    /**
     * إنشاء كائن جديد من عارض شجرة اللوحات
     * @param {string} containerId - معرف عنصر الحاوية
     */
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`لم يتم العثور على عنصر بالمعرف: ${containerId}`);
            return;
        }
        
        // تهيئة الخصائص
        this.treeData = null;
        this.selectedNodeId = null;
        this.onSelectCallback = null;
        
        // قواميس المسميات
        this.typeNames = {
            'powerSource': 'مصدر طاقة',
            'panel': 'لوحة كهربائية',
            'main': 'لوحة رئيسية',
            'sub_main': 'لوحة رئيسية فرعية',
            'sub': 'لوحة فرعية',
            'copper': 'نحاس',
            'aluminum': 'ألمنيوم'
        };
    }
    
    /**
     * تحميل بيانات اللوحات وترتيبها في شكل شجري
     * @returns {Promise} وعد يتم حله عند اكتمال تحميل البيانات
     */
    async loadPanelsData() {
        try {
            // جلب مصادر الطاقة واللوحات
            const powerSourcesResponse = await NetworkAPI.getPowerSources();
            const panelsResponse = await NetworkAPI.getPanels();
            
            if (!powerSourcesResponse.success || !panelsResponse.success) {
                throw new Error('فشل في جلب بيانات اللوحات ومصادر الطاقة');
            }
            
            const powerSources = powerSourcesResponse.data;
            const panels = panelsResponse.data;
            
            // تحديث الإحصائيات
            this.updateStatistics(powerSources, panels);
            
            // إنشاء جذور الشجرة (مصادر الطاقة)
            const roots = powerSources.map(source => ({
                id: `ps-${source.id}`,
                name: source.name,
                type: 'powerSource',
                data: source,
                children: []
            }));
            
            // تصنيف اللوحات حسب النوع
            const mainPanels = panels.filter(panel => panel.panel_type === 'main');
            const nonMainPanels = panels.filter(panel => panel.panel_type !== 'main');
            
            // إضافة اللوحات الرئيسية كأبناء لمصادر الطاقة
            mainPanels.forEach(panel => {
                const sourceIndex = roots.findIndex(source => source.id === `ps-${panel.power_source}`);
                if (sourceIndex !== -1) {
                    roots[sourceIndex].children.push({
                        id: `panel-${panel.id}`,
                        name: panel.name,
                        type: 'panel',
                        panelType: panel.panel_type,
                        data: panel,
                        children: []
                    });
                }
            });
            
            // إضافة اللوحات الفرعية بشكل متكرر حتى يتم استيعاب جميع اللوحات
            let pendingPanels = nonMainPanels.slice();
            let addedInLastIteration = true;
            
            while (pendingPanels.length > 0 && addedInLastIteration) {
                addedInLastIteration = false;
                let stillPending = [];
                
                for (const panel of pendingPanels) {
                    let added = false;
                    
                    // البحث عن جميع جذور الشجرة (متضمنة مصادر الطاقة)
                    for (const root of roots) {
                        added = this.addPanelToParent(root, panel);
                        if (added) break;
                    }
                    
                    if (!added) {
                        stillPending.push(panel);
                    } else {
                        addedInLastIteration = true;
                    }
                }
                
                pendingPanels = stillPending;
            }
            
            // استخدام جميع مصادر الطاقة بدلاً من تصفيتها
            this.treeData = roots;
            
            // إضافة رسالة توضيحية لمصادر الطاقة التي ليس لها لوحات
            this.treeData.forEach(source => {
                if (source.children.length === 0) {
                    source.noChildren = true;
                }
            });
            
            return this.treeData;
        } catch (error) {
            console.error('خطأ في تحميل بيانات اللوحات:', error);
            return null;
        }
    }
    
    /**
     * تحديث الإحصائيات في الصفحة
     * @param {Array} powerSources - مصادر الطاقة
     * @param {Array} panels - اللوحات الكهربائية
     */
    updateStatistics(powerSources, panels) {
        document.getElementById('powerSourcesCount').textContent = powerSources.length;
        document.getElementById('panelsCount').textContent = panels.length;
        
        const mainPanelsCount = panels.filter(panel => panel.panel_type === 'main').length;
        const subPanelsCount = panels.filter(panel => panel.panel_type !== 'main').length;
        
        document.getElementById('mainPanelsCount').textContent = mainPanelsCount;
        document.getElementById('subPanelsCount').textContent = subPanelsCount;
    }
    
    /**
     * إضافة لوحة فرعية إلى اللوحة الأم المناسبة في الشجرة
     * @param {Object} node - العقدة الحالية في الشجرة
     * @param {Object} panel - بيانات اللوحة المراد إضافتها
     * @returns {boolean} نجاح إضافة اللوحة
     */
    addPanelToParent(node, panel) {
        // إذا كانت العقدة الحالية هي اللوحة الأم المطلوبة
        if (node.id === `panel-${panel.parent_panel}`) {
            node.children.push({
                id: `panel-${panel.id}`,
                name: panel.name,
                type: 'panel',
                panelType: panel.panel_type,
                data: panel,
                children: []
            });
            return true;
        }
        
        // البحث في الأبناء بشكل متكرر
        for (const child of node.children) {
            if (this.addPanelToParent(child, panel)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * إنشاء عرض شجري في الحاوية
     */
    renderTree() {
        if (!this.treeData || this.treeData.length === 0) {
            this.container.innerHTML = '<div class="alert alert-warning">لا توجد بيانات لعرضها</div>';
            return;
        }
        
        // مسح الحاوية
        this.container.innerHTML = '';
        
        // إنشاء العنصر الأساسي للشجرة
        const treeContainer = document.createElement('div');
        treeContainer.className = 'panel-tree';
        
        // إضافة كل مصدر طاقة كجذر منفصل
        this.treeData.forEach(source => {
            const sourceElement = this.createPowerSourceElement(source);
            treeContainer.appendChild(sourceElement);
        });
        
        // إضافة الشجرة إلى الحاوية
        this.container.appendChild(treeContainer);
        
        // إضافة مستمعي الأحداث
        this.addEventListeners();
    }
    
    /**
     * إنشاء عنصر لمصدر الطاقة
     * @param {Object} source - بيانات مصدر الطاقة
     * @returns {HTMLElement} عنصر DOM لمصدر الطاقة
     */
    createPowerSourceElement(source) {
        const sourceElement = document.createElement('div');
        sourceElement.className = 'tree-node power-source';
        sourceElement.dataset.id = source.id;
        sourceElement.dataset.type = 'powerSource';
        
        // إنشاء رأس العقدة
        const header = document.createElement('div');
        header.className = 'node-header';
        
        // أيقونة مصدر الطاقة
        const icon = document.createElement('i');
        icon.className = 'fas fa-plug me-2';
        header.appendChild(icon);
        
        // اسم مصدر الطاقة
        const name = document.createElement('span');
        name.textContent = source.name;
        header.appendChild(name);
        
        sourceElement.appendChild(header);
        
        // إنشاء محتوى للأبناء
        if (source.children && source.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'node-children';
            
            source.children.forEach(panel => {
                const panelElement = this.createPanelElement(panel);
                childrenContainer.appendChild(panelElement);
            });
            
            sourceElement.appendChild(childrenContainer);
        } else if (source.noChildren) {
            const noChildrenMessage = document.createElement('div');
            noChildrenMessage.className = 'text-muted';
            noChildrenMessage.textContent = 'لا توجد لوحات مرتبطة بهذا المصدر';
            sourceElement.appendChild(noChildrenMessage);
        }
        
        return sourceElement;
    }
    
    /**
     * إنشاء عنصر للوحة
     * @param {Object} panel - بيانات اللوحة
     * @returns {HTMLElement} عنصر DOM للوحة
     */
    createPanelElement(panel) {
        const panelElement = document.createElement('div');
        panelElement.className = `tree-node panel ${panel.panelType}`;
        panelElement.dataset.id = panel.id;
        panelElement.dataset.type = 'panel';
        
        // إنشاء رأس العقدة
        const header = document.createElement('div');
        header.className = 'node-header';
        
        // أيقونة اللوحة حسب النوع
        const icon = document.createElement('i');
        if (panel.panelType === 'main') {
            icon.className = 'fas fa-server me-2';
        } else if (panel.panelType === 'sub_main') {
            icon.className = 'fas fa-network-wired me-2';
        } else {
            icon.className = 'fas fa-microchip me-2';
        }
        header.appendChild(icon);
        
        // اسم اللوحة
        const name = document.createElement('span');
        name.textContent = panel.name;
        header.appendChild(name);
        
        panelElement.appendChild(header);
        
        // إنشاء محتوى للأبناء إذا وجدت
        if (panel.children && panel.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'node-children';
            
            panel.children.forEach(childPanel => {
                const childElement = this.createPanelElement(childPanel);
                childrenContainer.appendChild(childElement);
            });
            
            panelElement.appendChild(childrenContainer);
        }
        
        return panelElement;
    }
    
    /**
     * إضافة مستمعي الأحداث لعناصر الشجرة
     */
    addEventListeners() {
        // إضافة مستمع نقر لرؤوس العقد
        const headers = this.container.querySelectorAll('.node-header');
        headers.forEach(header => {
            // توسيع/طي الأبناء عند النقر
            header.addEventListener('click', (event) => {
                const node = header.parentElement;
                const childrenContainer = node.querySelector('.node-children');
                
                if (childrenContainer) {
                    node.classList.toggle('collapsed');
                }
                
                // استدعاء وظيفة استجابة التحديد إذا وجدت
                if (this.onSelectCallback) {
                    const nodeId = node.dataset.id;
                    const nodeType = node.dataset.type;
                    this.selectedNodeId = nodeId;
                    
                    // وضع حالة التحديد على العنصر وإزالتها من الباقي
                    headers.forEach(h => h.parentElement.classList.remove('selected'));
                    node.classList.add('selected');
                    
                    this.onSelectCallback({
                        id: nodeId,
                        type: nodeType
                    });
                }
                
                event.stopPropagation();
            });
        });
    }
    
    /**
     * تعيين وظيفة الاستجابة لتحديد عنصر
     * @param {Function} callback - وظيفة تستدعى عند تحديد عنصر
     */
    onSelect(callback) {
        this.onSelectCallback = callback;
    }
    
    /**
     * توسيع جميع العقد في الشجرة
     */
    expandAll() {
        const nodes = this.container.querySelectorAll('.tree-node');
        nodes.forEach(node => {
            node.classList.remove('collapsed');
        });
    }
    
    /**
     * طي جميع العقد في الشجرة
     */
    collapseAll() {
        const nodes = this.container.querySelectorAll('.tree-node');
        nodes.forEach(node => {
            if (node.querySelector('.node-children')) {
                node.classList.add('collapsed');
            }
        });
    }
    
    /**
     * عرض تفاصيل العنصر المحدد
     * @param {Object} node - معلومات العقدة المحددة
     */
    async showNodeDetails(node) {
        const detailsTitle = document.getElementById('detailsTitle');
        const detailsContent = document.getElementById('detailsContent');
        
        // استخراج المعرف الرقمي من معرف العقدة
        const id = node.id.split('-')[1];
        
        if (node.type === 'powerSource') {
            // استدعاء API للحصول على تفاصيل مصدر الطاقة
            const response = await NetworkAPI.getPowerSourceById(id);
            
            if (response.success) {
                const powerSource = response.data;
                detailsTitle.innerHTML = `<i class="fas fa-plug text-danger"></i> مصدر الطاقة: ${powerSource.name}`;
                
                // إنشاء جدول التفاصيل
                let tableContent = '<table class="node-details-table w-100">';
                tableContent += `
                    <tr><td>النوع</td><td>${this.typeNames[powerSource.source_type] || powerSource.source_type}</td></tr>
                    <tr><td>الجهد</td><td>${powerSource.voltage}</td></tr>
                    <tr><td>الأمبير الكلي</td><td>${powerSource.total_ampacity || '-'} أمبير</td></tr>
                    <tr><td>مادة الكابل</td><td>${this.typeNames[powerSource.cable_material] || powerSource.cable_material || '-'}</td></tr>
                    <tr><td>مقطع الكابل</td><td>${powerSource.cable_cross_section || '-'} mm²</td></tr>
                    <tr><td>طول الكابل</td><td>${powerSource.cable_length || '-'} متر</td></tr>
                    <tr><td>عدد الكابلات</td><td>${powerSource.cable_quantity || '1'}</td></tr>
                `;
                tableContent += '</table>';
                
                // إضافة روابط للإجراءات
                tableContent += `
                    <div class="mt-3">
                        <a href="/static/power-sources.html#${powerSource.id}" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-edit"></i> تحرير
                        </a>
                        <button class="btn btn-sm btn-outline-success ms-2" onclick="showRelatedPanels('${powerSource.id}')">
                            <i class="fas fa-server"></i> عرض اللوحات المرتبطة
                        </button>
                    </div>
                `;
                
                detailsContent.innerHTML = tableContent;
            }
        } else if (node.type === 'panel') {
            // استدعاء API للحصول على تفاصيل اللوحة
            const response = await NetworkAPI.getPanelById(id);
            
            if (response.success) {
                const panel = response.data;
                const panelTypeNames = {
                    'main': 'لوحة رئيسية',
                    'sub_main': 'لوحة رئيسية فرعية',
                    'sub': 'لوحة فرعية'
                };
                
                detailsTitle.innerHTML = `
                    <i class="fas fa-server text-success"></i> 
                    ${panelTypeNames[panel.panel_type] || 'لوحة'}: ${panel.name}`;
                
                // إنشاء جدول التفاصيل
                let tableContent = '<table class="node-details-table w-100">';
                tableContent += `
                    <tr><td>النوع</td><td>${panelTypeNames[panel.panel_type] || panel.panel_type}</td></tr>
                    <tr><td>الجهد</td><td>${panel.voltage}</td></tr>
                    <tr><td>الأمبير</td><td>${panel.ampacity || '-'} أمبير</td></tr>
                    <tr><td>الموقع</td><td>${panel.location || '-'}</td></tr>
                    <tr><td>مادة الكابل</td><td>${this.typeNames[panel.cable_material] || panel.cable_material || '-'}</td></tr>
                    <tr><td>مقطع الكابل</td><td>${panel.cable_cross_section || '-'} mm²</td></tr>
                    <tr><td>طول الكابل</td><td>${panel.cable_length || '-'} متر</td></tr>
                `;
                
                // إضافة معلومات اللوحة الأم إذا وجدت
                if (panel.parent_panel) {
                    tableContent += `<tr><td>اللوحة الأم</td><td id="parentPanelName">جاري التحميل...</td></tr>`;
                    
                    // استدعاء API للحصول على معلومات اللوحة الأم
                    setTimeout(async () => {
                        const parentResponse = await NetworkAPI.getPanelById(panel.parent_panel);
                        if (parentResponse.success) {
                            const parentElement = document.getElementById('parentPanelName');
                            if (parentElement) {
                                parentElement.textContent = parentResponse.data.name;
                            }
                        }
                    }, 100);
                }
                
                // إضافة معلومات مصدر الطاقة إذا وجد
                if (panel.power_source) {
                    tableContent += `<tr><td>مصدر الطاقة</td><td id="powerSourceName">جاري التحميل...</td></tr>`;
                    
                    // استدعاء API للحصول على معلومات مصدر الطاقة
                    setTimeout(async () => {
                        const sourceResponse = await NetworkAPI.getPowerSourceById(panel.power_source);
                        if (sourceResponse.success) {
                            const sourceElement = document.getElementById('powerSourceName');
                            if (sourceElement) {
                                sourceElement.textContent = sourceResponse.data.name;
                            }
                        }
                    }, 100);
                }
                
                tableContent += '</table>';
                
                // إضافة روابط للإجراءات
                tableContent += `
                    <div class="mt-3">
                        <a href="/static/panels.html#${panel.id}" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-edit"></i> تحرير
                        </a>
                        <button class="btn btn-sm btn-outline-warning ms-2" onclick="showPanelBreakers('${panel.id}')">
                            <i class="fas fa-toggle-on"></i> عرض القواطع
                        </button>
                        <button class="btn btn-sm btn-outline-success ms-2" onclick="showChildPanels('${panel.id}')">
                            <i class="fas fa-sitemap"></i> عرض اللوحات الفرعية
                        </button>
                    </div>
                `;
                
                detailsContent.innerHTML = tableContent;
            }
        }
    }
    
    /**
     * تحميل وعرض الشجرة
     * @returns {Promise} وعد يتم حله عند اكتمال العملية
     */
    async visualize() {
        await this.loadPanelsData();
        this.renderTree();
        return true;
    }
}

/**
 * عرض اللوحات المرتبطة بمصدر طاقة معين
 * @param {string} powerSourceId - معرف مصدر الطاقة
 */
async function showRelatedPanels(powerSourceId) {
    try {
        const response = await NetworkAPI.getPanelsByPowerSource(powerSourceId);
        if (response.success) {
            const panels = response.data;
            
            // عرض رسالة إذا لم تكن هناك لوحات
            if (panels.length === 0) {
                alert('لا توجد لوحات مرتبطة بمصدر الطاقة هذا');
                return;
            }
            
            // إنشاء قائمة اللوحات
            let panelsList = '<ul class="list-group">';
            panels.forEach(panel => {
                const panelTypes = {
                    'main': 'لوحة رئيسية',
                    'sub_main': 'لوحة رئيسية فرعية',
                    'sub': 'لوحة فرعية'
                };
                
                // إنشاء شارة للنوع
                const badgeClass = panel.panel_type === 'main' ? 'badge-main' : 
                                 panel.panel_type === 'sub_main' ? 'badge-sub_main' : 'badge-sub';
                
                panelsList += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${panel.name}
                        <span class="type-badge ${badgeClass}">
                            ${panelTypes[panel.panel_type] || panel.panel_type}
                        </span>
                    </li>
                `;
            });
            panelsList += '</ul>';
            
            // إضافة العنوان للتفاصيل
            const detailsTitle = document.getElementById('detailsTitle');
            const detailsContent = document.getElementById('detailsContent');
            
            detailsTitle.innerHTML = `<i class="fas fa-server text-success"></i> اللوحات المرتبطة (${panels.length})`;
            detailsContent.innerHTML = panelsList;
        }
    } catch (error) {
        console.error('خطأ في جلب اللوحات المرتبطة:', error);
        alert('حدث خطأ أثناء جلب اللوحات المرتبطة');
    }
}

/**
 * عرض القواطع المرتبطة بلوحة معينة
 * @param {string} panelId - معرف اللوحة
 */
async function showPanelBreakers(panelId) {
    try {
        const response = await NetworkAPI.getPanelBreakers(panelId);
        if (response.success) {
            const breakers = response.data;
            
            // عرض رسالة إذا لم تكن هناك قواطع
            if (breakers.length === 0) {
                alert('لا توجد قواطع في هذه اللوحة');
                return;
            }
            
            // إنشاء قائمة القواطع
            let breakersList = '<ul class="list-group">';
            breakers.forEach(breaker => {
                breakersList += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${breaker.name || `قاطع ${breaker.id}`}
                        <span class="badge bg-warning text-dark">${breaker.rated_current || '-'} أمبير</span>
                    </li>
                `;
            });
            breakersList += '</ul>';
            
            // إضافة العنوان للتفاصيل
            const detailsTitle = document.getElementById('detailsTitle');
            const detailsContent = document.getElementById('detailsContent');
            
            detailsTitle.innerHTML = `<i class="fas fa-toggle-on text-warning"></i> القواطع في اللوحة (${breakers.length})`;
            detailsContent.innerHTML = breakersList;
        }
    } catch (error) {
        console.error('خطأ في جلب القواطع:', error);
        alert('حدث خطأ أثناء جلب القواطع');
    }
}

/**
 * عرض اللوحات الفرعية للوحة معينة
 * @param {string} panelId - معرف اللوحة
 */
async function showChildPanels(panelId) {
    try {
        const response = await NetworkAPI.getChildPanels(panelId);
        if (response.success) {
            const childPanels = response.data;
            
            // عرض رسالة إذا لم تكن هناك لوحات فرعية
            if (childPanels.length === 0) {
                alert('لا توجد لوحات فرعية لهذه اللوحة');
                return;
            }
            
            // إنشاء قائمة اللوحات الفرعية
            let panelsList = '<ul class="list-group">';
            childPanels.forEach(panel => {
                const panelTypes = {
                    'main': 'لوحة رئيسية',
                    'sub_main': 'لوحة رئيسية فرعية',
                    'sub': 'لوحة فرعية'
                };
                
                // إنشاء شارة للنوع
                const badgeClass = panel.panel_type === 'main' ? 'badge-main' : 
                                 panel.panel_type === 'sub_main' ? 'badge-sub_main' : 'badge-sub';
                
                panelsList += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${panel.name}
                        <span class="type-badge ${badgeClass}">
                            ${panelTypes[panel.panel_type] || panel.panel_type}
                        </span>
                    </li>
                `;
            });
            panelsList += '</ul>';
            
            // إضافة العنوان للتفاصيل
            const detailsTitle = document.getElementById('detailsTitle');
            const detailsContent = document.getElementById('detailsContent');
            
            detailsTitle.innerHTML = `<i class="fas fa-sitemap text-success"></i> اللوحات الفرعية (${childPanels.length})`;
            detailsContent.innerHTML = panelsList;
        }
    } catch (error) {
        console.error('خطأ في جلب اللوحات الفرعية:', error);
        alert('حدث خطأ أثناء جلب اللوحات الفرعية');
    }
}

// تصدير الدوال للاستخدام العالمي
window.showRelatedPanels = showRelatedPanels;
window.showPanelBreakers = showPanelBreakers;
window.showChildPanels = showChildPanels;

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // إخفاء مؤشر التحميل بعد اكتمال التحميل
        const hideLoading = () => {
            document.getElementById('loadingIndicator').style.display = 'none';
        };
        
        // إنشاء كائن عارض شجرة اللوحات
        const panelTree = new PanelTreeVisualizer('panelTreeContainer');
        
        // تعيين معالج حدث تحديد عنصر
        panelTree.onSelect(async (node) => {
            await panelTree.showNodeDetails(node);
        });
        
        // تحميل وعرض الشجرة
        await panelTree.visualize();
        
        // إضافة معالجات أحداث لأزرار توسيع وطي الشجرة
        document.getElementById('btnExpandAll').addEventListener('click', () => {
            panelTree.expandAll();
        });
        
        document.getElementById('btnCollapseAll').addEventListener('click', () => {
            panelTree.collapseAll();
        });
        
        // إخفاء مؤشر التحميل
        hideLoading();
    } catch (error) {
        console.error('حدث خطأ أثناء تهيئة الصفحة:', error);
        document.getElementById('loadingIndicator').style.display = 'none';
        alert('حدث خطأ أثناء تحميل بيانات اللوحات. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    }
});