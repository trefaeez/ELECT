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

/**
 * معالجة النقر على العقدة
 * @param {Object} node - بيانات العقدة
 */
function handleNodeClick(node) {
    const detailsTitle = document.getElementById('detailsTitle');
    const detailsContent = document.getElementById('detailsContent');
    
    // تمييز العقدة المحددة
    highlightNode(node.id);
    
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
        } else if (node.data.entityType === 'circuitBreaker' && !showBreakers) {
            nodeElement.style.display = 'none';
        } else if (node.data.entityType === 'load' && !showLoads) {
            nodeElement.style.display = 'none';
        } else {
            nodeElement.style.display = 'block';
        }
    });
    
    // تحديد العقد المرئية
    const visibleNodeIds = networkData.nodes
        .filter(node => {
            if (node.data.entityType === 'powerSource' && !showPowerSources) return false;
            if (node.data.entityType === 'panel' && !showPanels) return false;
            if (node.data.entityType === 'circuitBreaker' && !showBreakers) return false;
            if (node.data.entityType === 'load' && !showLoads) return false;
            return true;
        })
        .map(node => node.id);
    
    // تطبيق الفلاتر على الحواف
    networkData.edges.forEach(edge => {
        const edgeElement = document.getElementById(edge.id);
        if (!edgeElement) return;
        
        if (visibleNodeIds.includes(edge.source) && visibleNodeIds.includes(edge.target)) {
            edgeElement.style.display = 'block';
        } else {
            edgeElement.style.display = 'none';
        }
    });
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

// إضافة وظيفة عالمية لإظهار الاتصالات
window.showConnections = function(nodeId) {
    showConnections(nodeId);
};