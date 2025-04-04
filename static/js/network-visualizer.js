/**
 * network-visualizer.js
 * مخطط تفاعلي للشبكة الكهربائية باستخدام SVG و JavaScript
 */

// المتغيرات العالمية
let networkContainer;      // حاوية SVG الرئيسية
let svgElement;           // عنصر SVG
let nodesGroup;           // مجموعة SVG للعقد
let edgesGroup;           // مجموعة SVG للحواف
let selectedNode = null;  // العقدة المحددة حاليًا
let zoomLevel = 1;        // مستوى التكبير الحالي
let panOffset = { x: 0, y: 0 }; // إزاحة التنقل الحالية
let isDragging = false;   // حالة السحب
let dragStart = { x: 0, y: 0 }; // نقطة بداية السحب
let directPanelToLoadEdges = []; // الحواف المباشرة بين اللوحات والأحمال

// قواميس للترجمة والألوان (استخدام نفس القواميس المعرفة في HTML)
// وهي متغيرات عالمية معرفة مسبقاً في ملف HTML
// const typeColors = {
//     'powerSource': '#dc3545', 
//     'panel': '#198754',      
//     'circuitBreaker': '#ffc107', 
//     'load': '#0d6efd'         
// };

// const typeNames = {
//     'powerSource': 'مصدر طاقة',
//     'panel': 'لوحة كهربائية',
//     'circuitBreaker': 'قاطع كهربائي',
//     'load': 'حمل كهربائي',
//     'main': 'رئيسية',
//     'sub_main': 'رئيسية فرعية',
//     'sub': 'فرعية',
//     'distribution': 'توزيع',
//     'main_circuit_breaker': 'قاطع رئيسي',
//     'copper': 'نحاس',
//     'aluminum': 'ألمنيوم'
// };

// ------------------- التهيئة والإعداد -------------------

/**
 * تهيئة المخطط التفاعلي
 */
function initializeNetworkVisualizer() {
    // التأكد من تحميل البيانات
    if (!networkData || !networkData.nodes || !networkData.nodes.length) {
        console.error('لم يتم تحميل بيانات الشبكة');
        return;
    }
    
    // إعداد حاوية SVG
    networkContainer = document.getElementById('networkContainer');
    
    // إنشاء عنصر SVG
    svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');
    svgElement.setAttribute('class', 'network-graph');
    
    // إنشاء المجموعات الرئيسية للعناصر
    edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgesGroup.setAttribute('class', 'edges-group');
    nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.setAttribute('class', 'nodes-group');
    
    // إضافة المجموعات إلى عنصر SVG
    svgElement.appendChild(edgesGroup);
    svgElement.appendChild(nodesGroup);
    
    // إضافة عنصر SVG إلى الحاوية
    networkContainer.appendChild(svgElement);
    
    // إعداد قابلية السحب والتكبير/التصغير
    setupDragAndZoom();
    
    // إضافة أحداث التغيير للفلاتر
    setupFilterEvents();
    
    // إضافة أحداث التحكم للأزرار
    setupControlButtons();
    
    // إنشاء الروابط المباشرة للوحات والأحمال (للاستخدام عندما تكون القواطع مخفية)
    createDirectPanelToLoadConnections();
    
    // عرض الشبكة بشكل افتراضي
    renderNetwork();
    
    // إخفاء مؤشر التحميل
    document.getElementById('loadingIndicator').style.display = 'none';
}

/**
 * إعداد أحداث السحب والتكبير/التصغير
 */
function setupDragAndZoom() {
    // بدء السحب
    svgElement.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // زر الفأرة الأيسر فقط
            isDragging = true;
            dragStart = {
                x: e.clientX - panOffset.x,
                y: e.clientY - panOffset.y
            };
            svgElement.style.cursor = 'grabbing';
        }
    });
    
    // التنقل أثناء السحب
    svgElement.addEventListener('mousemove', (e) => {
        if (isDragging) {
            panOffset.x = e.clientX - dragStart.x;
            panOffset.y = e.clientY - dragStart.y;
            updateTransform();
        }
    });
    
    // إنهاء السحب
    document.addEventListener('mouseup', () => {
        isDragging = false;
        if (svgElement) svgElement.style.cursor = 'default';
    });
    
    // إلغاء السحب عند مغادرة العنصر
    svgElement.addEventListener('mouseleave', () => {
        // لا نقوم بإلغاء السحب هنا لنتيح إمكانية السحب خارج حدود العنصر
        svgElement.style.cursor = isDragging ? 'grabbing' : 'default';
    });
    
    // التكبير/التصغير باستخدام عجلة الفأرة
    svgElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        // تعديل مقدار التكبير/التصغير
        const zoomSpeed = 0.12; // زيادة سرعة الزوم
        const delta = -Math.sign(e.deltaY) * zoomSpeed;
        
        // ضمان أن مستوى التكبير ضمن الحدود المعقولة
        const minZoom = 0.1; // أقل مستوى تكبير
        const maxZoom = 5;   // أقصى مستوى تكبير
        
        // حساب المستوى الجديد
        const newZoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel + delta));
        
        // محافظة على نقطة التركيز أثناء التكبير/التصغير
        const rect = svgElement.getBoundingClientRect();
        
        // حساب الموقع الفعلي للفأرة بالنسبة للمخطط
        const mouseX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
        const mouseY = (e.clientY - rect.top - panOffset.y) / zoomLevel;
        
        // تعديل الإزاحة لضمان بقاء نقطة الفأرة ثابتة أثناء التكبير
        panOffset.x -= mouseX * (newZoomLevel - zoomLevel);
        panOffset.y -= mouseY * (newZoomLevel - zoomLevel);
        
        // تطبيق مستوى التكبير الجديد
        zoomLevel = newZoomLevel;
        
        // تحديث عامل التحويل للمخطط
        updateTransform();
        
        // عرض مستوى التكبير الحالي للمستخدم (اختياري)
        updateZoomDisplay();
    });
}

/**
 * تحديث عرض مستوى التكبير الحالي (اختياري)
 */
function updateZoomDisplay() {
    // يمكن إضافة عنصر HTML لعرض مستوى التكبير
    const zoomDisplayElement = document.getElementById('zoomLevel');
    if (zoomDisplayElement) {
        zoomDisplayElement.textContent = `${Math.round(zoomLevel * 100)}%`;
    }
}

/**
 * تحديث حالة التحويل (التكبير والتنقل)
 */
function updateTransform() {
    // تطبيق التحويل على المجموعات المختلفة
    const transformValue = `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`;
    nodesGroup.style.transform = transformValue;
    edgesGroup.style.transform = transformValue;
    
    // إضافة نقطة أصل التحويل للحفاظ على مركز التكبير
    nodesGroup.style.transformOrigin = '0 0';
    edgesGroup.style.transformOrigin = '0 0';
}

/**
 * إعداد أحداث فلاتر العرض
 */
function setupFilterEvents() {
    // مصادر الطاقة
    document.getElementById('showPowerSources').addEventListener('change', (e) => {
        toggleNodeTypeVisibility('powerSource', e.target.checked);
    });
    
    // اللوحات الكهربائية
    document.getElementById('showPanels').addEventListener('change', (e) => {
        toggleNodeTypeVisibility('panel', e.target.checked);
    });
    
    // القواطع الكهربائية
    document.getElementById('showBreakers').addEventListener('change', (e) => {
        toggleNodeTypeVisibility('circuitBreaker', e.target.checked);
    });
    
    // الأحمال الكهربائية
    document.getElementById('showLoads').addEventListener('change', (e) => {
        toggleNodeTypeVisibility('load', e.target.checked);
    });
}

/**
 * إعداد أزرار التحكم في المخطط
 */
function setupControlButtons() {
    // زر التكبير
    document.getElementById('btnZoomIn').addEventListener('click', () => {
        zoomLevel = Math.min(3, zoomLevel + 0.1);
        updateTransform();
    });
    
    // زر التصغير
    document.getElementById('btnZoomOut').addEventListener('click', () => {
        zoomLevel = Math.max(0.1, zoomLevel - 0.1);
        updateTransform();
    });
    
    // زر ملاءمة العرض
    document.getElementById('btnFitView').addEventListener('click', fitNetworkToView);
    
    // زر إعادة ضبط العرض
    document.getElementById('btnResetView').addEventListener('click', resetView);
}

// ------------------- عرض ورسم المخطط -------------------

/**
 * رسم المخطط التفاعلي للشبكة
 */
function renderNetwork() {
    // مسح المحتوى السابق
    nodesGroup.innerHTML = '';
    edgesGroup.innerHTML = '';
    
    // رسم الحواف أولاً (لتكون خلف العقد)
    renderEdges();
    
    // رسم العقد
    renderNodes();
    
    // تطبيق الفلاتر الحالية
    applyCurrentFilters();
    
    // ملاءمة العرض للمخطط
    fitNetworkToView();
}

/**
 * رسم العقد (العناصر الكهربائية)
 */
function renderNodes() {
    networkData.nodes.forEach(node => {
        // إنشاء مجموعة للعقدة
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.setAttribute('id', `node-${node.id}`);
        nodeGroup.setAttribute('class', `network-node ${node.data.entityType}-node`);
        nodeGroup.setAttribute('transform', `translate(${node.position.x},${node.position.y})`);
        
        // إنشاء المستطيل الرئيسي للعقدة
        const nodeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        nodeRect.setAttribute('width', node.style?.width || 150);
        nodeRect.setAttribute('height', 40);
        nodeRect.setAttribute('rx', node.style?.borderRadius?.replace('px', '') || 5);
        nodeRect.setAttribute('ry', node.style?.borderRadius?.replace('px', '') || 5);
        nodeRect.setAttribute('fill', node.style?.background || getTypeColor(node.data.entityType));
        nodeRect.setAttribute('stroke', node.style?.border?.split(' ')[2] || '#222138');
        nodeRect.setAttribute('stroke-width', 1);
        
        // إنشاء نص العقدة
        const nodeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nodeText.setAttribute('x', (node.style?.width || 150) / 2);
        nodeText.setAttribute('y', 25);
        nodeText.setAttribute('text-anchor', 'middle');
        nodeText.setAttribute('dominant-baseline', 'middle');
        nodeText.setAttribute('fill', node.style?.color || 'white');
        nodeText.setAttribute('font-family', 'Arial, sans-serif');
        nodeText.setAttribute('font-size', '14px');
        nodeText.textContent = node.data.label;
        
        // أيقونة للنوع (اختيارية)
        const nodeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nodeIcon.setAttribute('x', 15);
        nodeIcon.setAttribute('y', 22);
        nodeIcon.setAttribute('font-family', 'FontAwesome');
        nodeIcon.setAttribute('font-size', '14px');
        nodeIcon.setAttribute('fill', node.style?.color || 'white');
        
        // تحديد رمز الأيقونة حسب نوع العنصر
        switch (node.data.entityType) {
            case 'powerSource':
                nodeIcon.textContent = '\uf0e7'; // bolt
                break;
            case 'panel':
                nodeIcon.textContent = '\uf1e6'; // plug
                break;
            case 'circuitBreaker':
                nodeIcon.textContent = '\uf1e0'; // share-alt
                break;
            case 'load':
                nodeIcon.textContent = '\uf0eb'; // lightbulb
                break;
        }
        
        // إضافة أيقونة طي/توسيع للوحات ومصادر الطاقة
        if (node.data.entityType === 'powerSource' || node.data.entityType === 'panel') {
            // التحقق مما إذا كان للعقدة أبناء
            const hasChildren = checkForChildren(node.id);
            
            if (hasChildren) {
                const collapseButton = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                collapseButton.setAttribute('class', 'collapse-button');
                collapseButton.setAttribute('cursor', 'pointer');
                collapseButton.setAttribute('data-node-id', node.id);
                
                // حالة الطي الافتراضية
                const isCollapsed = node.data.collapsed || false;
                
                // إضافة الخلفية للزر
                const buttonBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                buttonBg.setAttribute('cx', (node.style?.width || 150) - 15);
                buttonBg.setAttribute('cy', 20);
                buttonBg.setAttribute('r', 8);
                buttonBg.setAttribute('fill', '#ffffff');
                buttonBg.setAttribute('stroke', '#222138');
                buttonBg.setAttribute('stroke-width', '1');
                
                // إضافة أيقونة الزر (+ أو -)
                const buttonIcon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                buttonIcon.setAttribute('x', (node.style?.width || 150) - 15);
                buttonIcon.setAttribute('y', 24);
                buttonIcon.setAttribute('text-anchor', 'middle');
                buttonIcon.setAttribute('font-family', 'Arial, sans-serif');
                buttonIcon.setAttribute('font-size', '14px');
                buttonIcon.setAttribute('fill', '#222138');
                buttonIcon.textContent = isCollapsed ? '+' : '-';
                
                // إضافة الزر إلى المجموعة
                collapseButton.appendChild(buttonBg);
                collapseButton.appendChild(buttonIcon);
                
                // إضافة حدث النقر لتبديل حالة الطي
                collapseButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // منع انتشار الحدث (لتجنب تحديد العقدة)
                    toggleCollapseNode(node.id);
                });
                
                // إضافة الزر إلى مجموعة العقدة
                nodeGroup.appendChild(collapseButton);
                
                // إضافة صفة للإشارة إلى الحالة الحالية
                nodeGroup.setAttribute('data-collapsed', isCollapsed);
            }
        }
        
        // إضافة معالج الحدث للنقر على العقدة
        nodeGroup.addEventListener('click', () => selectNode(node));
        
        // تجميع العناصر
        nodeGroup.appendChild(nodeRect);
        nodeGroup.appendChild(nodeIcon);
        nodeGroup.appendChild(nodeText);
        
        // إضافة العقدة إلى المجموعة
        nodesGroup.appendChild(nodeGroup);
    });
}

/**
 * التحقق مما إذا كان للعقدة عناصر تابعة لها
 * @param {string} nodeId - معرّف العقدة
 * @returns {boolean} - ما إذا كان للعقدة أبناء أم لا
 */
function checkForChildren(nodeId) {
    // إذا كان من نوع مصدر طاقة، نبحث عن اللوحات المرتبطة به
    if (nodeId.startsWith('ps-')) {
        const sourceId = nodeId.replace('ps-', '');
        const childPanels = networkData.hierarchy?.powerSources[sourceId]?.childPanels || [];
        return childPanels.length > 0;
    }
    
    // إذا كان من نوع لوحة، نبحث عن اللوحات الفرعية والقواطع التابعة
    else if (nodeId.startsWith('panel-')) {
        const panelId = nodeId.replace('panel-', '');
        const panel = networkData.hierarchy?.panels[panelId];
        if (panel) {
            const hasChildPanels = panel.childPanels && panel.childPanels.length > 0;
            const hasBreakers = panel.breakers && panel.breakers.length > 0;
            return hasChildPanels || hasBreakers;
        }
    }
    
    // إذا كان من نوع قاطع، نبحث عن الأحمال المرتبطة
    else if (nodeId.startsWith('breaker-')) {
        const breakerId = nodeId.replace('breaker-', '');
        const breaker = networkData.hierarchy?.breakers[breakerId];
        if (breaker) {
            return breaker.loads && breaker.loads.length > 0;
        }
    }
    
    return false;
}

/**
 * تبديل حالة طي/توسيع العقدة والعناصر التابعة لها
 * @param {string} nodeId - معرّف العقدة
 */
function toggleCollapseNode(nodeId) {
    const node = findNodeById(nodeId);
    if (!node) return;
    
    // تبديل حالة الطي
    node.data.collapsed = !node.data.collapsed;
    const isCollapsed = node.data.collapsed;
    
    // تحديث مظهر زر الطي/التوسيع
    const nodeElement = document.getElementById(`node-${nodeId}`);
    if (nodeElement) {
        nodeElement.setAttribute('data-collapsed', isCollapsed);
        const buttonIcon = nodeElement.querySelector('.collapse-button text');
        if (buttonIcon) {
            buttonIcon.textContent = isCollapsed ? '+' : '-';
        }
    }
    
    // تحديث حالة الرؤية للعناصر التابعة
    updateChildrenVisibility(nodeId, !isCollapsed);
    
    // إعادة رسم المسارات
    updateEdgesVisibility();
    
    // تعديل المخطط حسب العناصر المرئية حالياً
    fitNetworkToView();
}

/**
 * تحديث رؤية العناصر التابعة لعقدة معينة
 * @param {string} parentId - معرّف العقدة الأب
 * @param {boolean} isVisible - حالة الرؤية
 * @param {boolean} recursive - ما إذا كان يجب تطبيق التغيير بشكل متكرر على الأبناء
 */
function updateChildrenVisibility(parentId, isVisible, recursive = true) {
    // إذا كان من نوع مصدر طاقة
    if (parentId.startsWith('ps-')) {
        const sourceId = parentId.replace('ps-', '');
        const childPanels = networkData.hierarchy?.powerSources[sourceId]?.childPanels || [];
        
        // تحديث رؤية اللوحات التابعة
        childPanels.forEach(panelId => {
            const panelNodeId = `panel-${panelId}`;
            updateNodeVisibility(panelNodeId, isVisible);
            
            // إذا كان التطبيق متكرراً، انتقل إلى الأبناء
            if (recursive && isVisible) {
                updateChildrenVisibility(panelNodeId, isVisible, true);
            }
        });
    }
    
    // إذا كان من نوع لوحة
    else if (parentId.startsWith('panel-')) {
        const panelId = parentId.replace('panel-', '');
        const panel = networkData.hierarchy?.panels[panelId];
        
        // تحديث رؤية اللوحات الفرعية
        if (panel && panel.childPanels) {
            panel.childPanels.forEach(childPanelId => {
                const childPanelNodeId = `panel-${childPanelId}`;
                updateNodeVisibility(childPanelNodeId, isVisible);
                
                // إذا كان التطبيق متكرراً، انتقل إلى الأبناء
                if (recursive && isVisible) {
                    updateChildrenVisibility(childPanelNodeId, isVisible, true);
                }
            });
        }
        
        // تحديث رؤية القواطع التابعة
        if (panel && panel.breakers) {
            panel.breakers.forEach(breakerId => {
                const breakerNodeId = `breaker-${breakerId}`;
                updateNodeVisibility(breakerNodeId, isVisible);
                
                // إذا كان التطبيق متكرراً، انتقل إلى الأحمال
                if (recursive && isVisible) {
                    updateChildrenVisibility(breakerNodeId, isVisible, true);
                }
            });
        }
    }
    
    // إذا كان من نوع قاطع
    else if (parentId.startsWith('breaker-')) {
        const breakerId = parentId.replace('breaker-', '');
        const breaker = networkData.hierarchy?.breakers[breakerId];
        
        // تحديث رؤية الأحمال التابعة
        if (breaker && breaker.loads) {
            breaker.loads.forEach(loadId => {
                const loadNodeId = `load-${loadId}`;
                updateNodeVisibility(loadNodeId, isVisible);
            });
        }
    }
}

/**
 * تحديث رؤية عقدة معينة
 * @param {string} nodeId - معرّف العقدة
 * @param {boolean} isVisible - حالة الرؤية
 */
function updateNodeVisibility(nodeId, isVisible) {
    const nodeElement = document.getElementById(`node-${nodeId}`);
    if (nodeElement) {
        nodeElement.style.display = isVisible ? 'block' : 'none';
    }
    
    // تحديث حالة العقدة في البيانات
    const node = findNodeById(nodeId);
    if (node) {
        node.visible = isVisible;
    }
}

/**
 * تحديث رؤية حواف الشبكة بناءً على رؤية العقد
 */
function updateEdgesVisibility() {
    networkData.edges.forEach(edge => {
        const edgeElement = document.getElementById(`edge-${edge.id}`);
        if (!edgeElement) return;
        
        // التحقق من رؤية العقد المتصلة بالحافة
        const sourceNode = findNodeById(edge.source);
        const targetNode = findNodeById(edge.target);
        
        const sourceVisible = sourceNode && (sourceNode.visible !== false) && 
                            getTypeVisibility(sourceNode.data.entityType);
        const targetVisible = targetNode && (targetNode.visible !== false) && 
                            getTypeVisibility(targetNode.data.entityType);
        
        // إظهار الحافة فقط إذا كان كلا الطرفين مرئيين
        edgeElement.style.display = (sourceVisible && targetVisible) ? 'block' : 'none';
    });
}

/**
 * رسم الحواف (الروابط بين العناصر)
 */
function renderEdges() {
    networkData.edges.forEach(edge => {
        // البحث عن العقد المصدر والهدف
        const sourceNode = findNodeById(edge.source);
        const targetNode = findNodeById(edge.target);
        
        if (!sourceNode || !targetNode) {
            console.warn(`لا يمكن رسم الحافة: العقدة المصدر أو الهدف غير موجودة: ${edge.source} -> ${edge.target}`);
            return;
        }
        
        // حساب نقاط بداية ونهاية الحافة
        const sourceWidth = sourceNode.style?.width || 150;
        const targetWidth = targetNode.style?.width || 150;
        const sourceHeight = 40; // ارتفاع العقدة المصدر
        const targetHeight = 40; // ارتفاع العقدة الهدف
        
        // نقطة البداية (مركز أسفل العقدة المصدر)
        const startX = sourceNode.position.x + sourceWidth / 2;
        const startY = sourceNode.position.y + sourceHeight;
        
        // نقطة النهاية (مركز أعلى العقدة الهدف)
        const endX = targetNode.position.x + targetWidth / 2;
        const endY = targetNode.position.y;
        
        // إنشاء مسار للحافة
        const edgePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // إنشاء مسار على شكل L بدلاً من المنحنى (مسار أفقي ثم رأسي)
        // حساب نقطة الوسط للمسار
        const middleY = startY + (endY - startY) / 2;
        
        // بناء المسار باستخدام خطوط مستقيمة (أفقية ورأسية)
        let path = `M${startX},${startY}`; // نقطة البداية
        
        // مقدار الانحراف الجانبي للمسارات المائلة
        const sideOffset = 50;
        let labelX, labelY; // موقع النص على المسار
        
        // التحقق من اتجاه الروابط (من الأعلى للأسفل أم العكس)
        if (startY < endY) {
            // من أعلى إلى أسفل (المسار الطبيعي)
            path += ` L${startX},${middleY}`; // خط رأسي لأسفل للنصف
            path += ` L${endX},${middleY}`;   // خط أفقي
            path += ` L${endX},${endY}`;      // خط رأسي للنهاية
            
            // تحديد موقع النص للمسار العادي
            labelX = (startX + endX) / 2;
            labelY = middleY - 10;
        } else {
            // من أسفل إلى أعلى (عكس المسار الطبيعي)
            // إذا الهدف أعلى من المصدر، نحتاج إلى مسار مختلف
            const direction = startX < endX ? 1 : -1; // تحديد اتجاه الانحراف
            
            path += ` L${startX},${startY + sideOffset}`; // خط رأسي قصير
            path += ` L${startX + sideOffset * direction},${startY + sideOffset}`; // خط أفقي قصير
            path += ` L${startX + sideOffset * direction},${endY - sideOffset}`; // خط رأسي طويل
            path += ` L${endX},${endY - sideOffset}`; // خط أفقي إلى الهدف
            path += ` L${endX},${endY}`; // خط رأسي للنهاية
            
            // تحديد موقع النص للمسار المعكوس
            labelX = (startX + sideOffset * direction + endX) / 2;
            labelY = endY - sideOffset - 10;
        }
        
        // تعيين سمات المسار
        edgePath.setAttribute('id', `edge-${edge.id}`);
        edgePath.setAttribute('d', path);
        edgePath.setAttribute('stroke', edge.style?.stroke || '#6c757d');
        edgePath.setAttribute('stroke-width', '2');
        edgePath.setAttribute('fill', 'none');
        
        // إضافة تأثير متقطع حسب نوع الحافة
        if (edge.style?.strokeDasharray) {
            edgePath.setAttribute('stroke-dasharray', edge.style.strokeDasharray);
        }
        
        // تأثير حركي (متحرك) إذا كان مطلوبًا
        if (edge.animated) {
            const animateElement = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            animateElement.setAttribute('attributeName', 'stroke-dashoffset');
            animateElement.setAttribute('from', '0');
            animateElement.setAttribute('to', '20');
            animateElement.setAttribute('dur', '1s');
            animateElement.setAttribute('repeatCount', 'indefinite');
            edgePath.appendChild(animateElement);
            
            // إضافة نمط متقطع للخط المتحرك
            edgePath.setAttribute('stroke-dasharray', '5,2');
        }
        
        // إضافة نص للحافة إذا وجد
        if (edge.label) {
            const edgeLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            
            edgeLabel.setAttribute('x', labelX);
            edgeLabel.setAttribute('y', labelY);
            edgeLabel.setAttribute('text-anchor', 'middle');
            edgeLabel.setAttribute('fill', '#495057');
            edgeLabel.setAttribute('font-size', '12px');
            edgeLabel.setAttribute('font-family', 'Arial, sans-serif');
            edgeLabel.textContent = edge.label;
            
            // خلفية بيضاء خلف النص
            const textBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const textWidth = edge.label.length * 7; // تقريبي
            textBg.setAttribute('x', labelX - textWidth / 2 - 3);
            textBg.setAttribute('y', labelY - 12);
            textBg.setAttribute('width', textWidth + 6);
            textBg.setAttribute('height', 16);
            textBg.setAttribute('fill', 'white');
            textBg.setAttribute('fill-opacity', '0.8');
            
            // إضافة الخلفية أولاً ثم النص
            edgesGroup.appendChild(textBg);
            edgesGroup.appendChild(edgeLabel);
        }
        
        // إضافة الحافة إلى المجموعة
        edgesGroup.appendChild(edgePath);
        
        // حفظ الحواف المباشرة من اللوحات إلى الأحمال في مصفوفة خاصة
        if (edge.source.startsWith('panel-') && edge.target.startsWith('load-')) {
            directPanelToLoadEdges.push(edge.id);
        }
    });
}

/**
 * إنشاء روابط مباشرة بين اللوحات والأحمال (للاستخدام عندما تكون القواطع مخفية)
 */
function createDirectPanelToLoadConnections() {
    // مسح الروابط المباشرة السابقة
    directPanelToLoadEdges = [];
    
    // البحث عن الأحمال والقواطع والتي لوحاتها
    networkData.nodes.filter(node => node.data.entityType === 'load').forEach(loadNode => {
        const loadId = loadNode.id.replace('load-', '');
        
        // البحث عن القاطع المتصل بالحمل
        const breakerEdge = networkData.edges.find(edge => 
            edge.target === `load-${loadId}` && edge.source.startsWith('breaker-')
        );
        
        if (breakerEdge) {
            const breakerId = breakerEdge.source.replace('breaker-', '');
            
            // البحث عن اللوحة المتصلة بالقاطع
            const panelEdge = networkData.edges.find(edge => 
                edge.target === `breaker-${breakerId}` && edge.source.startsWith('panel-')
            );
            
            if (panelEdge) {
                const panelId = panelEdge.source.replace('panel-', '');
                
                // إنشاء رابط مباشر بين اللوحة والحمل
                const directEdgeId = `direct-panel${panelId}-load${loadId}`;
                
                // إضافة الحافة إلى بيانات الشبكة للاستخدام في وضع إخفاء القواطع
                networkData.edges.push({
                    id: directEdgeId,
                    source: `panel-${panelId}`,
                    target: `load-${loadId}`,
                    direct: true,
                    style: { 
                        stroke: typeColors.load,
                        strokeDasharray: '3,3'
                    }
                });
            }
        }
    });
}

// ------------------- التفاعل والتحديثات -------------------

/**
 * ملاءمة المخطط للعرض
 */
function fitNetworkToView() {
    if (!networkData.nodes.length) return;
    
    // حساب الحدود الكلية للمخطط
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    // تحديد حدود جميع العناصر المرئية فقط
    const visibleNodes = networkData.nodes.filter(node => {
        // فحص ما إذا كان النوع مرئيًا حسب الفلاتر
        return getTypeVisibility(node.data.entityType);
    });
    
    if (visibleNodes.length === 0) {
        // لا توجد عناصر مرئية، استخدم جميع العناصر
        networkData.nodes.forEach(node => {
            const width = node.style?.width || 150;
            const height = 40;
            
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + width);
            maxY = Math.max(maxY, node.position.y + height);
        });
    } else {
        // استخدم العناصر المرئية فقط
        visibleNodes.forEach(node => {
            const width = node.style?.width || 150;
            const height = 40;
            
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + width);
            maxY = Math.max(maxY, node.position.y + height);
        });
    }
    
    // إضافة هامش
    const marginX = 100;
    const marginY = 100;
    minX -= marginX;
    minY -= marginY;
    maxX += marginX;
    maxY += marginY;
    
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    
    const containerRect = networkContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // حساب مستوى التكبير المناسب
    const scaleX = containerWidth / graphWidth;
    const scaleY = containerHeight / graphHeight;
    zoomLevel = Math.min(scaleX, scaleY, 2.0); // تقييد المستوى الأقصى للتكبير
    
    // حساب الإزاحة للتوسيط
    panOffset.x = (containerWidth / 2) - ((minX + maxX) / 2) * zoomLevel;
    panOffset.y = (containerHeight / 2) - ((minY + maxY) / 2) * zoomLevel;
    
    // تطبيق التغييرات
    updateTransform();
    updateZoomDisplay();
}

/**
 * إعادة ضبط العرض إلى الحالة الافتراضية
 */
function resetView() {
    zoomLevel = 1;
    panOffset = { x: 0, y: 0 };
    updateTransform();
    fitNetworkToView();
}

/**
 * تطبيق الفلاتر الحالية
 */
function applyCurrentFilters() {
    // قراءة حالة جميع الفلاتر
    const showPowerSources = document.getElementById('showPowerSources').checked;
    const showPanels = document.getElementById('showPanels').checked;
    const showBreakers = document.getElementById('showBreakers').checked;
    const showLoads = document.getElementById('showLoads').checked;
    
    // تطبيق الفلاتر
    toggleNodeTypeVisibility('powerSource', showPowerSources);
    toggleNodeTypeVisibility('panel', showPanels);
    toggleNodeTypeVisibility('circuitBreaker', showBreakers);
    toggleNodeTypeVisibility('load', showLoads);
}

/**
 * تبديل رؤية نوع معين من العقد
 * @param {string} nodeType - نوع العقدة
 * @param {boolean} isVisible - حالة الرؤية
 */
function toggleNodeTypeVisibility(nodeType, isVisible) {
    // تحديث رؤية العقد
    const nodeElements = document.querySelectorAll(`.${nodeType}-node`);
    nodeElements.forEach(node => {
        node.style.display = isVisible ? 'block' : 'none';
    });
    
    // تحديث الحواف المرتبطة
    networkData.edges.forEach(edge => {
        const edgeElement = document.getElementById(`edge-${edge.id}`);
        if (!edgeElement) return;
        
        const sourceType = getNodeTypeFromId(edge.source);
        const targetType = getNodeTypeFromId(edge.target);
        
        const sourceVisible = getTypeVisibility(sourceType);
        const targetVisible = getTypeVisibility(targetType);
        
        // إظهار الحافة فقط إذا كان كلا الطرفين مرئيين
        edgeElement.style.display = (sourceVisible && targetVisible) ? 'block' : 'none';
    });
    
    // حالة خاصة للقواطع: إذا كانت القواطع مخفية، أظهر الروابط المباشرة بين اللوحات والأحمال
    if (nodeType === 'circuitBreaker') {
        updateDirectConnectionsVisibility(!isVisible);
    }
}

/**
 * تحديث ظهور الروابط المباشرة بين اللوحات والأحمال
 * @param {boolean} showDirectConnections - ما إذا كان يجب إظهار الروابط المباشرة
 */
function updateDirectConnectionsVisibility(showDirectConnections) {
    networkData.edges.forEach(edge => {
        if (edge.direct) {
            const edgeElement = document.getElementById(`edge-${edge.id}`);
            if (edgeElement) {
                edgeElement.style.display = showDirectConnections ? 'block' : 'none';
            }
        }
    });
}

/**
 * الحصول على حالة رؤية نوع العقدة
 * @param {string} nodeType - نوع العقدة
 * @returns {boolean} - حالة الرؤية
 */
function getTypeVisibility(nodeType) {
    switch (nodeType) {
        case 'powerSource':
            return document.getElementById('showPowerSources').checked;
        case 'panel':
            return document.getElementById('showPanels').checked;
        case 'circuitBreaker':
            return document.getElementById('showBreakers').checked;
        case 'load':
            return document.getElementById('showLoads').checked;
        default:
            return true;
    }
}

/**
 * تحديد عقدة في المخطط
 * @param {Object} node - بيانات العقدة المحددة
 */
function selectNode(node) {
    // إلغاء التحديد السابق إن وجد
    if (selectedNode) {
        const prevSelectedElement = document.getElementById(`node-${selectedNode.id}`);
        if (prevSelectedElement) {
            const rect = prevSelectedElement.querySelector('rect');
            if (rect) {
                rect.setAttribute('stroke-width', '1');
                rect.setAttribute('stroke', selectedNode.style?.border?.split(' ')[2] || '#222138');
            }
        }
    }
    
    // تحديث العقدة المحددة
    selectedNode = node;
    
    // تحديث مظهر العقدة المحددة
    const selectedElement = document.getElementById(`node-${node.id}`);
    const rect = selectedElement.querySelector('rect');
    if (rect) {
        rect.setAttribute('stroke-width', '3');
        rect.setAttribute('stroke', '#ff8c00'); // لون برتقالي للتحديد
    }
    
    // عرض تفاصيل العنصر المحدد
    displayNodeDetails(node);
    
    // إضاءة المسارات المرتبطة
    highlightConnections(node.id);
}

/**
 * عرض تفاصيل العقدة المحددة في لوحة التفاصيل
 * @param {Object} node - بيانات العقدة المحددة
 */
function displayNodeDetails(node) {
    const detailsTitle = document.getElementById('detailsTitle');
    const detailsContent = document.getElementById('detailsContent');
    
    // تحديث عنوان التفاصيل
    detailsTitle.textContent = node.data.label;
    
    // إنشاء محتوى التفاصيل
    let content = '';
    
    // تحديد نوع العنصر للعرض بالعربية
    const entityTypeDisplay = typeNames[node.data.entityType] || node.data.entityType;
    
    // بداية الجدول
    content = `
        <table class="table table-sm node-details-table">
            <tbody>
                <tr>
                    <td>نوع العنصر</td>
                    <td>${entityTypeDisplay}</td>
                </tr>
    `;
    
    // إضافة تفاصيل مخصصة حسب نوع العنصر
    const data = node.data.sourceData;
    
    switch (node.data.entityType) {
        case 'powerSource':
            content += `
                <tr>
                    <td>الجهد</td>
                    <td>${data.voltage || '-'} فولت</td>
                </tr>
                <tr>
                    <td>القدرة الكلية</td>
                    <td>${data.capacity || '-'} أمبير</td>
                </tr>
                <tr>
                    <td>نوع الإمداد</td>
                    <td>${data.supply_type ? (typeNames[data.supply_type] || data.supply_type) : '-'}</td>
                </tr>
                <tr>
                    <td>الموقع</td>
                    <td>${data.location || '-'}</td>
                </tr>
            `;
            break;
            
        case 'panel':
            content += `
                <tr>
                    <td>نوع اللوحة</td>
                    <td>${data.panel_type ? (typeNames[data.panel_type] || data.panel_type) : '-'}</td>
                </tr>
                <tr>
                    <td>الجهد</td>
                    <td>${data.voltage || '-'} فولت</td>
                </tr>
                <tr>
                    <td>التيار المقنن</td>
                    <td>${data.current_rating || '-'} أمبير</td>
                </tr>
                <tr>
                    <td>الموقع</td>
                    <td>${data.location || '-'}</td>
                </tr>
                <tr>
                    <td>عدد القواطع</td>
                    <td id="breakerCount">جاري الحساب...</td>
                </tr>
            `;
            // حساب عدد القواطع في الخلفية
            countBreakersForPanel(node.id.replace('panel-', ''));
            break;
            
        case 'circuitBreaker':
            content += `
                <tr>
                    <td>التيار المقنن</td>
                    <td>${data.current_rating || '-'} أمبير</td>
                </tr>
                <tr>
                    <td>عدد الأقطاب</td>
                    <td>${data.poles || '-'}</td>
                </tr>
                <tr>
                    <td>النوع</td>
                    <td>${data.breaker_type ? (typeNames[data.breaker_type] || data.breaker_type) : '-'}</td>
                </tr>
                <tr>
                    <td>اسم الحمل</td>
                    <td id="loadName">جاري التحميل...</td>
                </tr>
            `;
            // تحميل اسم الحمل المتصل في الخلفية
            loadConnectedLoadName(node.id.replace('breaker-', ''));
            break;
            
        case 'load':
            content += `
                <tr>
                    <td>القدرة</td>
                    <td>${data.power || '-'} واط</td>
                </tr>
                <tr>
                    <td>التيار</td>
                    <td>${data.current || '-'} أمبير</td>
                </tr>
                <tr>
                    <td>الجهد</td>
                    <td>${data.voltage || '-'} فولت</td>
                </tr>
                <tr>
                    <td>معامل القدرة</td>
                    <td>${data.power_factor || '-'}</td>
                </tr>
                <tr>
                    <td>نوع الكابل</td>
                    <td>${data.cable_material ? (typeNames[data.cable_material] || data.cable_material) : '-'}</td>
                </tr>
                <tr>
                    <td>مقطع الكابل</td>
                    <td>${data.cable_cross_section || '-'} مم²</td>
                </tr>
            `;
            break;
    }
    
    // إضافة ملاحظات إذا وجدت
    if (data.notes) {
        content += `
            <tr>
                <td>ملاحظات</td>
                <td>${data.notes}</td>
            </tr>
        `;
    }
    
    // إغلاق الجدول
    content += `
            </tbody>
        </table>
    `;
    
    // إضافة أزرار الإجراءات حسب نوع العنصر
    content += `
        <div class="d-flex justify-content-end mt-3">
            <button class="btn btn-sm btn-outline-primary" onclick="showElementPath('${node.id}')">
                <i class="fas fa-route"></i> عرض المسار
            </button>
    `;
    
    if (node.data.entityType === 'panel') {
        content += `
            <button class="btn btn-sm btn-outline-info ms-2" onclick="showPanelBreakers('${node.id.replace('panel-', '')}')">
                <i class="fas fa-list"></i> عرض القواطع
            </button>
        `;
    }
    
    content += `</div>`;
    
    // تحديث محتوى لوحة التفاصيل
    detailsContent.innerHTML = content;
}

/**
 * حساب عدد القواطع المرتبطة باللوحة
 * @param {string} panelId - معرّف اللوحة
 */
async function countBreakersForPanel(panelId) {
    try {
        const response = await NetworkAPI.getCircuitBreakers();
        if (response.success) {
            const breakers = response.data;
            const panelBreakers = breakers.filter(breaker => breaker.panel == panelId);
            const breakerCount = document.getElementById('breakerCount');
            if (breakerCount) {
                breakerCount.textContent = panelBreakers.length.toString();
            }
        }
    } catch (error) {
        console.error('خطأ في حساب عدد القواطع:', error);
    }
}

/**
 * تحميل اسم الحمل المتصل بالقاطع
 * @param {string} breakerId - معرّف القاطع
 */
async function loadConnectedLoadName(breakerId) {
    try {
        const response = await NetworkAPI.getLoads();
        if (response.success) {
            const loads = response.data;
            const load = loads.find(l => l.breaker == breakerId);
            const loadName = document.getElementById('loadName');
            if (loadName) {
                loadName.textContent = load ? load.name : 'لا يوجد حمل متصل';
            }
        }
    } catch (error) {
        console.error('خطأ في تحميل اسم الحمل:', error);
    }
}

/**
 * إضاءة مسارات الاتصال المرتبطة بالعقدة المحددة
 * @param {string} nodeId - معرّف العقدة
 */
function highlightConnections(nodeId) {
    // إعادة تعيين حالة جميع الحواف
    resetEdgesHighlighting();
    
    // تتبع المسار التصاعدي (من العنصر إلى المصدر)
    const upstreamPath = findUpstreamPath(nodeId);
    
    // تتبع المسار التنازلي (من العنصر إلى الأحمال)
    const downstreamPath = findDownstreamPath(nodeId);
    
    // إضاءة المسار التصاعدي
    upstreamPath.forEach((pathEdge, index) => {
        const edgeElement = document.getElementById(`edge-${pathEdge}`);
        if (edgeElement) {
            edgeElement.setAttribute('stroke', '#ff8c00'); // برتقالي
            edgeElement.setAttribute('stroke-width', '3');
        }
    });
    
    // إضاءة المسار التنازلي
    downstreamPath.forEach((pathEdge, index) => {
        const edgeElement = document.getElementById(`edge-${pathEdge}`);
        if (edgeElement) {
            edgeElement.setAttribute('stroke', '#0d6efd'); // أزرق
            edgeElement.setAttribute('stroke-width', '3');
        }
    });
}

/**
 * إعادة تعيين حالة إضاءة جميع الحواف
 */
function resetEdgesHighlighting() {
    networkData.edges.forEach(edge => {
        const edgeElement = document.getElementById(`edge-${edge.id}`);
        if (edgeElement) {
            edgeElement.setAttribute('stroke', edge.style?.stroke || '#6c757d');
            edgeElement.setAttribute('stroke-width', '2');
        }
    });
}

/**
 * البحث عن المسار التصاعدي من العقدة إلى مصدر الطاقة
 * @param {string} nodeId - معرّف العقدة
 * @returns {Array} - مصفوفة تحتوي على معرّفات الحواف في المسار
 */
function findUpstreamPath(nodeId) {
    const path = [];
    let currentNodeId = nodeId;
    
    // البحث المتكرر حتى الوصول إلى مصدر طاقة أو عدم وجود مسار إضافي
    while (currentNodeId) {
        // البحث عن حافة تدخل إلى العقدة الحالية
        const incomingEdge = networkData.edges.find(edge => edge.target === currentNodeId);
        
        if (!incomingEdge) {
            // لا توجد حافة قادمة، نهاية المسار
            break;
        }
        
        // إضافة الحافة إلى المسار
        path.push(incomingEdge.id);
        
        // الانتقال إلى العقدة المصدر
        currentNodeId = incomingEdge.source;
    }
    
    return path;
}

/**
 * البحث عن المسار التنازلي من العقدة إلى الأحمال
 * @param {string} nodeId - معرّف العقدة
 * @returns {Array} - مصفوفة تحتوي على معرّفات الحواف في المسار
 */
function findDownstreamPath(nodeId) {
    const path = [];
    
    // وظيفة تكرارية للبحث عن المسار التنازلي
    function traverseDownstream(currentId) {
        // البحث عن جميع الحواف الخارجة من العقدة الحالية
        const outgoingEdges = networkData.edges.filter(edge => edge.source === currentId);
        
        for (const edge of outgoingEdges) {
            // إضافة الحافة إلى المسار
            path.push(edge.id);
            
            // استمرار البحث بشكل متكرر
            traverseDownstream(edge.target);
        }
    }
    
    // بدء البحث من العقدة المحددة
    traverseDownstream(nodeId);
    
    return path;
}

// ------------------- وظائف مساعدة -------------------

/**
 * البحث عن عقدة بواسطة المعرّف
 * @param {string} nodeId - معرّف العقدة
 * @returns {Object} - بيانات العقدة
 */
function findNodeById(nodeId) {
    return networkData.nodes.find(node => node.id === nodeId);
}

/**
 * الحصول على نوع العقدة من معرّفها
 * @param {string} nodeId - معرّف العقدة
 * @returns {string} - نوع العقدة
 */
function getNodeTypeFromId(nodeId) {
    if (nodeId.startsWith('ps-')) {
        return 'powerSource';
    } else if (nodeId.startsWith('panel-')) {
        return 'panel';
    } else if (nodeId.startsWith('breaker-')) {
        return 'circuitBreaker';
    } else if (nodeId.startsWith('load-')) {
        return 'load';
    } else {
        return 'unknown';
    }
}

/**
 * الحصول على لون حسب نوع العقدة
 * @param {string} nodeType - نوع العقدة
 * @returns {string} - كود اللون
 */
function getTypeColor(nodeType) {
    return typeColors[nodeType] || '#6c757d';
}

// ------------------- الوظائف العالمية المتاحة للاستدعاء من HTML -------------------

/**
 * عرض مسار العنصر المحدد
 * @param {string} nodeId - معرّف العقدة
 */
window.showElementPath = function(nodeId) {
    highlightConnections(nodeId);
    // يمكن إضافة تأثيرات إضافية هنا مثل التمرير إلى القسم المعني
};

/**
 * عرض القواطع الخاصة باللوحة
 * @param {string} panelId - معرّف اللوحة
 */
window.showPanelBreakers = function(panelId) {
    // إظهار القواطع المرتبطة باللوحة
    // ...
    console.log(`عرض قواطع اللوحة ${panelId}`);
};

/**
 * تحميل بيانات الشبكة من واجهة برمجة التطبيقات
 * @returns {Promise<boolean>} نجاح أو فشل العملية
 */
async function loadNetworkData() {
    try {
        // جلب جميع العناصر
        const powerSourcesResponse = await NetworkAPI.getPowerSources();
        const panelsResponse = await NetworkAPI.getPanels();
        const breakersResponse = await NetworkAPI.getCircuitBreakers();
        const loadsResponse = await NetworkAPI.getLoads();
        
        if (!powerSourcesResponse.success || !panelsResponse.success || 
            !breakersResponse.success || !loadsResponse.success) {
            throw new Error('فشل في جلب بيانات الشبكة');
        }
        
        const powerSources = powerSourcesResponse.data;
        const panels = panelsResponse.data;
        const breakers = breakersResponse.data;
        const loads = loadsResponse.data;
        
        // تهيئة العلاقات والهيكل الشجري
        buildNetworkHierarchy(powerSources, panels, breakers, loads);
        
        // توزيع العناصر بشكل متوازن على المخطط
        positionNetworkElements();
        
        console.log('تم تحميل بيانات الشبكة بنجاح:', networkData);
        return true;
    } catch (error) {
        console.error('خطأ في تحميل بيانات الشبكة:', error);
        return false;
    }
}

/**
 * بناء هيكل شجري للشبكة الكهربائية
 * @param {Array} powerSources - مصادر الطاقة
 * @param {Array} panels - اللوحات الكهربائية
 * @param {Array} breakers - القواطع
 * @param {Array} loads - الأحمال
 */
function buildNetworkHierarchy(powerSources, panels, breakers, loads) {
    networkData.nodes = [];
    networkData.edges = [];
    
    // إنشاء نظام لتتبع العلاقات بين العناصر
    const hierarchy = {
        powerSources: {},
        panels: {},
        breakers: {},
        loads: {}
    };
    
    // إضافة مصادر الطاقة
    powerSources.forEach(source => {
        const nodeId = `ps-${source.id}`;
        networkData.nodes.push({
            id: nodeId,
            type: 'input',
            data: { 
                label: source.name,
                entityType: 'powerSource',
                sourceData: source,
                children: []
            },
            position: { x: 0, y: 0 }, // سيتم تحديد الإحداثيات لاحقاً
            style: { 
                background: typeColors.powerSource, 
                color: 'white',
                border: '1px solid #222138',
                width: 180,
                borderRadius: '5px'
            }
        });
        
        // إضافة للهيكل التتبعي
        hierarchy.powerSources[source.id] = { 
            nodeId, 
            childPanels: [] 
        };
    });
    
    // إضافة اللوحات وربطها بمصادر الطاقة
    panels.forEach(panel => {
        const nodeId = `panel-${panel.id}`;
        networkData.nodes.push({
            id: nodeId,
            data: { 
                label: panel.name,
                entityType: 'panel',
                sourceData: panel,
                children: []
            },
            position: { x: 0, y: 0 }, // سيتم تحديد الإحداثيات لاحقاً
            style: { 
                background: typeColors.panel, 
                color: 'white',
                border: '1px solid #222138',
                width: 180,
                borderRadius: '5px'
            }
        });
        
        // إضافة للهيكل التتبعي
        hierarchy.panels[panel.id] = { 
            nodeId,
            powerSourceId: panel.power_source,
            parentPanelId: panel.parent_panel,
            childPanels: [],
            breakers: []
        };
        
        // ربط اللوحة بمصدر الطاقة
        if (panel.power_source) {
            networkData.edges.push({
                id: `ps${panel.power_source}-panel${panel.id}`,
                source: `ps-${panel.power_source}`,
                target: nodeId,
                animated: true,
                style: { stroke: typeColors.powerSource },
                label: 'يغذي'
            });
            
            // تحديث الهيكل التتبعي
            const powerSource = hierarchy.powerSources[panel.power_source];
            if (powerSource) {
                powerSource.childPanels.push(panel.id);
            }
        }
        
        // ربط اللوحة بلوحة الأم
        if (panel.parent_panel) {
            networkData.edges.push({
                id: `panel${panel.parent_panel}-panel${panel.id}`,
                source: `panel-${panel.parent_panel}`,
                target: nodeId,
                animated: true,
                style: { stroke: typeColors.panel },
                label: 'أم'
            });
            
            // تحديث الهيكل التتبعي
            const parentPanel = hierarchy.panels[panel.parent_panel];
            if (parentPanel) {
                parentPanel.childPanels.push(panel.id);
            }
        }
    });
    
    // إضافة القواطع وربطها باللوحات
    breakers.forEach(breaker => {
        const nodeId = `breaker-${breaker.id}`;
        networkData.nodes.push({
            id: nodeId,
            data: { 
                label: breaker.name || `قاطع ${breaker.id}`,
                entityType: 'circuitBreaker',
                sourceData: breaker,
                children: []
            },
            position: { x: 0, y: 0 }, // سيتم تحديد الإحداثيات لاحقاً
            style: { 
                background: typeColors.circuitBreaker, 
                color: '#333',
                border: '1px solid #222138',
                width: 150,
                borderRadius: '5px'
            }
        });
        
        // إضافة للهيكل التتبعي
        hierarchy.breakers[breaker.id] = { 
            nodeId,
            panelId: breaker.panel,
            feedingBreakers: breaker.feeding_breakers || [],
            loads: []
        };
        
        // ربط القاطع باللوحة
        if (breaker.panel) {
            networkData.edges.push({
                id: `panel${breaker.panel}-breaker${breaker.id}`,
                source: `panel-${breaker.panel}`,
                target: nodeId,
                style: { stroke: typeColors.panel }
            });
            
            // تحديث الهيكل التتبعي
            const panel = hierarchy.panels[breaker.panel];
            if (panel) {
                panel.breakers.push(breaker.id);
            }
        }
        
        // ربط القواطع المغذية
        if (breaker.feeding_breakers && breaker.feeding_breakers.length > 0) {
            breaker.feeding_breakers.forEach(feederId => {
                networkData.edges.push({
                    id: `breaker${feederId}-breaker${breaker.id}`,
                    source: `breaker-${feederId}`,
                    target: nodeId,
                    animated: true,
                    style: { stroke: typeColors.circuitBreaker, strokeDasharray: '5, 5' },
                    label: 'يغذي'
                });
            });
        }
    });
    
    // إضافة الأحمال وربطها بالقواطع
    loads.forEach(load => {
        const nodeId = `load-${load.id}`;
        networkData.nodes.push({
            id: nodeId,
            type: 'output',
            data: { 
                label: load.name,
                entityType: 'load',
                sourceData: load 
            },
            position: { x: 0, y: 0 }, // سيتم تحديد الإحداثيات لاحقاً
            style: { 
                background: typeColors.load, 
                color: 'white',
                border: '1px solid #222138',
                width: 150,
                borderRadius: '5px'
            }
        });
        
        // إضافة للهيكل التتبعي
        hierarchy.loads[load.id] = { 
            nodeId,
            breakerId: load.breaker
        };
        
        // ربط الحمل بالقاطع
        if (load.breaker) {
            networkData.edges.push({
                id: `breaker${load.breaker}-load${load.id}`,
                source: `breaker-${load.breaker}`,
                target: nodeId,
                style: { stroke: typeColors.load }
            });
            
            // تحديث الهيكل التتبعي
            const breaker = hierarchy.breakers[load.breaker];
            if (breaker) {
                breaker.loads.push(load.id);
            }
        }
    });
    
    // حفظ الهيكل للاستخدام لاحقاً
    networkData.hierarchy = hierarchy;
    
    // إنشاء الروابط المباشرة بين اللوحات والأحمال
    createDirectPanelToLoadConnections();
}

/**
 * توزيع عناصر الشبكة بشكل تلقائي ومتوازن
 */
function positionNetworkElements() {
    const hierarchy = networkData.hierarchy;
    
    // المسافات والأبعاد الثابتة - زيادة المسافات لتقليل التداخل
    const LEVEL_HEIGHT = 250;  // زيادة المسافة الرأسية بين المستويات
    const NODE_WIDTH = 200;    // زيادة عرض العقدة
    const NODE_SPACING = 100;  // زيادة المسافة الأفقية بين العقد
    
    let currentY = 50;  // بداية من أعلى قليلاً
    
    // حساب عدد العناصر في كل مستوى للتوزيع الأفضل
    function calculateLevelWidths() {
        const levelWidths = new Map();
        
        // المستوى الأول: مصادر الطاقة
        const powerSources = Object.values(hierarchy.powerSources);
        levelWidths.set(0, powerSources.length);
        
        // المستوى الثاني: اللوحات الرئيسية
        let mainPanels = 0;
        powerSources.forEach(source => {
            mainPanels += source.childPanels.length;
        });
        levelWidths.set(1, mainPanels);
        
        // المستويات الأخرى: اللوحات الفرعية والقواطع والأحمال
        let currentLevel = 2;
        let hasMore = true;
        
        while (hasMore) {
            hasMore = false;
            let count = 0;
            
            Object.values(hierarchy.panels).forEach(panel => {
                const depth = calculatePanelDepth(panel.nodeId);
                if (depth === currentLevel) {
                    count += panel.breakers.length;
                    hasMore = true;
                }
            });
            
            if (hasMore) {
                levelWidths.set(currentLevel, count);
                currentLevel++;
            }
        }
        
        return levelWidths;
    }
    
    // حساب عمق اللوحة في الهيكل الشجري
    function calculatePanelDepth(panelId) {
        let depth = 0;
        let currentPanel = hierarchy.panels[panelId.replace('panel-', '')];
        
        while (currentPanel && currentPanel.parentPanelId) {
            depth++;
            currentPanel = hierarchy.panels[currentPanel.parentPanelId];
        }
        
        return depth;
    }
    
    // توزيع مصادر الطاقة في الأعلى
    const powerSources = Object.values(hierarchy.powerSources);
    const powerSourceWidth = (powerSources.length * NODE_WIDTH) + ((powerSources.length - 1) * NODE_SPACING);
    let startX = window.innerWidth / 2 - (powerSourceWidth / 2);  // توسيط في وسط الشاشة
    
    powerSources.forEach((source, index) => {
        const node = findNodeById(source.nodeId);
        if (node) {
            node.position = {
                x: startX + (index * (NODE_WIDTH + NODE_SPACING)),
                y: currentY
            };
        }
    });
    
    // توزيع اللوحات والعناصر التابعة بشكل منظم
    function positionChildren(parentId, level, parentX) {
        const children = [];
        let totalWidth = 0;
        
        // جمع جميع العناصر التابعة
        if (parentId.startsWith('ps-')) {
            const source = hierarchy.powerSources[parentId.replace('ps-', '')];
            if (source) {
                children.push(...source.childPanels.map(id => ({
                    type: 'panel',
                    id: `panel-${id}`
                })));
            }
        } else if (parentId.startsWith('panel-')) {
            const panel = hierarchy.panels[parentId.replace('panel-', '')];
            if (panel) {
                // إضافة اللوحات الفرعية أولاً
                children.push(...panel.childPanels.map(id => ({
                    type: 'panel',
                    id: `panel-${id}`
                })));
                
                // ثم إضافة القواطع
                children.push(...panel.breakers.map(id => ({
                    type: 'breaker',
                    id: `breaker-${id}`
                })));
            }
        } else if (parentId.startsWith('breaker-')) {
            const breaker = hierarchy.breakers[parentId.replace('breaker-', '')];
            if (breaker) {
                children.push(...breaker.loads.map(id => ({
                    type: 'load',
                    id: `load-${id}`
                })));
            }
        }
        
        if (children.length === 0) return 0;
        
        // حساب العرض الكلي المطلوب
        totalWidth = (children.length * NODE_WIDTH) + ((children.length - 1) * NODE_SPACING);
        let startX = parentX - (totalWidth / 2) + (NODE_WIDTH / 2);
        
        // توزيع العناصر
        children.forEach((child, index) => {
            const node = findNodeById(child.id);
            if (node) {
                const x = startX + (index * (NODE_WIDTH + NODE_SPACING));
                const y = currentY + (level * LEVEL_HEIGHT);
                
                node.position = { x, y };
                
                // توزيع العناصر التابعة بشكل متكرر
                positionChildren(child.id, level + 1, x);
            }
        });
        
        return totalWidth;
    }
    
    // بدء التوزيع من مصادر الطاقة
    currentY += LEVEL_HEIGHT;
    powerSources.forEach(source => {
        const sourceNode = findNodeById(source.nodeId);
        if (sourceNode) {
            positionChildren(source.nodeId, 1, sourceNode.position.x);
        }
    });

    // تحديث المسارات بعد التوزيع
    updateEdgePaths();
}

// تحديث مسارات التوصيل لتجنب التداخل
function updateEdgePaths() {
    networkData.edges.forEach(edge => {
        const sourceNode = findNodeById(edge.source);
        const targetNode = findNodeById(edge.target);
        
        if (!sourceNode || !targetNode) return;
        
        // حساب نقاط التحكم للمنحنى
        const sourceX = sourceNode.position.x + (sourceNode.style?.width || 150) / 2;
        const sourceY = sourceNode.position.y + 40; // نهاية العقدة المصدر
        const targetX = targetNode.position.x + (targetNode.style?.width || 150) / 2;
        const targetY = targetNode.position.y; // بداية العقدة الهدف
        
        // حساب نقاط التحكم للمنحنى بيزير
        const dx = Math.abs(targetX - sourceX);
        const dy = Math.abs(targetY - sourceY);
        const curve = Math.min(dx / 2, 100); // تقليل انحناء المنحنى
        
        // إنشاء مسار منحني
        const path = `M ${sourceX},${sourceY} 
                     C ${sourceX},${sourceY + curve} 
                       ${targetX},${targetY - curve} 
                       ${targetX},${targetY}`;
        
        // تحديث المسار
        const edgeElement = document.getElementById(`edge-${edge.id}`);
        if (edgeElement) {
            edgeElement.setAttribute('d', path);
        }
    });
}

// ينفذ عند تحميل المستند
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // تحميل البيانات أولاً
        await loadNetworkData();
        
        // ثم تهيئة المخطط بعد تحميل البيانات بنجاح
        initializeNetworkVisualizer();
    } catch (error) {
        console.error('حدث خطأ أثناء تهيئة الصفحة:', error);
        document.getElementById('loadingIndicator').style.display = 'none';
        alert('حدث خطأ أثناء تحميل بيانات الشبكة. يرجى تحديث الصفحة والمحاولة مرة أخرى.');
    }
});