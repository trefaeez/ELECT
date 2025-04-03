/**
* مكون مصور الشبكة الكهربائية باستخدام مكتبة GoJS
 * يعالج مشكلة تقاطع الخطوط مع العناصر ويوفر عرضًا أكثر احترافية للمخططات
 * 
 * @module GoJSNetworkVisualizer
 * @author Taha
 * @version 1.0.0
 */

// استيراد مكتبة GoJS من الملف المحلي
import * as go from '/static/js/libs/gojs/go.js';

/**
 * فئة مصور الشبكة الكهربائية باستخدام GoJS
 */
export class GoJSNetworkVisualizer {
    /**
     * إنشاء مثيل جديد من مصور الشبكة
     * @param {string} containerId - معرّف العنصر الحاوي للمخطط
     */
    constructor(containerId) {
        // التأكد من تحميل مكتبة GoJS
        if (!window.go && !go) {
            console.error('مكتبة GoJS غير محملة بشكل صحيح');
            throw new Error('GoJS library not loaded correctly');
        }
        
        // استخدم go من النطاق العام إذا كان متاحًا، وإلا استخدم المستورد
        this.go = window.go || go;
        
        this.containerId = containerId;
        this.diagram = null;
        this.nodeDataArray = [];
        this.linkDataArray = [];
        this.selectedNode = null;
        this.nodeSelectionCallback = null;
        
        // بيانات العناصر المختلفة
        this.powerSources = [];
        this.panels = [];
        this.circuitBreakers = [];
        this.loads = [];
        
        // تهيئة المخطط
        this.initDiagram();
    }
    
    /**
     * تهيئة مخطط GoJS
     * @private
     */
    initDiagram() {
        // استخدام الإشارة إلى كائن go من النطاق الخاص بالفئة
        const $ = this.go.GraphObject.make;
        
        // إنشاء مخطط GoJS
        this.diagram = $(this.go.Diagram, this.containerId, {
            initialContentAlignment: this.go.Spot.Center,  // محاذاة المحتوى للمنتصف
            allowDrop: false,                         // تعطيل السحب والإفلات
            "undoManager.isEnabled": true,            // تمكين التراجع
            maxSelectionCount: 1,                     // السماح بتحديد عنصر واحد فقط
            "animationManager.isEnabled": true,       // تمكين التحريكات
            "toolManager.hoverDelay": 100,            // تقليل تأخير التحويم
            padding: 20,                              // هامش داخلي
            "grid.visible": true,                     // إظهار الشبكة
            "grid.gridCellSize": new this.go.Size(20, 20), // حجم خلية الشبكة
            "grid.background": "rgba(0,0,0,0.02)",    // لون خلفية الشبكة
            // تخطيط بسيط متوافق مع معظم إصدارات GoJS
            layout: $(this.go.LayeredDigraphLayout, {
                direction: 90,                        // من أعلى إلى أسفل
                columnSpacing: 40,                    // المسافة بين الأعمدة
                layerSpacing: 80,                     // المسافة بين الطبقات
                setsPortSpots: true,                  // تعيين نقاط المنافذ تلقائيًا
                packOption: 3                         // استخدام أرقام بدلاً من الثوابت
            })
        });
        
        // إنشاء قالب للعقد (مصدر الطاقة)
        this.diagram.nodeTemplateMap.add("powerSource",
            $(this.go.Node, "Spot",
                {
                    selectable: true,
                    selectionAdorned: true,
                    selectionObjectName: "SHAPE",
                    locationSpot: this.go.Spot.Center,
                    resizable: false,
                    resizeObjectName: "SHAPE",
                    toolTip: this.makeNodeToolTip(),
                },
                new this.go.Binding("location", "loc", this.go.Point.parse).makeTwoWay(this.go.Point.stringify),
                $(this.go.Panel, "Auto",
                    $(this.go.Shape, "Ellipse",
                        {
                            name: "SHAPE",
                            fill: "#dc3545",
                            stroke: "darkred",
                            strokeWidth: 2,
                            portId: "",
                            width: 70,
                            height: 70,
                            cursor: "pointer",
                        },
                        // ربط اللون بالحالة المحددة
                        new this.go.Binding("stroke", "isSelected", function(sel) { return sel ? "#0d6efd" : "darkred"; }).ofObject(),
                        new this.go.Binding("strokeWidth", "isSelected", function(sel) { return sel ? 4 : 2; }).ofObject()
                    ),
                    $(this.go.Panel, "Vertical",
                        { alignment: this.go.Spot.Center },
                        $(this.go.Shape, "Triangle",
                            {
                                width: 24,
                                height: 24,
                                fill: "white",
                                stroke: null
                            }
                        ),
                        $(this.go.TextBlock,
                            {
                                margin: new this.go.Margin(5, 0, 0, 0),
                                font: "bold 12px sans-serif",
                                stroke: "white",
                                textAlign: "center"
                            },
                            new this.go.Binding("text", "name")
                        )
                    )
                ),
                // معالج النقر على العقدة
                {
                    click: (e, node) => this.handleNodeClick(e, node)
                }
            )
        );
        
        // إنشاء قالب للعقد (لوحة كهربائية)
        this.diagram.nodeTemplateMap.add("panel",
            $(this.go.Node, "Spot",
                {
                    selectable: true,
                    selectionAdorned: true,
                    selectionObjectName: "SHAPE",
                    locationSpot: this.go.Spot.Center,
                    resizable: false,
                    resizeObjectName: "SHAPE",
                    toolTip: this.makeNodeToolTip(),
                },
                new this.go.Binding("location", "loc", this.go.Point.parse).makeTwoWay(this.go.Point.stringify),
                $(this.go.Panel, "Auto",
                    $(this.go.Shape, "RoundedRectangle",
                        {
                            name: "SHAPE",
                            fill: "#198754",
                            stroke: "darkgreen",
                            strokeWidth: 2,
                            portId: "",
                            width: 100,
                            height: 60,
                            cursor: "pointer",
                        },
                        // ربط اللون بالحالة المحددة
                        new this.go.Binding("stroke", "isSelected", function(sel) { return sel ? "#0d6efd" : "darkgreen"; }).ofObject(),
                        new this.go.Binding("strokeWidth", "isSelected", function(sel) { return sel ? 4 : 2; }).ofObject()
                    ),
                    $(this.go.Panel, "Vertical",
                        { alignment: this.go.Spot.Center },
                        $(this.go.Shape, "TriangleUp",
                            {
                                width: 14,
                                height: 14,
                                fill: "white",
                                stroke: null
                            }
                        ),
                        $(this.go.TextBlock,
                            {
                                margin: new this.go.Margin(5, 0, 0, 0),
                                font: "bold 12px sans-serif",
                                stroke: "white",
                                textAlign: "center"
                            },
                            new this.go.Binding("text", "name")
                        ),
                        $(this.go.TextBlock,
                            {
                                margin: new this.go.Margin(2, 0, 0, 0),
                                font: "10px sans-serif",
                                stroke: "white",
                                textAlign: "center"
                            },
                            new this.go.Binding("text", "panel_type", function(type) {
                                return type === 'main' ? 'رئيسية' :
                                       type === 'sub_main' ? 'رئيسية فرعية' :
                                       type === 'sub' ? 'فرعية' :
                                       type === 'distribution' ? 'توزيع' : type;
                            })
                        )
                    )
                ),
                // معالج النقر على العقدة
                {
                    click: (e, node) => this.handleNodeClick(e, node)
                }
            )
        );
        
        // إنشاء قالب للعقد (قاطع كهربائي)
        this.diagram.nodeTemplateMap.add("circuitBreaker",
            $(this.go.Node, "Spot",
                {
                    selectable: true,
                    selectionAdorned: true,
                    selectionObjectName: "SHAPE",
                    locationSpot: this.go.Spot.Center,
                    resizable: false,
                    resizeObjectName: "SHAPE",
                    toolTip: this.makeNodeToolTip(),
                },
                new this.go.Binding("location", "loc", this.go.Point.parse).makeTwoWay(this.go.Point.stringify),
                $(this.go.Panel, "Auto",
                    $(this.go.Shape, "Rectangle",
                        {
                            name: "SHAPE",
                            fill: "#ffc107",
                            stroke: "#d39e00",
                            strokeWidth: 2,
                            portId: "",
                            width: 40,
                            height: 40,
                            cursor: "pointer",
                        },
                        // ربط اللون بالحالة المحددة
                        new this.go.Binding("stroke", "isSelected", function(sel) { return sel ? "#0d6efd" : "#d39e00"; }).ofObject(),
                        new this.go.Binding("strokeWidth", "isSelected", function(sel) { return sel ? 4 : 2; }).ofObject()
                    ),
                    $(this.go.TextBlock,
                        {
                            margin: new this.go.Margin(0, 0, 0, 0),
                            font: "bold 10px sans-serif",
                            stroke: "black",
                            textAlign: "center"
                        },
                        new this.go.Binding("text", "rated_current", function(amperage) {
                            return amperage + "A";
                        })
                    )
                ),
                // إضافة تسمية أسفل العقدة
                $(this.go.TextBlock,
                    {
                        alignment: new this.go.Spot(0.5, 1, 0, 5),
                        font: "9px sans-serif",
                        stroke: "#666"
                    },
                    new this.go.Binding("text", "name", function(name) {
                        return name || "";
                    })
                ),
                // معالج النقر على العقدة
                {
                    click: (e, node) => this.handleNodeClick(e, node)
                }
            )
        );
        
        // إنشاء قالب للعقد (حمل كهربائي)
        this.diagram.nodeTemplateMap.add("load",
            $(this.go.Node, "Spot",
                {
                    selectable: true,
                    selectionAdorned: true,
                    selectionObjectName: "SHAPE",
                    locationSpot: this.go.Spot.Center,
                    resizable: false,
                    resizeObjectName: "SHAPE",
                    toolTip: this.makeNodeToolTip(),
                },
                new this.go.Binding("location", "loc", this.go.Point.parse).makeTwoWay(this.go.Point.stringify),
                $(this.go.Panel, "Auto",
                    $(this.go.Shape, "Square",
                        {
                            name: "SHAPE",
                            fill: "#0d6efd",
                            stroke: "#0a58ca",
                            strokeWidth: 2,
                            portId: "",
                            width: 60,
                            height: 60,
                            cursor: "pointer",
                        },
                        // ربط اللون بالحالة المحددة
                        new this.go.Binding("stroke", "isSelected", function(sel) { return sel ? "#dc3545" : "#0a58ca"; }).ofObject(),
                        new this.go.Binding("strokeWidth", "isSelected", function(sel) { return sel ? 4 : 2; }).ofObject()
                    ),
                    $(this.go.Panel, "Vertical",
                        { alignment: this.go.Spot.Center },
                        $(this.go.Shape, "Ellipse",
                            {
                                width: 20,
                                height: 20,
                                fill: "white",
                                stroke: null
                            }
                        ),
                        $(this.go.TextBlock,
                            {
                                margin: new this.go.Margin(5, 0, 0, 0),
                                font: "bold 12px sans-serif",
                                stroke: "white",
                                textAlign: "center",
                                maxSize: new this.go.Size(55, 60)
                            },
                            new this.go.Binding("text", "name")
                        )
                    )
                ),
                // معالج النقر على العقدة
                {
                    click: (e, node) => this.handleNodeClick(e, node)
                }
            )
        );
        
        // إنشاء قالب للروابط
        this.diagram.linkTemplate =
            $(this.go.Link,
                {
                    routing: this.go.Link.AvoidsNodes,   // تجنب مرور الرابط عبر العقد
                    corner: 10,                      // الزاوية المنحنية
                    curve: this.go.Link.JumpOver,         // القفز فوق الروابط الأخرى عند التقاطع
                    reshapable: false,               // منع إعادة تشكيل الروابط
                    resegmentable: false,            // منع إعادة تقسيم الروابط
                    relinkableFrom: false,           // منع إعادة ربط البداية
                    relinkableTo: false,             // منع إعادة ربط النهاية
                    toShortLength: 4,                // طول السهم
                    selectionAdorned: true,           // تزيين عند التحديد
                },
                $(this.go.Shape,                          // شكل الخط
                    { strokeWidth: 2, stroke: "#555" },
                    new this.go.Binding("stroke", "color")  // ربط اللون
                ),
                $(this.go.Shape,                          // شكل السهم
                    { toArrow: "Standard", stroke: "#555", fill: "#555" },
                    new this.go.Binding("stroke", "color"),
                    new this.go.Binding("fill", "color")
                )
            );
        
        // حفظ المرجع للاستخدام اللاحق
        const self = this;
        
        // معالج الحدث عند تحديد العقد - باستخدام طريقة متوافقة مع مختلف إصدارات GoJS
        this.diagram.addModelChangedListener(function(e) {
            // تأكد من أن التغيير هو تغيير في التحديد
            if (e.isTransactionFinished && self.diagram.selection.count > 0) {
                let selectedNode = self.diagram.selection.first();
                
                // إذا كان هناك عقدة محددة
                if (selectedNode instanceof self.go.Node) {
                    self.selectedNode = selectedNode;
                    // تمييز المسارات المتصلة
                    self.highlightLinkedNodes(selectedNode);
                    
                    // استدعاء دالة معالجة حدث التحديد إذا تم تعيينها
                    if (self.nodeSelectionCallback) {
                        let nodeData = selectedNode.data;
                        let nodeInfo = {
                            key: nodeData.key,
                            type: nodeData.category,
                            data: nodeData.entityData,
                            pathData: self.generatePathData(selectedNode)
                        };
                        self.nodeSelectionCallback(nodeInfo);
                    }
                } else if (self.diagram.selection.count === 0) {
                    self.selectedNode = null;
                    // إعادة ضبط تظليل المسارات
                    self.resetHighlighting();
                    
                    // استدعاء دالة معالجة حدث التحديد بدون بيانات
                    if (self.nodeSelectionCallback) {
                        self.nodeSelectionCallback(null);
                    }
                }
            }
        });
        
        // معالج حدث النقر لإعادة ضبط العرض
        this.diagram.addDiagramListener("BackgroundDoubleClicked", e => {
            self.diagram.commandHandler.zoomToFit();
        });
    }
    
    /**
     * إنشاء تلميح للعقدة
     * @private
     * @returns {go.Adornment} - عنصر التلميح
     */
    makeNodeToolTip() {
        const $ = this.go.GraphObject.make;
        return $(this.go.Adornment, "Auto",
            $(this.go.Shape, { fill: "#f8f9fa", stroke: "#dee2e6" }),
            $(this.go.Panel, "Table",
                { defaultAlignment: this.go.Spot.Left, margin: 10 },
                $(this.go.TextBlock,
                    { 
                        row: 0, column: 0, columnSpan: 2,
                        font: "bold 14px sans-serif", 
                        margin: new this.go.Margin(0, 0, 5, 0)
                    },
                    new this.go.Binding("text", "", function(data) {
                        // عرض نوع العنصر والاسم
                        let typeName = "";
                        switch(data.category) {
                            case "powerSource": typeName = "مصدر طاقة"; break;
                            case "panel": typeName = "لوحة كهربائية"; break;
                            case "circuitBreaker": typeName = "قاطع كهربائي"; break;
                            case "load": typeName = "حمل كهربائي"; break;
                        }
                        return typeName + ": " + data.entityData.name;
                    })
                ),
                $(this.go.TextBlock, { row: 1, column: 0 }, "المعرّف:"),
                $(this.go.TextBlock, { row: 1, column: 1 }, 
                    new this.go.Binding("text", "entityData", function(data) { return data.id; })
                ),
                $(this.go.TextBlock, { row: 2, column: 0 }, "الوصف:"),
                $(this.go.TextBlock, { row: 2, column: 1, maxSize: new this.go.Size(150, NaN) }, 
                    new this.go.Binding("text", "entityData", function(data) { return data.description || "-"; })
                )
            )
        );
    }
    
    /**
     * معالجة حدث النقر على عقدة
     * @param {go.InputEvent} e - حدث النقر
     * @param {go.Node} node - العقدة التي تم النقر عليها
     */
    handleNodeClick(e, node) {
        const nodeData = node.data;
        
        // إذا كان نوع العقدة "لوحة"، يتم عرض/إخفاء القواطع المرتبطة بها
        if (nodeData.category === "panel") {
            const panelId = nodeData.entityData.id;
            // البحث عن القواطع المرتبطة بهذه اللوحة
            const relatedBreakers = this.circuitBreakers.filter(breaker => {
                return breaker.panel === panelId;
            });
            
            // تحديد ما إذا كان سيتم إظهار أو إخفاء القواطع
            const breakerKeys = relatedBreakers.map(breaker => `breaker_${breaker.id}`);
            let anyVisible = false;
            
            // الفحص إذا كان هناك أي قاطع مرئي
            breakerKeys.forEach(key => {
                const breakerNode = this.diagram.findNodeForKey(key);
                if (breakerNode && breakerNode.visible) {
                    anyVisible = true;
                }
            });
            
            // عكس حالة الظهور
            const newVisibility = !anyVisible;
            
            // تطبيق التغيير على كل قاطع
            breakerKeys.forEach(key => {
                const breakerNode = this.diagram.findNodeForKey(key);
                if (breakerNode) {
                    breakerNode.visible = newVisibility;
                }
            });
        }
    }
    
    /**
     * تظليل العقد المتصلة بعقدة محددة
     * @param {go.Node} node - العقدة المحددة
     */
    highlightLinkedNodes(node) {
        if (!node || !this.diagram) return;
        
        // إعادة ضبط التظليل أولا
        this.resetHighlighting();
        
        // العقدة المحددة وبياناتها
        const selectedKey = node.data.key;
        const nodeCategory = node.data.category;
        
        // تمييز المسار التصاعدي (أصل الطاقة)
        this.highlightPathToRoot(selectedKey, "#ff6600");
        
        // تمييز المسار التنازلي (الخارج من العقدة)
        this.highlightPathFromNode(selectedKey, "#00aaff");
    }
    
    /**
     * تظليل المسار من العقدة المحددة إلى الجذر
     * @param {string} nodeKey - مفتاح العقدة المحددة
     * @param {string} color - لون التظليل
     * @private
     */
    highlightPathToRoot(nodeKey, color) {
        if (!this.diagram) return;
        
        let currentNodeKey = nodeKey;
        let visited = new Set();
        
        // تكرار حتى الوصول للجذر
        while (currentNodeKey && !visited.has(currentNodeKey)) {
            visited.add(currentNodeKey);
            
            // البحث عن الروابط الواردة للعقدة الحالية
            const incomingLinks = this.diagram.findLinksByExample({ to: currentNodeKey });
            
            if (incomingLinks.count > 0) {
                // أخذ أول رابط فقط (في حالة تعدد المصادر، يمكن تعديل المنطق)
                const sourceLink = incomingLinks.first();
                sourceLink.findObject("Shape").stroke = color;
                sourceLink.findObject("Shape").strokeWidth = 3;
                
                // العقدة المصدر
                const sourceNode = this.diagram.findNodeForKey(sourceLink.data.from);
                if (sourceNode) {
                    // تمييز العقدة المصدر
                    sourceNode.findObject("SHAPE").stroke = color;
                    sourceNode.findObject("SHAPE").strokeWidth = 3;
                }
                
                // استمرار التتبع للعقدة المصدر
                currentNodeKey = sourceLink.data.from;
            } else {
                // وصلنا للجذر
                break;
            }
        }
    }
    
    /**
     * تظليل المسار من العقدة المحددة إلى جميع العقد التابعة
     * @param {string} nodeKey - مفتاح العقدة المحددة
     * @param {string} color - لون التظليل
     * @private
     */
    highlightPathFromNode(nodeKey, color) {
        if (!this.diagram) return;
        
        // تنفيذ البحث العميق لتمييز جميع المسارات التي تخرج من العقدة
        const visited = new Set();
        
        const depthFirstSearch = (currentKey) => {
            if (visited.has(currentKey)) return;
            visited.add(currentKey);
            
            // البحث عن الروابط الخارجة من العقدة الحالية
            const outgoingLinks = this.diagram.findLinksByExample({ from: currentKey });
            
            outgoingLinks.each(link => {
                // تمييز الرابط
                link.findObject("Shape").stroke = color;
                link.findObject("Shape").strokeWidth = 3;
                
                // العقدة الوجهة
                const targetNode = this.diagram.findNodeForKey(link.data.to);
                if (targetNode) {
                    // تمييز العقدة الوجهة
                    targetNode.findObject("SHAPE").stroke = color;
                    targetNode.findObject("SHAPE").strokeWidth = 3;
                }
                
                // استمرار البحث العميق
                depthFirstSearch(link.data.to);
            });
        };
        
        // بدء البحث العميق من العقدة المحددة
        depthFirstSearch(nodeKey);
    }
    
    /**
     * إعادة ضبط تظليل جميع العقد والروابط
     */
    resetHighlighting() {
        if (!this.diagram) return;
        
        // إعادة ضبط حالة الروابط
        this.diagram.links.each(link => {
            const shape = link.findObject("Shape");
            if (shape) {
                shape.stroke = "#555";
                shape.strokeWidth = 2;
            }
        });
        
        // إعادة ضبط حالة العقد (كل عقدة حسب نوعها)
        this.diagram.nodes.each(node => {
            const shape = node.findObject("SHAPE");
            if (shape) {
                const category = node.data.category;
                
                // تعيين اللون حسب النوع
                let strokeColor = "#000";
                let strokeWidth = 2;
                
                switch (category) {
                    case "powerSource":
                        strokeColor = "darkred";
                        break;
                    case "panel":
                        strokeColor = "darkgreen";
                        break;
                    case "circuitBreaker":
                        strokeColor = "#d39e00";
                        break;
                    case "load":
                        strokeColor = "#0a58ca";
                        break;
                }
                
                // إذا كانت العقدة محددة، نستخدم ألوان التحديد
                if (node.isSelected) {
                    strokeColor = "#0d6efd";
                    strokeWidth = 4;
                }
                
                shape.stroke = strokeColor;
                shape.strokeWidth = strokeWidth;
            }
        });
    }
    
    /**
     * توليد بيانات المسار للعقدة المحددة
     * @param {go.Node} selectedNode - العقدة المحددة
     * @returns {Object} - بيانات المسار
     * @private
     */
    generatePathData(selectedNode) {
        if (!selectedNode || !this.diagram) return null;
        
        const nodeKey = selectedNode.data.key;
        const pathData = {
            powerSources: [],
            panels: [],
            breakers: [],
            loads: []
        };
        
        // جمع بيانات المسار التصاعدي (للجذر)
        const upstreamPath = this.collectUpstreamPath(nodeKey);
        
        // جمع بيانات المسار التنازلي (للفروع)
        const downstreamPath = this.collectDownstreamPath(nodeKey);
        
        // دمج البيانات
        pathData.powerSources = [...upstreamPath.powerSources, ...downstreamPath.powerSources];
        pathData.panels = [...upstreamPath.panels, ...downstreamPath.panels];
        pathData.breakers = [...upstreamPath.breakers, ...downstreamPath.breakers];
        pathData.loads = [...upstreamPath.loads, ...downstreamPath.loads];
        
        // إضافة العنصر المحدد نفسه إلى مجموعته المناسبة
        const selectedData = {
            key: selectedNode.data.key,
            name: selectedNode.data.text || selectedNode.data.entityData.name,
            data: selectedNode.data.entityData
        };
        
        switch (selectedNode.data.category) {
            case "powerSource":
                if (!pathData.powerSources.some(ps => ps.key === selectedData.key)) {
                    pathData.powerSources.push(selectedData);
                }
                break;
            case "panel":
                if (!pathData.panels.some(p => p.key === selectedData.key)) {
                    pathData.panels.push(selectedData);
                }
                break;
            case "circuitBreaker":
                if (!pathData.breakers.some(b => b.key === selectedData.key)) {
                    pathData.breakers.push(selectedData);
                }
                break;
            case "load":
                if (!pathData.loads.some(l => l.key === selectedData.key)) {
                    pathData.loads.push(selectedData);
                }
                break;
        }
        
        return pathData;
    }
    
    /**
     * جمع بيانات المسار التصاعدي
     * @param {string} startKey - مفتاح العقدة البداية
     * @returns {Object} - بيانات المسار التصاعدي
     * @private
     */
    collectUpstreamPath(startKey) {
        const path = {
            powerSources: [],
            panels: [],
            breakers: [],
            loads: []
        };
        
        if (!this.diagram) return path;
        
        const visited = new Set();
        let currentKey = startKey;
        
        // تكرار حتى الوصول للجذر
        while (currentKey && !visited.has(currentKey)) {
            visited.add(currentKey);
            
            // العقدة الحالية
            const currentNode = this.diagram.findNodeForKey(currentKey);
            if (!currentNode) break;
            
            const nodeData = {
                key: currentNode.data.key,
                name: currentNode.data.text || currentNode.data.entityData.name,
                data: currentNode.data.entityData
            };
            
            // إضافة العقدة إلى المجموعة المناسبة
            switch (currentNode.data.category) {
                case "powerSource":
                    path.powerSources.push(nodeData);
                    break;
                case "panel":
                    path.panels.push(nodeData);
                    break;
                case "circuitBreaker":
                    path.breakers.push(nodeData);
                    break;
                case "load":
                    path.loads.push(nodeData);
                    break;
            }
            
            // البحث عن الروابط الواردة للعقدة الحالية
            const incomingLinks = this.diagram.findLinksByExample({ to: currentKey });
            
            if (incomingLinks.count > 0) {
                // أخذ أول رابط فقط (في حالة تعدد المصادر، يمكن تعديل المنطق)
                const sourceLink = incomingLinks.first();
                currentKey = sourceLink.data.from;
            } else {
                // وصلنا للجذر
                break;
            }
        }
        
        return path;
    }
    
    /**
     * جمع بيانات المسار التنازلي
     * @param {string} startKey - مفتاح العقدة البداية
     * @returns {Object} - بيانات المسار التنازلي
     * @private
     */
    collectDownstreamPath(startKey) {
        const path = {
            powerSources: [],
            panels: [],
            breakers: [],
            loads: []
        };
        
        if (!this.diagram) return path;
        
        const visited = new Set();
        
        const depthFirstSearch = (currentKey) => {
            if (visited.has(currentKey)) return;
            visited.add(currentKey);
            
            // العقدة الحالية
            const currentNode = this.diagram.findNodeForKey(currentKey);
            if (!currentNode) return;
            
            // لا نضيف العقدة البداية (لأنها ستضاف في الدالة الرئيسية)
            if (currentKey !== startKey) {
                const nodeData = {
                    key: currentNode.data.key,
                    name: currentNode.data.text || currentNode.data.entityData.name,
                    data: currentNode.data.entityData
                };
                
                // إضافة العقدة إلى المجموعة المناسبة
                switch (currentNode.data.category) {
                    case "powerSource":
                        path.powerSources.push(nodeData);
                        break;
                    case "panel":
                        path.panels.push(nodeData);
                        break;
                    case "circuitBreaker":
                        path.breakers.push(nodeData);
                        break;
                    case "load":
                        path.loads.push(nodeData);
                        break;
                }
            }
            
            // البحث عن الروابط الخارجة من العقدة الحالية
            const outgoingLinks = this.diagram.findLinksByExample({ from: currentKey });
            
            outgoingLinks.each(link => {
                // استمرار البحث العميق للعقد الوجهة
                depthFirstSearch(link.data.to);
            });
        };
        
        // بدء البحث العميق من العقدة المحددة
        depthFirstSearch(startKey);
        
        return path;
    }
    
    /**
     * تعيين دالة معالجة حدث تحديد العقدة
     * @param {Function} callback - الدالة التي سيتم استدعاؤها عند تحديد عقدة
     * @public
     */
    onNodeSelect(callback) {
        this.nodeSelectionCallback = callback;
    }
    
    /**
     * تحديث المخطط بناءً على حالة فلاتر العرض
     * @public
     */
    updateDiagram() {
        // قراءة حالة فلاتر العرض
        const showPowerSources = document.getElementById('showPowerSources')?.checked ?? true;
        const showPanels = document.getElementById('showPanels')?.checked ?? true;
        const showBreakers = document.getElementById('showBreakers')?.checked ?? true;
        const showLoads = document.getElementById('showLoads')?.checked ?? true;
        
        // تطبيق الفلاتر
        this.diagram.nodes.each(node => {
            const category = node.data.category;
            
            if (category === "powerSource") {
                node.visible = showPowerSources;
            } else if (category === "panel") {
                node.visible = showPanels;
            } else if (category === "circuitBreaker") {
                // للقواطع، نحتفظ بوضعها الحالي إذا كان الفلتر مفعلاً، وإلا نخفيها
                if (!showBreakers) {
                    node.visible = false;
                }
                // لا نغير حالة القواطع إذا كان الفلتر مفعلاً (لأنها قد تكون مخفية أصلاً بسبب النقر على اللوحات)
            } else if (category === "load") {
                node.visible = showLoads;
            }
        });
        
        // تحديث الروابط بناءً على حالة العقد
        this.updateLinkVisibility();
        
        // تحديث تخطيط المخطط
        this.diagram.layoutDiagram(true);
    }
    
    /**
     * تحديث حالة ظهور الروابط بناءً على حالة العقد
     * @private
     */
    updateLinkVisibility() {
        this.diagram.links.each(link => {
            const fromNode = this.diagram.findNodeForKey(link.data.from);
            const toNode = this.diagram.findNodeForKey(link.data.to);
            
            // الرابط يظهر فقط إذا كانت العقدتان المرتبطتان ظاهرتين
            link.visible = (fromNode && toNode && fromNode.visible && toNode.visible);
        });
    }
    
    /**
     * تعيين موضع العقد بشكل اتجاهي من أعلى إلى أسفل
     * @private
     */
    assignInitialLocations() {
        // تعيين مواضع العناصر حسب مستوياتها في الشبكة
        // يتم تعيين مصادر الطاقة في الأعلى، ثم اللوحات، ثم القواطع، وأخيراً الأحمال
        
        let yOffset = 0;
        const xSpacing = 200;
        const ySpacing = 150;
        
        // مصادر الطاقة
        const powerSourceNodes = this.diagram.nodes.filter(node => node.data.category === "powerSource");
        if (powerSourceNodes.count > 0) {
            let xOffset = (this.diagram.viewportBounds.width - powerSourceNodes.count * xSpacing) / 2;
            powerSourceNodes.each((node, idx) => {
                node.location = new this.go.Point(xOffset + idx * xSpacing, yOffset);
            });
            yOffset += ySpacing;
        }
        
        // اللوحات
        const panelNodes = this.diagram.nodes.filter(node => node.data.category === "panel");
        if (panelNodes.count > 0) {
            let xOffset = (this.diagram.viewportBounds.width - panelNodes.count * xSpacing) / 2;
            panelNodes.each((node, idx) => {
                node.location = new this.go.Point(xOffset + idx * xSpacing, yOffset);
            });
            yOffset += ySpacing;
        }
        
        // القواطع
        const breakerNodes = this.diagram.nodes.filter(node => node.data.category === "circuitBreaker");
        if (breakerNodes.count > 0) {
            let xOffset = (this.diagram.viewportBounds.width - breakerNodes.count * xSpacing) / 2;
            breakerNodes.each((node, idx) => {
                node.location = new this.go.Point(xOffset + idx * xSpacing, yOffset);
            });
            yOffset += ySpacing;
        }
        
        // الأحمال
        const loadNodes = this.diagram.nodes.filter(node => node.data.category === "load");
        if (loadNodes.count > 0) {
            let xOffset = (this.diagram.viewportBounds.width - loadNodes.count * xSpacing) / 2;
            loadNodes.each((node, idx) => {
                node.location = new this.go.Point(xOffset + idx * xSpacing, yOffset);
            });
        }
    }
    
    /**
     * إعداد وعرض المخطط التفاعلي
     * @returns {Promise<boolean>} - وعد بنجاح العملية
     * @public
     */
    async visualize() {
        try {
            // عرض مؤشر التحميل
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) loadingIndicator.style.display = 'flex';
            
            console.log("خطوة 1: بدء جلب بيانات الشبكة");
            // جلب بيانات الشبكة
            const success = await this.fetchNetworkData();
            if (!success) {
                console.error("فشل في جلب بيانات الشبكة");
                return false;
            }
            
            console.log("خطوة 2: بدء بناء العقد والروابط");
            try {
                // إنشاء العقد والروابط
                this.buildNodesAndLinks();
                console.log(`تم إنشاء ${this.nodeDataArray.length} عقدة و ${this.linkDataArray.length} رابط`);
                
                // طباعة المنحنى لمزيد من التشخيص
                console.log("أول عقدة:", this.nodeDataArray.length > 0 ? this.nodeDataArray[0] : "لا توجد عقد");
                console.log("أول رابط:", this.linkDataArray.length > 0 ? this.linkDataArray[0] : "لا توجد روابط");
            } catch (buildError) {
                console.error("فشل في بناء العقد والروابط:", buildError);
                throw buildError;
            }
            
            console.log("خطوة 3: بدء تطبيق التخطيط");
            try {
                // تطبيق التخطيط وتكبير للمناسبة
                this.diagram.layoutDiagram(true);
                this.diagram.commandHandler.zoomToFit();
            } catch (layoutError) {
                console.error("فشل في تطبيق التخطيط:", layoutError);
                throw layoutError;
            }
            
            console.log("خطوة 4: إخفاء القواطع بشكل افتراضي");
            try {
                // إخفاء القواطع بشكل افتراضي (سيتم إظهارها عند النقر على اللوحة)
                this.diagram.nodes.each(node => {
                    if (node.data.category === "circuitBreaker") {
                        node.visible = false;
                    }
                });
            } catch (visibilityError) {
                console.error("فشل في تعيين رؤية القواطع:", visibilityError);
                throw visibilityError;
            }
            
            console.log("خطوة 5: تحديث حالة ظهور الروابط");
            try {
                // تحديث حالة ظهور الروابط
                this.updateLinkVisibility();
            } catch (linkVisibilityError) {
                console.error("فشل في تحديث حالة ظهور الروابط:", linkVisibilityError);
                throw linkVisibilityError;
            }
            
            console.log("خطوة 6: اكتمال عرض المخطط بنجاح");
            // إخفاء مؤشر التحميل
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            return true;
        } catch (error) {
            console.error("فشل في عرض المخطط:", error?.message || error);
            if (error?.stack) console.error(error.stack);
            
            // إخفاء مؤشر التحميل
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            return false;
        }
    }
    
    /**
     * جلب بيانات الشبكة من واجهة برمجة التطبيقات
     * @returns {Promise<boolean>} - وعد بنجاح الجلب
     * @private
     */
    async fetchNetworkData() {
        try {
            // استدعاء واجهة برمجة التطبيقات لجلب البيانات
            const sourcesResponse = await NetworkAPI.getPowerSources();
            if (!sourcesResponse.success) {
                const errorMsg = sourcesResponse.error ? sourcesResponse.error.message : "فشل جلب مصادر الطاقة";
                throw new Error(errorMsg);
            }
            this.powerSources = sourcesResponse.data || [];
            console.log(`تم جلب ${this.powerSources.length} مصدر طاقة`);
            
            const panelsResponse = await NetworkAPI.getPanels();
            if (!panelsResponse.success) {
                const errorMsg = panelsResponse.error ? panelsResponse.error.message : "فشل جلب اللوحات";
                throw new Error(errorMsg);
            }
            this.panels = panelsResponse.data || [];
            console.log(`تم جلب ${this.panels.length} لوحة كهربائية`);
            
            const breakersResponse = await NetworkAPI.getCircuitBreakers();
            if (!breakersResponse.success) {
                const errorMsg = breakersResponse.error ? breakersResponse.error.message : "فشل جلب القواطع";
                throw new Error(errorMsg);
            }
            this.circuitBreakers = breakersResponse.data || [];
            console.log(`تم جلب ${this.circuitBreakers.length} قاطع كهربائي`);
            
            const loadsResponse = await NetworkAPI.getLoads();
            if (!loadsResponse.success) {
                const errorMsg = loadsResponse.error ? loadsResponse.error.message : "فشل جلب الأحمال";
                throw new Error(errorMsg);
            }
            this.loads = loadsResponse.data || [];
            console.log(`تم جلب ${this.loads.length} حمل كهربائي`);
            
            // التحقق من وجود بيانات
            if (this.powerSources.length === 0 && this.panels.length === 0 && 
                this.circuitBreakers.length === 0 && this.loads.length === 0) {
                console.warn("تم جلب البيانات لكن جميع المصفوفات فارغة");
            }
            
            return true;
        } catch (error) {
            // إظهار تفاصيل أكثر عن الخطأ
            console.error("فشل في جلب بيانات الشبكة:", error.message || error);
            
            // إنشاء مصفوفات فارغة للتجنب من الأخطاء اللاحقة
            this.powerSources = this.powerSources || [];
            this.panels = this.panels || [];
            this.circuitBreakers = this.circuitBreakers || [];
            this.loads = this.loads || [];
            
            return false;
        }
    }
    
    /**
     * بناء مصفوفات العقد والروابط بناءً على البيانات المجلوبة
     * @private
     */
    buildNodesAndLinks() {
        this.nodeDataArray = [];
        this.linkDataArray = [];
        
        // إضافة مصادر الطاقة
        for (const source of this.powerSources) {
            this.nodeDataArray.push({
                key: `source_${source.id}`,
                category: "powerSource",
                text: source.name,
                entityData: source
            });
            
            // روابط من مصدر الطاقة إلى اللوحات
            for (const panel of this.panels) {
                if (panel.power_source === source.id) {
                    this.linkDataArray.push({
                        from: `source_${source.id}`,
                        to: `panel_${panel.id}`
                    });
                }
            }
        }
        
        // إضافة اللوحات
        for (const panel of this.panels) {
            this.nodeDataArray.push({
                key: `panel_${panel.id}`,
                category: "panel",
                text: panel.name,
                panel_type: panel.panel_type,
                entityData: panel
            });
            
            // روابط من اللوحة الرئيسية إلى اللوحات الفرعية
            if (panel.panel_type === "sub" || panel.panel_type === "sub_main") {
                const parentPanel = this.panels.find(p => p.id === panel.parent_panel);
                if (parentPanel) {
                    this.linkDataArray.push({
                        from: `panel_${parentPanel.id}`,
                        to: `panel_${panel.id}`
                    });
                }
            }
        }
        
        // إضافة القواطع
        for (const breaker of this.circuitBreakers) {
            this.nodeDataArray.push({
                key: `breaker_${breaker.id}`,
                category: "circuitBreaker",
                text: breaker.name || `قاطع ${breaker.id}`,
                entityData: breaker
            });
            
            // روابط من اللوحة إلى القاطع
            if (breaker.panel) {
                this.linkDataArray.push({
                    from: `panel_${breaker.panel}`,
                    to: `breaker_${breaker.id}`
                });
            }
        }
        
        // إضافة الأحمال
        for (const load of this.loads) {
            this.nodeDataArray.push({
                key: `load_${load.id}`,
                category: "load",
                text: load.name,
                entityData: load
            });
            
            // روابط من القاطع إلى الحمل
            if (load.circuit_breaker) {
                this.linkDataArray.push({
                    from: `breaker_${load.circuit_breaker}`,
                    to: `load_${load.id}`
                });
            }
        }
        
        // تطبيق البيانات على المخطط
        this.diagram.model = new this.go.GraphLinksModel(this.nodeDataArray, this.linkDataArray);
    }
    
    /**
     * تصدير المخطط كصورة
     * @returns {Promise<string>} - وعد برابط الصورة
     * @public
     */
    async exportAsImage() {
        if (!this.diagram) {
            return null;
        }
        
        try {
            // تحديث تخطيط المخطط قبل التصدير
            this.diagram.layoutDiagram(true);
            
            // الحصول على بيانات الصورة
            const imgData = this.diagram.makeImageData({
                scale: 1,
                background: "white"
            });
            
            return imgData;
        } catch (error) {
            console.error("فشل في تصدير المخطط كصورة:", error);
            return null;
        }
    }
}