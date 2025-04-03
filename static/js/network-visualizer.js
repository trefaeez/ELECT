/**
 * ملف JavaScript للتعامل مع عرض الشبكة التفاعلية
 * هذا الملف يوفر واجهة بديلة لمكتبة ReactFlow 
 * ويسمح بعرض مخطط الشبكة الكهربائية بشكل تفاعلي
 */

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('تم تحميل ملف network-visualizer.js المحلي بنجاح');
    
    // تهيئة التطبيق عند تحميل جميع المكتبات
    initNetworkVisualizer();
});

/**
 * تهيئة مكونات المخطط التفاعلي
 */
function initNetworkVisualizer() {
    // التحقق من وجود المكتبات المطلوبة
    if (typeof React === 'undefined') {
        console.error('مكتبة React غير محملة!');
        displayErrorMessage('مكتبة React غير محملة. يرجى التأكد من تحميل جميع المكتبات المطلوبة.');
        return;
    }
    
    if (typeof ReactDOM === 'undefined') {
        console.error('مكتبة ReactDOM غير محملة!');
        displayErrorMessage('مكتبة ReactDOM غير محملة. يرجى التأكد من تحميل جميع المكتبات المطلوبة.');
        return;
    }
    
    // إذا كانت مكتبة ReactFlow غير محملة، استخدم البديل المبسط
    if (typeof window.ReactFlow === 'undefined') {
        console.warn('مكتبة ReactFlow غير محملة، سيتم استخدام البديل المبسط');
        initSimpleNetworkGraph();
        return;
    }
}

/**
 * عرض رسالة خطأ في الواجهة
 * @param {string} message - نص رسالة الخطأ
 */
function displayErrorMessage(message) {
    const container = document.getElementById('networkContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger text-center p-4 m-3';
    errorDiv.innerHTML = `
        <h4><i class="fas fa-exclamation-circle"></i> خطأ</h4>
        <p>${message}</p>
        <p class="mt-3">
            <button onclick="location.reload()" class="btn btn-outline-danger">
                <i class="fas fa-sync"></i> إعادة تحميل الصفحة
            </button>
        </p>
    `;
    
    // إضافة رسالة الخطأ إلى الحاوية
    container.appendChild(errorDiv);
}

/**
 * تهيئة عرض الشبكة المبسط باستخدام SVG
 * هذه الوظيفة تستخدم كبديل عندما لا تتوفر مكتبة ReactFlow
 */
function initSimpleNetworkGraph() {
    const container = document.getElementById('networkContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
    
    // إنشاء عنصر SVG للرسم البياني
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.backgroundColor = '#f8f8f8';
    
    // إضافة SVG إلى الحاوية
    container.appendChild(svg);
    
    // إضافة مجموعة للحواف وأخرى للعقد
    const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgesGroup.setAttribute('class', 'edges');
    
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.setAttribute('class', 'nodes');
    
    svg.appendChild(edgesGroup);
    svg.appendChild(nodesGroup);
    
    // تحميل بيانات الشبكة
    loadNetworkData().then(data => {
        if (data) {
            // رسم الشبكة
            renderNetwork(nodesGroup, edgesGroup, networkData);
            
            // تطبيق الفلتر الافتراضي لإخفاء القواطع عند بدء التشغيل
            hideAllBreakers();
            
            // إنشاء الروابط المباشرة بين اللوحات والأحمال
            updateDirectPanelToLoadConnections();
            
            // إضافة التفاعلية
            setupInteractivity(svg, nodesGroup, edgesGroup);
            
            // ربط أزرار التحكم
            setupControlButtons(svg, nodesGroup, edgesGroup);
            
            // إخفاء مؤشر التحميل
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        }
    }).catch(error => {
        console.error('خطأ في تحميل بيانات الشبكة:', error);
        displayErrorMessage('حدث خطأ أثناء تحميل بيانات الشبكة. يرجى المحاولة مرة أخرى.');
    });
}

/**
 * إخفاء جميع القواطع عند بدء تشغيل المخطط
 */
function hideAllBreakers() {
    // إخفاء القواطع
    networkData.nodes.forEach(node => {
        if (node.data.entityType === 'circuitBreaker') {
            const breakerElement = document.getElementById(node.id);
            if (breakerElement) {
                breakerElement.style.display = 'none';
            }
        }
    });
    
    // إخفاء الروابط بين اللوحات والقواطع
    networkData.edges.forEach(edge => {
        if (edge.source.startsWith('panel-') && edge.target.startsWith('breaker-')) {
            const edgeElement = document.getElementById(edge.id);
            if (edgeElement) {
                edgeElement.style.display = 'none';
            }
        }
        
        // إخفاء الروابط بين القواطع والأحمال أيضاً
        if (edge.source.startsWith('breaker-') && edge.target.startsWith('load-')) {
            const edgeElement = document.getElementById(edge.id);
            if (edgeElement) {
                edgeElement.style.display = 'none';
            }
        }
    });
}

/**
 * رسم الشبكة باستخدام SVG
 * @param {SVGElement} nodesGroup - مجموعة العقد
 * @param {SVGElement} edgesGroup - مجموعة الحواف
 * @param {Object} data - بيانات الشبكة
 */
function renderNetwork(nodesGroup, edgesGroup, data) {
    // رسم الحواف أولاً
    data.edges.forEach(edge => {
        const sourceNode = data.nodes.find(node => node.id === edge.source);
        const targetNode = data.nodes.find(node => node.id === edge.target);
        
        if (!sourceNode || !targetNode) return;
        
        // الحصول على الإحداثيات
        const sourceX = sourceNode.position.x + 75; // وسط العقدة
        const sourceY = sourceNode.position.y + 20;
        const targetX = targetNode.position.x + 75;
        const targetY = targetNode.position.y + 20;
        
        // إنشاء منحنى بيزير بسيط
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('id', edge.id);
        path.setAttribute('stroke', edge.style.stroke || '#888');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        
        // إذا كان منقطاً
        if (edge.style.strokeDasharray) {
            path.setAttribute('stroke-dasharray', edge.style.strokeDasharray);
        }
        
        // حساب منحنى المسار
        const dx = Math.abs(targetX - sourceX) * 0.3;
        const pathData = `M ${sourceX} ${sourceY} C ${sourceX + dx} ${sourceY}, ${targetX - dx} ${targetY}, ${targetX} ${targetY}`;
        path.setAttribute('d', pathData);
        
        edgesGroup.appendChild(path);
        
        // إضافة اسم الحافة إذا وجد
        if (edge.label) {
            const midX = (sourceX + targetX) / 2;
            const midY = (sourceY + targetY) / 2 - 10;
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', midX);
            text.setAttribute('y', midY);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '12');
            text.textContent = edge.label;
            
            edgesGroup.appendChild(text);
        }
    });
    
    // رسم العقد
    data.nodes.forEach(node => {
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.setAttribute('id', node.id);
        nodeGroup.setAttribute('class', `node ${node.data.entityType}`);
        nodeGroup.setAttribute('transform', `translate(${node.position.x}, ${node.position.y})`);
        
        // إنشاء المستطيل الخاص بالعقدة
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', node.style.width || '150');
        rect.setAttribute('height', '40');
        rect.setAttribute('rx', '5');
        rect.setAttribute('ry', '5');
        rect.setAttribute('fill', node.style.background || '#999');
        rect.setAttribute('stroke', node.style.border || '#222138');
        rect.setAttribute('stroke-width', '1');
        
        // إنشاء نص العقدة
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', (node.style.width / 2) || '75');
        text.setAttribute('y', '20');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', node.style.color || 'white');
        text.setAttribute('font-family', 'Arial');
        text.setAttribute('font-size', '14');
        text.textContent = node.data.label;
        
        // إضافة العناصر إلى مجموعة العقدة
        nodeGroup.appendChild(rect);
        nodeGroup.appendChild(text);
        
        // إضافة معالج الحدث عند النقر على العقدة
        nodeGroup.addEventListener('click', () => handleNodeClick(node));
        
        // إضافة العقدة إلى مجموعة العقد
        nodesGroup.appendChild(nodeGroup);
    });
}

/**
 * إضافة التفاعلية للمخطط
 * @param {SVGElement} svg - عنصر SVG الرئيسي
 * @param {SVGElement} nodesGroup - مجموعة العقد
 * @param {SVGElement} edgesGroup - مجموعة الحواف
 */
function setupInteractivity(svg, nodesGroup, edgesGroup) {
    let dragging = false;
    let panStartX, panStartY;
    let translateX = 0, translateY = 0;
    let scale = 1;
    
    // تحديث التحويل
    const updateTransform = () => {
        nodesGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
        edgesGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
    };
    
    // معالجة بدء التحريك
    svg.addEventListener('mousedown', (event) => {
        if (event.target === svg) {
            dragging = true;
            panStartX = event.clientX - translateX;
            panStartY = event.clientY - translateY;
            svg.style.cursor = 'grabbing';
        }
    });
    
    // معالجة التحريك
    window.addEventListener('mousemove', (event) => {
        if (!dragging) return;
        
        translateX = event.clientX - panStartX;
        translateY = event.clientY - panStartY;
        updateTransform();
    });
    
    // معالجة نهاية التحريك
    window.addEventListener('mouseup', () => {
        dragging = false;
        svg.style.cursor = 'default';
    });
    
    // معالجة التكبير/التصغير
    svg.addEventListener('wheel', (event) => {
        event.preventDefault();
        
        const delta = event.deltaY < 0 ? 1.1 : 0.9;
        scale *= delta;
        
        // تقييد التكبير
        scale = Math.max(0.2, Math.min(2, scale));
        
        updateTransform();
    });
}

/**
 * ربط أزرار التحكم بالتكبير والتصغير
 * @param {SVGElement} svg - عنصر SVG الرئيسي
 * @param {SVGElement} nodesGroup - مجموعة العقد
 * @param {SVGElement} edgesGroup - مجموعة الحواف
 */
function setupControlButtons(svg, nodesGroup, edgesGroup) {
    let translateX = 0, translateY = 0;
    let scale = 1;
    
    // تحديث التحويل
    const updateTransform = () => {
        nodesGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
        edgesGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
    };
    
    // زر التكبير
    document.getElementById('btnZoomIn').addEventListener('click', () => {
        scale *= 1.1;
        scale = Math.min(2, scale);
        updateTransform();
    });
    
    // زر التصغير
    document.getElementById('btnZoomOut').addEventListener('click', () => {
        scale *= 0.9;
        scale = Math.max(0.2, scale);
        updateTransform();
    });
    
    // زر إعادة الضبط
    document.getElementById('btnResetView').addEventListener('click', () => {
        translateX = 0;
        translateY = 0;
        scale = 1;
        updateTransform();
    });
    
    // زر ملاءمة العرض
    document.getElementById('btnFitView').addEventListener('click', () => {
        translateX = 0;
        translateY = 0;
        scale = 1;
        updateTransform();
    });
    
    // زر تصدير الصورة
    document.getElementById('btnExportImage').addEventListener('click', exportAsImage);
    
    // فلاتر العرض
    document.getElementById('showPowerSources').addEventListener('change', () => applyFilters(nodesGroup, edgesGroup));
    document.getElementById('showPanels').addEventListener('change', () => applyFilters(nodesGroup, edgesGroup));
    document.getElementById('showBreakers').addEventListener('change', () => applyFilters(nodesGroup, edgesGroup));
    document.getElementById('showLoads').addEventListener('change', () => applyFilters(nodesGroup, edgesGroup));
}

// تعريف مجموعة العناصر النشطة (المحددة) في المخطط
let activeElements = new Set();
let activePaths = []; // مسارات التغذية والأحمال النشطة

/**
 * معالجة النقر على العقدة
 * @param {Object} node - بيانات العقدة
 */
function handleNodeClick(node) {
    const detailsTitle = document.getElementById('detailsTitle');
    const detailsContent = document.getElementById('detailsContent');
    
    // تمييز العقدة المحددة
    highlightNode(node.id);
    
    // إضافة أو إزالة العنصر من العناصر النشطة
    if (activeElements.has(node.id)) {
        activeElements.delete(node.id);
        if (node.data.entityType === 'panel') {
            // إخفاء القواطع المرتبطة عند إلغاء تحديد اللوحة
            hideRelatedBreakers(node.id);
        }
    } else {
        activeElements.add(node.id);
        if (node.data.entityType === 'panel') {
            // إظهار القواطع المرتبطة عند تحديد اللوحة
            showRelatedBreakers(node.id);
        } else if (node.data.entityType === 'circuitBreaker') {
            // إظهار الأحمال المرتبطة عند تحديد القاطع
            showRelatedLoads(node.id);
        }
    }
    
    // إضاءة مسارات التغذية للعنصر
    highlightPowerPath(node.id);
    
    // عرض التفاصيل
    const nodeType = node.data.entityType;
    const nodeData = node.data.sourceData;
    
    // تحديد العنوان حسب نوع العنصر
    const nodeTypeName = typeNames[nodeType] || nodeType;
    detailsTitle.innerHTML = `<i class="fas fa-info-circle"></i> ${nodeTypeName}: ${node.data.label}`;
    
    // إنشاء جدول لعرض التفاصيل
    let tableContent = '<table class="node-details-table w-100">';
    
    switch (nodeType) {
        case 'powerSource':
            tableContent += `
                <tr><td>النوع</td><td>${typeNames[nodeData.source_type] || nodeData.source_type}</td></tr>
                <tr><td>الجهد</td><td>${nodeData.voltage}</td></tr>
                <tr><td>الأمبير الكلي</td><td>${nodeData.total_ampacity || '-'} أمبير</td></tr>
                <tr><td>مادة الكابل</td><td>${typeNames[nodeData.cable_material] || nodeData.cable_material || '-'}</td></tr>
                <tr><td>مقطع الكابل</td><td>${nodeData.cable_cross_section || '-'} mm²</td></tr>
                <tr><td>طول الكابل</td><td>${nodeData.cable_length || '-'} متر</td></tr>
                <tr><td>عدد الكابلات</td><td>${nodeData.cable_quantity || '1'}</td></tr>
            `;
            break;
            
        case 'panel':
            tableContent += `
                <tr><td>النوع</td><td>${typeNames[nodeData.panel_type] || nodeData.panel_type}</td></tr>
                <tr><td>الجهد</td><td>${nodeData.voltage}</td></tr>
                <tr><td>الأمبير</td><td>${nodeData.ampacity || '-'} أمبير</td></tr>
                <tr><td>الموقع</td><td>${nodeData.location || '-'}</td></tr>
                <tr><td>مادة الكابل</td><td>${typeNames[nodeData.cable_material] || nodeData.cable_material || '-'}</td></tr>
                <tr><td>مقطع الكابل</td><td>${nodeData.cable_cross_section || '-'} mm²</td></tr>
                <tr><td>طول الكابل</td><td>${nodeData.cable_length || '-'} متر</td></tr>
            `;
            break;
            
        case 'circuitBreaker':
            tableContent += `
                <tr><td>النوع</td><td>${nodeData.breaker_type || '-'}</td></tr>
                <tr><td>الأمبير المقنن</td><td>${nodeData.rated_current || '-'} أمبير</td></tr>
                <tr><td>عدد الأقطاب</td><td>${nodeData.number_of_poles || '-'}</td></tr>
                <tr><td>الدور</td><td>${typeNames[nodeData.role] || nodeData.role || '-'}</td></tr>
                <tr><td>مادة الكابل</td><td>${typeNames[nodeData.cable_material] || nodeData.cable_material || '-'}</td></tr>
                <tr><td>مقطع الكابل</td><td>${nodeData.cable_cross_section || '-'} mm²</td></tr>
                <tr><td>طول الكابل</td><td>${nodeData.cable_length || '-'} متر</td></tr>
            `;
            break;
            
        case 'load':
            tableContent += `
                <tr><td>نوع الحمل</td><td>${nodeData.load_type || '-'}</td></tr>
                <tr><td>الأمبير</td><td>${nodeData.ampacity || '-'} أمبير</td></tr>
                <tr><td>معامل القدرة</td><td>${nodeData.power_factor || '-'}</td></tr>
                <tr><td>ساعات الاستخدام</td><td>${nodeData.estimated_usage_hours || '-'} ساعة/يوم</td></tr>
                <tr><td>الوصف</td><td>${nodeData.description || '-'}</td></tr>
            `;
            break;
    }
    
    tableContent += '</table>';
    
    // إضافة جدول المسار إذا كان هناك مسار نشط
    if (activePaths.length > 0) {
        tableContent += generatePathTable();
    }
    
    // إضافة زر للانتقال إلى صفحة تفاصيل العنصر
    const entityUrlPath = nodeType === 'powerSource' ? 'power-sources' : 
                         nodeType === 'panel' ? 'panels' : 
                         nodeType === 'circuitBreaker' ? 'breakers' : 'loads';
    
    const entityId = nodeData.id;
    
    tableContent += `
        <div class="mt-3">
            <a href="/static/${entityUrlPath}.html#${entityId}" class="btn btn-sm btn-primary">
                <i class="fas fa-edit"></i> تحرير
            </a>
            <button class="btn btn-sm btn-info ms-2" onclick="showConnections('${node.id}')">
                <i class="fas fa-project-diagram"></i> إظهار الاتصالات
            </button>
        </div>
    `;
    
    detailsContent.innerHTML = tableContent;
}

/**
 * تمييز العقدة المحددة
 * @param {string} nodeId - معرف العقدة
 */
function highlightNode(nodeId) {
    // إزالة التمييز من جميع العقد
    document.querySelectorAll('.node rect').forEach(rect => {
        rect.setAttribute('stroke-width', '1');
    });
    
    // تمييز العقدة المحددة
    const selectedNode = document.querySelector(`#${nodeId} rect`);
    if (selectedNode) {
        selectedNode.setAttribute('stroke-width', '3');
    }
}

/**
 * إظهار اتصالات العقدة المحددة
 * @param {string} nodeId - معرف العقدة
 */
function showConnections(nodeId) {
    // تحديد الحواف المتصلة بالعقدة
    const connectedEdges = networkData.edges.filter(edge => 
        edge.source === nodeId || edge.target === nodeId
    ).map(edge => edge.id);
    
    // إعادة ضبط جميع الحواف
    document.querySelectorAll('.edges path').forEach(path => {
        path.setAttribute('stroke-width', '2');
        path.setAttribute('opacity', '0.3');
    });
    
    // تمييز الحواف المتصلة
    connectedEdges.forEach(edgeId => {
        const edgeElement = document.getElementById(edgeId);
        if (edgeElement) {
            edgeElement.setAttribute('stroke-width', '4');
            edgeElement.setAttribute('opacity', '1');
        }
    });
    
    // إعادة الحواف إلى الحالة الطبيعية بعد ثوان
    setTimeout(() => {
        document.querySelectorAll('.edges path').forEach(path => {
            path.setAttribute('stroke-width', '2');
            path.setAttribute('opacity', '1');
        });
    }, 3000);
}

/**
 * تطبيق فلاتر العرض على المخطط
 * @param {SVGElement} nodesGroup - مجموعة العقد
 * @param {SVGElement} edgesGroup - مجموعة الحواف
 */
function applyFilters(nodesGroup, edgesGroup) {
    const showPowerSources = document.getElementById('showPowerSources').checked;
    const showPanels = document.getElementById('showPanels').checked;
    const showBreakers = document.getElementById('showBreakers').checked;
    const showLoads = document.getElementById('showLoads').checked;
    
    // تطبيق الفلاتر على العقد
    networkData.nodes.forEach(node => {
        const nodeElement = document.getElementById(node.id);
        if (!nodeElement) return;
        
        if (node.data.entityType === 'powerSource' && !showPowerSources) {
            nodeElement.style.display = 'none';
        } else if (node.data.entityType === 'panel' && !showPanels) {
            nodeElement.style.display = 'none';
        } else if (node.data.entityType === 'circuitBreaker') {
            // إخفاء القواطع افتراضياً (ستظهر فقط عند النقر على اللوحة)
            if (!showBreakers || !isPanelExpanded(getParentPanelId(node.id))) {
                nodeElement.style.display = 'none';
            } else {
                nodeElement.style.display = 'block';
            }
        } else if (node.data.entityType === 'load') {
            // عرض الأحمال افتراضياً
            if (!showLoads) {
                nodeElement.style.display = 'none';
            } else {
                nodeElement.style.display = 'block';
            }
        } else {
            nodeElement.style.display = 'block';
        }
    });
    
    // تحديث الروابط المباشرة بين اللوحات والأحمال
    updateDirectPanelToLoadConnections();
    
    // تحديد العقد المرئية
    const visibleNodeIds = networkData.nodes
        .filter(node => {
            if (node.data.entityType === 'powerSource' && !showPowerSources) return false;
            if (node.data.entityType === 'panel' && !showPanels) return false;
            if (node.data.entityType === 'circuitBreaker' && (!showBreakers || !isPanelExpanded(getParentPanelId(node.id)))) return false;
            if (node.data.entityType === 'load' && !showLoads) return false;
            return true;
        })
        .map(node => node.id);
    
    // تطبيق الفلاتر على الحواف
    networkData.edges.forEach(edge => {
        const edgeElement = document.getElementById(edge.id);
        if (!edgeElement) return;
        
        // عرض الحواف الأصلية فقط إذا كانت نقاط البداية والنهاية مرئية
        if (visibleNodeIds.includes(edge.source) && visibleNodeIds.includes(edge.target)) {
            edgeElement.style.display = 'block';
        } else {
            edgeElement.style.display = 'none';
        }
    });
    
    // عرض الروابط المباشرة بين اللوحات والأحمال
    document.querySelectorAll('.direct-panel-load-edge').forEach(edge => {
        const [panelId, loadId] = edge.id.split('-to-');
        const panelVisible = visibleNodeIds.includes(panelId);
        const loadVisible = visibleNodeIds.includes(loadId);
        const panelExpanded = isPanelExpanded(panelId);
        
        // إذا كانت اللوحة موسعة، نخفي الرابط المباشر ونظهر القواطع والروابط العادية
        if (panelVisible && loadVisible && !panelExpanded) {
            edge.style.display = 'block';
        } else {
            edge.style.display = 'none';
        }
    });
}

/**
 * تحديث الروابط المباشرة بين اللوحات والأحمال
 * إنشاء روابط افتراضية مباشرة من اللوحات إلى الأحمال لعرضها عندما تكون القواطع مخفية
 */
function updateDirectPanelToLoadConnections() {
    // إزالة جميع الروابط المباشرة السابقة
    document.querySelectorAll('.direct-panel-load-edge').forEach(edge => {
        edge.remove();
    });
    
    // مجموعة الروابط المباشرة من اللوحات إلى الأحمال
    const directConnections = [];
    
    // البحث عن جميع الأحمال وإنشاء روابط مباشرة إلى اللوحة الأم
    networkData.nodes.forEach(node => {
        if (node.data.entityType === 'load') {
            // البحث عن القاطع المرتبط بالحمل
            const breakerEdge = networkData.edges.find(edge => 
                edge.target === node.id && edge.source.startsWith('breaker-')
            );
            
            if (breakerEdge) {
                const breakerId = breakerEdge.source;
                
                // البحث عن اللوحة المرتبطة بهذا القاطع
                const panelEdge = networkData.edges.find(edge => 
                    edge.target === breakerId && edge.source.startsWith('panel-')
                );
                
                if (panelEdge) {
                    const panelId = panelEdge.source;
                    
                    // إنشاء رابط مباشر
                    directConnections.push({
                        panelId: panelId,
                        loadId: node.id,
                        loadName: node.data.label
                    });
                }
            }
        }
    });
    
    // إضافة الروابط المباشرة إلى المخطط
    const edgesGroup = document.querySelector('.edges');
    if (!edgesGroup) return;
    
    directConnections.forEach(conn => {
        const panelNode = networkData.nodes.find(n => n.id === conn.panelId);
        const loadNode = networkData.nodes.find(n => n.id === conn.loadId);
        
        if (panelNode && loadNode) {
            // حساب الإحداثيات
            const sourceX = panelNode.position.x + 75; // وسط العقدة
            const sourceY = panelNode.position.y + 20;
            const targetX = loadNode.position.x + 75;
            const targetY = loadNode.position.y + 20;
            
            // إنشاء مسار بيزير
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('id', `${conn.panelId}-to-${conn.loadId}`);
            path.setAttribute('class', 'direct-panel-load-edge');
            path.setAttribute('stroke', typeColors.load);
            path.setAttribute('stroke-width', '1.5');
            path.setAttribute('stroke-dasharray', '5,3');
            path.setAttribute('fill', 'none');
            
            // حساب منحنى المسار
            const dx = Math.abs(targetX - sourceX) * 0.3;
            const pathData = `M ${sourceX} ${sourceY} C ${sourceX + dx} ${sourceY}, ${targetX - dx} ${targetY}, ${targetX} ${targetY}`;
            path.setAttribute('d', pathData);
            
            // إضافة المسار
            edgesGroup.appendChild(path);
            
            // إضافة اسم الحمل كتلميح
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('class', 'direct-panel-load-edge');
            text.setAttribute('x', (sourceX + targetX) / 2);
            text.setAttribute('y', (sourceY + targetY) / 2 - 5);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', typeColors.load);
            text.textContent = conn.loadName;
            
            edgesGroup.appendChild(text);
        }
    });
}

/**
 * التحقق مما إذا كانت اللوحة موسعة (تم النقر عليها)
 * @param {string} panelId - معرف اللوحة
 * @returns {boolean} ما إذا كانت اللوحة موسعة
 */
function isPanelExpanded(panelId) {
    return activeElements.has(panelId);
}

/**
 * الحصول على معرف اللوحة الأم للقاطع
 * @param {string} breakerId - معرف القاطع
 * @returns {string} معرف اللوحة الأم أو null إذا لم تكن موجودة
 */
function getParentPanelId(breakerId) {
    // البحث عن الحافة الواصلة للقاطع
    const parentEdge = networkData.edges.find(edge => 
        edge.target === breakerId && edge.source.startsWith('panel-')
    );
    
    return parentEdge ? parentEdge.source : null;
}

/**
 * تصدير المخطط كصورة
 */
function exportAsImage() {
    if (typeof html2canvas === 'undefined') {
        alert('لم يتم تحميل مكتبة html2canvas');
        return;
    }
    
    const container = document.getElementById('networkContainer');
    
    html2canvas(container).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = 'network-diagram.png';
        link.href = imgData;
        link.click();
    }).catch(error => {
        console.error('خطأ في تصدير الصورة:', error);
        alert('حدث خطأ أثناء تصدير الصورة');
    });
}

/**
 * إظهار القواطع المرتبطة باللوحة عند النقر عليها
 * @param {string} panelId - معرف اللوحة
 */
function showRelatedBreakers(panelId) {
    // البحث عن جميع القواطع المتصلة باللوحة المحددة
    const relatedEdges = networkData.edges.filter(edge => 
        edge.source === panelId && edge.target.startsWith('breaker-')
    );
    
    // إظهار القواطع المرتبطة
    relatedEdges.forEach(edge => {
        const breakerId = edge.target;
        const breakerElement = document.getElementById(breakerId);
        
        if (breakerElement) {
            breakerElement.style.display = 'block';
            
            // إظهار الحافة من اللوحة إلى القاطع
            const edgeElement = document.getElementById(edge.id);
            if (edgeElement) {
                edgeElement.style.display = 'block';
            }
            
            // إضافة تأثير مرئي للإشارة إلى أن اللوحة منبثقة
            const rect = breakerElement.querySelector('rect');
            if (rect) {
                // حفظ اللون الأصلي
                rect.dataset.originalFill = rect.getAttribute('fill');
                // تغيير لون الخلفية مؤقتاً
                rect.setAttribute('fill', '#ffc107');
                // إضافة تأثير وميض
                animateBreakerAppearance(rect);
            }
            
            // إظهار الروابط من القاطع إلى الأحمال المرتبطة به
            const breakerToLoadEdges = networkData.edges.filter(e => 
                e.source === breakerId && e.target.startsWith('load-')
            );
            
            breakerToLoadEdges.forEach(loadEdge => {
                const loadEdgeElement = document.getElementById(loadEdge.id);
                if (loadEdgeElement) {
                    loadEdgeElement.style.display = 'block';
                }
                
                // نحتفظ بالأحمال ظاهرة ولكن نخفي الروابط المباشرة من اللوحة إلى الأحمال
                const loadId = loadEdge.target;
                const directEdge = document.getElementById(`${panelId}-to-${loadId}`);
                if (directEdge) {
                    directEdge.style.display = 'none';
                }
                
                // ونخفي أيضاً نص التلميح المرتبط بالرابط المباشر
                document.querySelectorAll(`.direct-panel-load-edge[id="${panelId}-to-${loadId}-text"]`).forEach(text => {
                    text.style.display = 'none';
                });
            });
        }
    });
    
    applyFilters(
        document.querySelector('.nodes'), 
        document.querySelector('.edges')
    );
}

/**
 * إظهار الأحمال المرتبطة بالقاطع عند النقر عليه
 * @param {string} breakerId - معرف القاطع
 */
function showRelatedLoads(breakerId) {
    // البحث عن جميع الأحمال المتصلة بالقاطع المحدد
    const relatedEdges = networkData.edges.filter(edge => 
        edge.source === breakerId && edge.target.startsWith('load-')
    );
    
    // إظهار الأحمال المرتبطة
    relatedEdges.forEach(edge => {
        const loadId = edge.target;
        const loadElement = document.getElementById(loadId);
        
        if (loadElement) {
            loadElement.style.display = 'block';
            
            // إضافة تأثير مرئي
            const rect = loadElement.querySelector('rect');
            if (rect) {
                rect.dataset.originalFill = rect.getAttribute('fill');
                rect.setAttribute('fill', '#0d6efd');
                animateLoadAppearance(rect);
            }
        }
    });
    
    applyFilters(
        document.querySelector('.nodes'), 
        document.querySelector('.edges')
    );
}

/**
 * إخفاء القواطع المرتبطة باللوحة عند إلغاء تحديدها
 * @param {string} panelId - معرف اللوحة
 */
function hideRelatedBreakers(panelId) {
    // البحث عن جميع القواطع المتصلة باللوحة
    const relatedEdges = networkData.edges.filter(edge => 
        edge.source === panelId && edge.target.startsWith('breaker-')
    );
    
    // إخفاء القواطع فقط وإعادة إظهار الروابط المباشرة
    relatedEdges.forEach(edge => {
        const breakerId = edge.target;
        const breakerElement = document.getElementById(breakerId);
        
        if (breakerElement) {
            // استعادة اللون الأصلي للقاطع إذا كان محفوظاً
            const rect = breakerElement.querySelector('rect');
            if (rect && rect.dataset.originalFill) {
                rect.setAttribute('fill', rect.dataset.originalFill);
            }
            
            // إخفاء القاطع وحافته الواصلة من اللوحة
            breakerElement.style.display = 'none';
            
            // إخفاء الحافة من اللوحة إلى القاطع
            const edgeElement = document.getElementById(edge.id);
            if (edgeElement) {
                edgeElement.style.display = 'none';
            }
            
            // البحث عن الأحمال المرتبطة بهذا القاطع
            const breakerToLoadEdges = networkData.edges.filter(loadEdge => 
                loadEdge.source === breakerId && loadEdge.target.startsWith('load-')
            );
            
            // إعادة ظهور الروابط المباشرة من اللوحة إلى الأحمال
            breakerToLoadEdges.forEach(loadEdge => {
                const loadId = loadEdge.target;
                
                // إظهار الروابط المباشرة
                const directEdge = document.getElementById(`${panelId}-to-${loadId}`);
                if (directEdge) {
                    directEdge.style.display = 'block';
                }
                
                // إظهار نص التلميح المرتبط بالرابط المباشر
                document.querySelectorAll(`.direct-panel-load-edge[id="${panelId}-to-${loadId}-text"]`).forEach(text => {
                    text.style.display = 'block';
                });
                
                // إخفاء الروابط بين القواطع والأحمال
                const breakerLoadEdgeElement = document.getElementById(loadEdge.id);
                if (breakerLoadEdgeElement) {
                    breakerLoadEdgeElement.style.display = 'none';
                }
            });
            
            // حذف القاطع من قائمة العناصر النشطة
            activeElements.delete(breakerId);
        }
    });
    
    // إعادة تطبيق الفلاتر
    applyFilters(
        document.querySelector('.nodes'), 
        document.querySelector('.edges')
    );
}

/**
 * تحريك القاطع عند ظهوره (تأثير مرئي)
 * @param {SVGElement} element - عنصر القاطع
 */
function animateBreakerAppearance(element) {
    // تأثير بسيط للوميض
    let opacity = 0.5;
    const interval = setInterval(() => {
        opacity += 0.1;
        element.setAttribute('opacity', opacity);
        
        if (opacity >= 1) {
            clearInterval(interval);
            element.setAttribute('opacity', 1);
        }
    }, 50);
}

/**
 * تحريك الحمل عند ظهوره (تأثير مرئي)
 * @param {SVGElement} element - عنصر الحمل
 */
function animateLoadAppearance(element) {
    // تأثير بسيط للوميض
    let opacity = 0.5;
    const interval = setInterval(() => {
        opacity += 0.1;
        element.setAttribute('opacity', opacity);
        
        if (opacity >= 1) {
            clearInterval(interval);
            element.setAttribute('opacity', 1);
        }
    }, 50);
}

/**
 * إضاءة مسار التغذية للعنصر المحدد
 * @param {string} nodeId - معرف العقدة
 */
function highlightPowerPath(nodeId) {
    // إعادة تعيين مسارات الإضاءة السابقة
    resetHighlightedPaths();
    
    // تتبع مسار التغذية من مصدر الطاقة إلى العنصر
    const upstreamPath = findUpstreamPath(nodeId);
    
    // تتبع مسار التغذية من العنصر إلى الأحمال
    const downstreamPath = findDownstreamPath(nodeId);
    
    // دمج المسارين
    activePaths = [...upstreamPath, ...downstreamPath];
    
    // إضاءة المسارات
    activePaths.forEach(pathSegment => {
        const edgeElement = document.getElementById(pathSegment.edgeId);
        if (edgeElement) {
            // تخزين اللون الأصلي
            if (!edgeElement.dataset.originalStroke) {
                edgeElement.dataset.originalStroke = edgeElement.getAttribute('stroke');
            }
            
            // تغيير لون الحافة للإشارة إلى التحديد
            if (pathSegment.type === 'upstream') {
                edgeElement.setAttribute('stroke', '#ff6600'); // برتقالي للمسار الأعلى
            } else {
                edgeElement.setAttribute('stroke', '#00aaff'); // أزرق فاتح للمسار الأدنى
            }
            
            // زيادة سمك الخط
            edgeElement.setAttribute('stroke-width', '4');
        }
    });
}

/**
 * إعادة تعيين مسارات الإضاءة
 */
function resetHighlightedPaths() {
    // إعادة لون جميع الحواف المضاءة سابقاً
    document.querySelectorAll('.edges path[data-original-stroke]').forEach(edge => {
        // استعادة اللون الأصلي
        edge.setAttribute('stroke', edge.dataset.originalStroke);
        // إعادة تعيين السمك
        edge.setAttribute('stroke-width', '2');
        // إزالة البيانات المخزنة
        delete edge.dataset.originalStroke;
    });
    
    // مسح مصفوفة المسارات النشطة
    activePaths = [];
}

/**
 * البحث عن المسار التصاعدي (من العنصر إلى المصدر)
 * @param {string} nodeId - معرف العقدة
 * @returns {Array} مسار التغذية التصاعدي
 */
function findUpstreamPath(nodeId) {
    const path = [];
    let currentNodeId = nodeId;
    let visited = new Set();
    
    // منع التكرار والدورات
    visited.add(currentNodeId);
    
    while (currentNodeId) {
        // البحث عن الحافة الواصلة للعقدة الحالية
        const incomingEdge = networkData.edges.find(edge => edge.target === currentNodeId);
        
        // إذا لم يكن هناك حافة واصلة أو وصلنا لمصدر طاقة، نتوقف
        if (!incomingEdge) break;
        
        // إضافة الحافة إلى المسار
        path.push({
            edgeId: incomingEdge.id,
            sourceId: incomingEdge.source,
            targetId: incomingEdge.target,
            type: 'upstream'
        });
        
        // الانتقال للعقدة التالية في المسار (الأب)
        currentNodeId = incomingEdge.source;
        
        // التحقق من وجود دورة
        if (visited.has(currentNodeId)) {
            break;
        }
        
        visited.add(currentNodeId);
    }
    
    return path;
}

/**
 * البحث عن المسار التنازلي (من العنصر إلى الأحمال)
 * @param {string} nodeId - معرف العقدة
 * @returns {Array} مسار التغذية التنازلي
 */
function findDownstreamPath(nodeId) {
    const path = [];
    const visited = new Set();
    
    // دالة تكرارية لاكتشاف جميع المسارات النازلة
    function exploreDownstream(currentId) {
        if (visited.has(currentId)) return;
        visited.add(currentId);
        
        // البحث عن جميع الحواف الخارجة من هذه العقدة
        const outgoingEdges = networkData.edges.filter(edge => edge.source === currentId);
        
        outgoingEdges.forEach(edge => {
            // إضافة الحافة إلى المسار
            path.push({
                edgeId: edge.id,
                sourceId: edge.source,
                targetId: edge.target,
                type: 'downstream'
            });
            
            // استمرار الاستكشاف بشكل تكراري
            exploreDownstream(edge.target);
        });
    }
    
    exploreDownstream(nodeId);
    return path;
}

/**
 * إنشاء جدول لعناصر المسار المحدد
 * @returns {string} HTML للجدول
 */
function generatePathTable() {
    if (activePaths.length === 0) return '';
    
    // جمع معرفات العقد الفريدة في المسار
    const nodeIds = new Set();
    activePaths.forEach(pathSegment => {
        nodeIds.add(pathSegment.sourceId);
        nodeIds.add(pathSegment.targetId);
    });
    
    // جمع بيانات العقد
    const pathNodes = [];
    nodeIds.forEach(nodeId => {
        const node = networkData.nodes.find(n => n.id === nodeId);
        if (node) {
            pathNodes.push({
                id: node.id,
                name: node.data.label,
                type: node.data.entityType,
                data: node.data.sourceData
            });
        }
    });
    
    // تصنيف العقد حسب النوع لتنظيم الجدول
    const sources = pathNodes.filter(node => node.type === 'powerSource');
    const panels = pathNodes.filter(node => node.type === 'panel');
    const breakers = pathNodes.filter(node => node.type === 'circuitBreaker');
    const loads = pathNodes.filter(node => node.type === 'load');
    
    // بناء HTML للجدول
    let tableHtml = `
        <h5 class="mt-4 mb-2"><i class="fas fa-route"></i> مسار التغذية</h5>
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead>
                    <tr>
                        <th>النوع</th>
                        <th>الاسم</th>
                        <th>التفاصيل</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // إضافة مصادر الطاقة
    sources.forEach(source => {
        tableHtml += `
            <tr>
                <td><span class="badge bg-danger">مصدر طاقة</span></td>
                <td>${source.name}</td>
                <td>${source.data.voltage} فولت / ${source.data.total_ampacity || '-'} أمبير</td>
            </tr>
        `;
    });
    
    // إضافة اللوحات
    panels.forEach(panel => {
        tableHtml += `
            <tr>
                <td><span class="badge bg-success">لوحة</span></td>
                <td>${panel.name}</td>
                <td>${panel.data.voltage} فولت / ${panel.data.ampacity || '-'} أمبير</td>
            </tr>
        `;
    });
    
    // إضافة القواطع
    breakers.forEach(breaker => {
        tableHtml += `
            <tr>
                <td><span class="badge bg-warning text-dark">قاطع</span></td>
                <td>${breaker.name}</td>
                <td>${breaker.data.rated_current || '-'} أمبير / ${breaker.data.number_of_poles || '-'} قطب</td>
            </tr>
        `;
    });
    
    // إضافة الأحمال
    loads.forEach(load => {
        tableHtml += `
            <tr>
                <td><span class="badge bg-primary">حمل</span></td>
                <td>${load.name}</td>
                <td>${load.data.ampacity || '-'} أمبير / ${load.data.power_factor || '-'} PF</td>
            </tr>
        `;
    });
    
    tableHtml += `
                </tbody>
            </table>
        </div>
    `;
    
    return tableHtml;
}

// إضافة وظيفة عالمية لإظهار الاتصالات
window.showConnections = function(nodeId) {
    showConnections(nodeId);
};