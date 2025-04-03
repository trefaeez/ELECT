/**
 * network_visualizer.js
 * يوفر وظائف لعرض وتصور شبكة الطاقة الكهربائية بشكل رسومي
 * مبني على مكتبة ReactFlow للمخططات التفاعلية
 */

import { PowerSourceAPI, PanelAPI, CircuitBreakerAPI, LoadAPI } from './api_endpoints.js';

/**
 * فئة لعرض وتصور شبكة الطاقة الكهربائية
 */
export class NetworkVisualizer {
    /**
     * إنشاء كائن جديد من المصور
     * @param {string} containerId - معرف عنصر الحاوية للرسم البياني
     */
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`لم يتم العثور على عنصر بالمعرف: ${containerId}`);
            return;
        }
        
        // تهيئة الخصائص
        this.width = this.container.clientWidth;
        this.height = 600;
        this.flowInstance = null;
        
        // الألوان لكل نوع من العناصر
        this.colors = {
            powerSource: '#dc3545', // أحمر
            panel: '#198754',       // أخضر
            circuitBreaker: '#ffc107', // أصفر
            load: '#0d6efd'         // أزرق
        };
        
        // بيانات الشبكة
        this.networkData = {
            nodes: [],
            edges: []
        };
        
        // تهيئة مكتبة ReactFlow
        this.initReactFlow();
    }
    
    /**
     * تهيئة مكتبة ReactFlow
     */
    initReactFlow() {
        // إضافة مكتبة ReactFlow إذا لم تكن موجودة بالفعل
        if (!document.getElementById('reactflow-script')) {
            const reactFlowScript = document.createElement('script');
            reactFlowScript.id = 'reactflow-script';
            reactFlowScript.src = 'https://unpkg.com/react@17/umd/react.production.min.js';
            document.head.appendChild(reactFlowScript);
            
            const reactDOMScript = document.createElement('script');
            reactDOMScript.src = 'https://unpkg.com/react-dom@17/umd/react-dom.production.min.js';
            document.head.appendChild(reactDOMScript);
            
            const reactFlowStylesheet = document.createElement('link');
            reactFlowStylesheet.rel = 'stylesheet';
            reactFlowStylesheet.href = 'https://unpkg.com/reactflow/dist/style.css';
            document.head.appendChild(reactFlowStylesheet);
            
            const reactFlowLibScript = document.createElement('script');
            reactFlowLibScript.src = 'https://unpkg.com/reactflow/dist/umd/reactflow.min.js';
            reactFlowLibScript.onload = () => {
                // عند اكتمال تحميل المكتبة، نعيد تهيئة المخطط
                this.renderNetworkAfterLibLoad();
            };
            document.head.appendChild(reactFlowLibScript);
        } else {
            // المكتبة محملة بالفعل، يمكننا الاستمرار في التهيئة
            this.renderNetworkAfterLibLoad();
        }
    }
    
    /**
     * تحديث أبعاد الرسم البياني
     */
    updateDimensions() {
        this.width = this.container.clientWidth;
        this.container.style.height = `${this.height}px`;
        
        if (this.flowInstance && typeof this.flowInstance.fitView === 'function') {
            this.flowInstance.fitView();
        }
    }
    
    /**
     * تحميل بيانات الشبكة من واجهة برمجة التطبيقات
     * @returns {Promise} وعد يتم حله عند اكتمال تحميل البيانات
     */
    async loadNetworkData() {
        try {
            // جلب جميع العناصر
            const powerSourcesResponse = await PowerSourceAPI.getAll();
            const panelsResponse = await PanelAPI.getAll();
            const breakersResponse = await CircuitBreakerAPI.getAll();
            const loadsResponse = await LoadAPI.getAll();
            
            if (!powerSourcesResponse.success || !panelsResponse.success || 
                !breakersResponse.success || !loadsResponse.success) {
                throw new Error('فشل في جلب بيانات الشبكة');
            }
            
            const powerSources = powerSourcesResponse.data;
            const panels = panelsResponse.data;
            const breakers = breakersResponse.data;
            const loads = loadsResponse.data;
            
            // إعداد العقد (nodes)
            this.networkData.nodes = [];
            
            // إضافة مصادر الطاقة
            let xPos = 100;
            let yPos = 100;
            
            powerSources.forEach((source, index) => {
                this.networkData.nodes.push({
                    id: `ps-${source.id}`,
                    type: 'input',
                    data: { 
                        label: source.name,
                        entityType: 'powerSource',
                        sourceData: source 
                    },
                    position: { x: xPos, y: yPos },
                    style: { 
                        background: this.colors.powerSource, 
                        color: 'white',
                        border: '1px solid #222138',
                        width: 180,
                        borderRadius: '5px'
                    }
                });
                xPos += 300;
                if ((index + 1) % 3 === 0) {
                    xPos = 100;
                    yPos += 150;
                }
            });
            
            // إضافة اللوحات
            xPos = 150;
            yPos += 150;
            
            panels.forEach((panel, index) => {
                this.networkData.nodes.push({
                    id: `panel-${panel.id}`,
                    data: { 
                        label: panel.name,
                        entityType: 'panel',
                        sourceData: panel 
                    },
                    position: { x: xPos, y: yPos },
                    style: { 
                        background: this.colors.panel, 
                        color: 'white',
                        border: '1px solid #222138',
                        width: 180,
                        borderRadius: '5px'
                    }
                });
                xPos += 250;
                if ((index + 1) % 4 === 0) {
                    xPos = 150;
                    yPos += 120;
                }
            });
            
            // إضافة القواطع
            xPos = 200;
            yPos += 150;
            
            breakers.forEach((breaker, index) => {
                this.networkData.nodes.push({
                    id: `breaker-${breaker.id}`,
                    data: { 
                        label: breaker.name || `قاطع ${breaker.id}`,
                        entityType: 'circuitBreaker',
                        sourceData: breaker 
                    },
                    position: { x: xPos, y: yPos },
                    style: { 
                        background: this.colors.circuitBreaker, 
                        color: '#333',
                        border: '1px solid #222138',
                        width: 150,
                        borderRadius: '5px'
                    }
                });
                xPos += 200;
                if ((index + 1) % 5 === 0) {
                    xPos = 200;
                    yPos += 100;
                }
            });
            
            // إضافة الأحمال
            xPos = 250;
            yPos += 150;
            
            loads.forEach((load, index) => {
                this.networkData.nodes.push({
                    id: `load-${load.id}`,
                    type: 'output',
                    data: { 
                        label: load.name,
                        entityType: 'load',
                        sourceData: load 
                    },
                    position: { x: xPos, y: yPos },
                    style: { 
                        background: this.colors.load, 
                        color: 'white',
                        border: '1px solid #222138',
                        width: 150,
                        borderRadius: '5px'
                    }
                });
                xPos += 180;
                if ((index + 1) % 6 === 0) {
                    xPos = 250;
                    yPos += 80;
                }
            });
            
            // إعداد الحواف (edges)
            this.networkData.edges = [];
            
            // روابط مصادر الطاقة إلى اللوحات
            panels.forEach(panel => {
                if (panel.power_source) {
                    this.networkData.edges.push({
                        id: `ps${panel.power_source}-panel${panel.id}`,
                        source: `ps-${panel.power_source}`,
                        target: `panel-${panel.id}`,
                        animated: true,
                        style: { stroke: '#dc3545' },
                        label: 'يغذي'
                    });
                }
            });
            
            // روابط اللوحات الأم إلى اللوحات الفرعية
            panels.forEach(panel => {
                if (panel.parent_panel) {
                    this.networkData.edges.push({
                        id: `panel${panel.parent_panel}-panel${panel.id}`,
                        source: `panel-${panel.parent_panel}`,
                        target: `panel-${panel.id}`,
                        animated: true,
                        style: { stroke: '#198754' },
                        label: 'أم'
                    });
                }
            });
            
            // روابط اللوحات إلى القواطع
            breakers.forEach(breaker => {
                if (breaker.panel) {
                    this.networkData.edges.push({
                        id: `panel${breaker.panel}-breaker${breaker.id}`,
                        source: `panel-${breaker.panel}`,
                        target: `breaker-${breaker.id}`,
                        style: { stroke: '#ffc107' }
                    });
                }
            });
            
            // روابط القواطع إلى الأحمال
            loads.forEach(load => {
                if (load.breaker) {
                    this.networkData.edges.push({
                        id: `breaker${load.breaker}-load${load.id}`,
                        source: `breaker-${load.breaker}`,
                        target: `load-${load.id}`,
                        style: { stroke: '#0d6efd' }
                    });
                }
            });
            
            // روابط للقواطع المغذية
            breakers.forEach(breaker => {
                if (breaker.feeding_breakers && breaker.feeding_breakers.length > 0) {
                    breaker.feeding_breakers.forEach(feederId => {
                        this.networkData.edges.push({
                            id: `breaker${feederId}-breaker${breaker.id}`,
                            source: `breaker-${feederId}`,
                            target: `breaker-${breaker.id}`,
                            animated: true,
                            style: { stroke: '#ffc107', strokeDasharray: '5, 5' },
                            label: 'يغذي'
                        });
                    });
                }
            });
            
            return true;
        } catch (error) {
            console.error('خطأ في تحميل بيانات الشبكة:', error);
            return false;
        }
    }
    
    /**
     * رسم الشبكة باستخدام ReactFlow بعد تحميل المكتبة
     */
    renderNetworkAfterLibLoad() {
        if (typeof ReactFlow === 'undefined') {
            console.error('مكتبة ReactFlow غير محملة');
            setTimeout(() => this.renderNetworkAfterLibLoad(), 500);
            return;
        }
        
        // تهيئة حاوية ReactFlow إذا لم تكن موجودة
        const flowContainer = document.createElement('div');
        flowContainer.style.width = '100%';
        flowContainer.style.height = '100%';
        
        // مسح الحاوية الأصلية وإضافة حاوية ReactFlow
        this.container.innerHTML = '';
        this.container.appendChild(flowContainer);
        this.container.style.height = `${this.height}px`;
        
        // إنشاء مكونات التحكم
        this.createFlowControls();
        
        const { ReactFlowProvider, ReactFlow, Background, Controls } = window.ReactFlow;
        
        // تهيئة خيارات ReactFlow
        const reactFlowOptions = {
            nodes: this.networkData.nodes,
            edges: this.networkData.edges,
            fitView: true,
            connectionLineStyle: { stroke: '#ddd', strokeWidth: 2 },
            snapToGrid: true,
            snapGrid: [16, 16],
            nodesDraggable: true,
            elementsSelectable: true,
            zoomOnScroll: true,
            zoomOnPinch: true,
            onNodeClick: this.handleNodeClick.bind(this),
            onConnect: this.handleConnect.bind(this)
        };
        
        // عرض مخطط ReactFlow
        ReactDOM.render(
            React.createElement(
                ReactFlowProvider,
                null,
                React.createElement(
                    ReactFlow,
                    {
                        ...reactFlowOptions,
                        style: { background: '#f8f8f8' },
                        onLoad: (instance) => {
                            this.flowInstance = instance;
                            instance.fitView({ padding: 0.2 });
                        }
                    },
                    [
                        React.createElement(Background, { color: '#aaa', gap: 16 }),
                        React.createElement(Controls)
                    ]
                )
            ),
            flowContainer
        );
        
        // إضافة مفتاح توضيحي للألوان
        this.createLegend();
    }
    
    /**
     * إضافة مفتاح توضيحي للألوان
     */
    createLegend() {
        const legend = document.createElement('div');
        legend.className = 'network-legend';
        legend.style.position = 'absolute';
        legend.style.bottom = '10px';
        legend.style.left = '10px';
        legend.style.background = 'rgba(255, 255, 255, 0.9)';
        legend.style.padding = '10px';
        legend.style.borderRadius = '5px';
        legend.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.2)';
        
        const items = [
            { name: 'مصادر الطاقة', color: this.colors.powerSource },
            { name: 'اللوحات', color: this.colors.panel },
            { name: 'القواطع', color: this.colors.circuitBreaker },
            { name: 'الأحمال', color: this.colors.load }
        ];
        
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.style.display = 'flex';
            itemElement.style.alignItems = 'center';
            itemElement.style.marginBottom = '5px';
            
            const colorBox = document.createElement('div');
            colorBox.style.width = '15px';
            colorBox.style.height = '15px';
            colorBox.style.backgroundColor = item.color;
            colorBox.style.marginLeft = '8px';
            colorBox.style.borderRadius = '3px';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = item.name;
            nameSpan.style.fontSize = '12px';
            
            itemElement.appendChild(colorBox);
            itemElement.appendChild(nameSpan);
            legend.appendChild(itemElement);
        });
        
        this.container.appendChild(legend);
    }
    
    /**
     * إنشاء عناصر التحكم في المخطط
     */
    createFlowControls() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'flow-custom-controls';
        controlsContainer.style.position = 'absolute';
        controlsContainer.style.bottom = '10px';
        controlsContainer.style.right = '10px';
        controlsContainer.style.zIndex = '5';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.gap = '5px';
        
        // زر التكبير
        const zoomInBtn = document.createElement('button');
        zoomInBtn.className = 'btn btn-sm btn-light';
        zoomInBtn.innerHTML = '<i class="fas fa-search-plus"></i>';
        zoomInBtn.title = 'تكبير';
        zoomInBtn.onclick = () => {
            if (this.flowInstance) {
                this.flowInstance.zoomIn();
            }
        };
        
        // زر التصغير
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.className = 'btn btn-sm btn-light';
        zoomOutBtn.innerHTML = '<i class="fas fa-search-minus"></i>';
        zoomOutBtn.title = 'تصغير';
        zoomOutBtn.onclick = () => {
            if (this.flowInstance) {
                this.flowInstance.zoomOut();
            }
        };
        
        // زر إعادة ضبط العرض
        const fitViewBtn = document.createElement('button');
        fitViewBtn.className = 'btn btn-sm btn-light';
        fitViewBtn.innerHTML = '<i class="fas fa-expand"></i>';
        fitViewBtn.title = 'ملء الشاشة';
        fitViewBtn.onclick = () => {
            if (this.flowInstance) {
                this.flowInstance.fitView({ padding: 0.2 });
            }
        };
        
        // إضافة الأزرار إلى الحاوية
        controlsContainer.appendChild(zoomInBtn);
        controlsContainer.appendChild(zoomOutBtn);
        controlsContainer.appendChild(fitViewBtn);
        
        // إضافة الحاوية إلى المخطط
        this.container.appendChild(controlsContainer);
    }
    
    /**
     * معالج الضغط على عقدة
     * @param {Event} event - حدث الضغط
     * @param {Object} node - العقدة التي تم الضغط عليها
     */
    handleNodeClick(event, node) {
        // يمكن إضافة منطق للتعامل مع النقر على العقد
        console.log('تم النقر على العقدة:', node);
        
        // إظهار معلومات عن العنصر المحدد
        const nodeType = node.data.entityType;
        const nodeData = node.data.sourceData;
        
        // تنفيذ إجراء عند النقر على العقدة (مثل إظهار نافذة معلومات)
        this.showNodeDetails(nodeType, nodeData);
    }
    
    /**
     * معالج ربط العناصر
     * @param {Object} params - معلمات الاتصال
     */
    handleConnect(params) {
        // يمكن إضافة منطق للتعامل مع ربط العناصر
        console.log('تم ربط عنصرين:', params);
    }
    
    /**
     * عرض تفاصيل العنصر المحدد
     * @param {string} nodeType - نوع العقدة
     * @param {Object} nodeData - بيانات العقدة
     */
    showNodeDetails(nodeType, nodeData) {
        // يمكن تنفيذ منطق لعرض معلومات تفصيلية عن العنصر المحدد
        // على سبيل المثال، يمكن إظهار نافذة منبثقة أو تحديث منطقة معلومات
        
        // إذا كان هناك وظيفة خارجية للتعامل مع تحديد العنصر
        if (typeof this.onNodeSelectCallback === 'function') {
            this.onNodeSelectCallback({
                type: nodeType,
                data: nodeData
            });
        }
    }
    
    /**
     * تعيين وظيفة الاستدعاء عند تحديد عقدة
     * @param {Function} callback - وظيفة الاستدعاء
     */
    onNodeSelect(callback) {
        this.onNodeSelectCallback = callback;
    }
    
    /**
     * تصدير المخطط كصورة
     * @returns {string} رابط الصورة
     */
    exportAsImage() {
        // إذا كانت خاصية html2canvas متاحة، نستخدمها لتصدير المخطط كصورة
        if (typeof html2canvas !== 'undefined' && this.container) {
            return new Promise((resolve, reject) => {
                html2canvas(this.container).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    resolve(imgData);
                }).catch(error => {
                    console.error('خطأ في تصدير المخطط كصورة:', error);
                    reject(error);
                });
            });
        } else {
            console.error('مكتبة html2canvas غير متاحة');
            return null;
        }
    }
    
    /**
     * تحميل ورسم الشبكة
     * @returns {Promise} وعد يتم حله عند اكتمال العملية
     */
    async visualize() {
        const success = await this.loadNetworkData();
        
        if (success && typeof ReactFlow !== 'undefined') {
            this.renderNetworkAfterLibLoad();
            
            // إضافة استجابة لتغيير حجم النافذة
            window.addEventListener('resize', () => {
                this.updateDimensions();
            });
            
            return true;
        }
        
        return false;
    }
}