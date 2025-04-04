# توثيق مخطط اللوحات الشجري

## نظرة عامة

مخطط اللوحات الشجري هو واجهة رسومية تسمح بعرض اللوحات الكهربائية بشكل هرمي متسلسل، مما يسهل فهم العلاقات بين اللوحات الرئيسية والفرعية. يوفر هذا المخطط طريقة سهلة لاستعراض الهيكل الشجري للوحات في النظام.

## الملفات الرئيسية

المخطط الشجري يتكون من الملفات التالية:

- **`templates/panel-tree-visualizer.html`**: قالب HTML الرئيسي للمخطط الشجري
- **`static/js/panel-tree-visualizer.js`**: شيفرة JavaScript للتفاعل والعرض
- **`network/views.py`**: وظائف العرض في Django لتقديم المخطط وبياناته

## الميزات الرئيسية

### 1. العرض الهرمي للوحات

المخطط يعرض اللوحات الكهربائية بطريقة هرمية متسلسلة:

1. **اللوحات الرئيسية** في أعلى الهرم
2. **اللوحات الفرعية** متصلة مباشرة باللوحات الأم
3. **مؤشرات بصرية** توضح مستوى كل لوحة في التسلسل الهرمي
4. **عرض معلومات مصدر الطاقة** تظهر معلومات مصدر الطاقة المرتبط باللوحات الرئيسية (محسّن في الإصدار 2.1.0)

### 2. ميزات الطي والتوسعة

- **الطي الافتراضي**: جميع اللوحات الفرعية مطوية افتراضياً لتسهيل القراءة
- **التوسعة عند الطلب**: يمكن توسعة أي لوحة لعرض اللوحات الفرعية الخاصة بها
- **رموز الطي/التوسعة**: رموز بصرية واضحة تشير إلى إمكانية الطي أو التوسعة
- **حفظ حالة الطي/التوسعة**: حفظ حالة الأقسام المطوية والموسعة بين جلسات التصفح (ميزة جديدة في الإصدار 2.1.0)

### 3. عرض تفاصيل اللوحة

عند النقر على أي لوحة، يتم عرض تفاصيلها:

- **البيانات الأساسية**: الاسم، النوع، الجهد، الأمبير
- **مصدر التغذية**: اللوحة الأم أو مصدر الطاقة المغذي مع تفاصيل إضافية (محسّن في الإصدار 2.1.0)
- **القواطع**: عدد القواطع في اللوحة مع معلومات أكثر تفصيلاً
- **الأحمال**: عدد الأحمال المتصلة (مباشرة أو غير مباشرة)
- **معلومات استخدام القدرة**: نسبة استخدام القدرة المتاحة (ميزة جديدة في الإصدار 2.1.0)

### 4. روابط سريعة للوظائف

المخطط يوفر روابط سريعة للأعمال الشائعة:

- **تحرير اللوحة**: رابط مباشر لتحرير بيانات اللوحة
- **إضافة لوحة فرعية**: إضافة لوحة فرعية جديدة
- **عرض في المخطط التفاعلي**: انتقال إلى المخطط التفاعلي مع تحديد اللوحة تلقائياً
- **إضافة قاطع للوحة**: إضافة قاطع جديد للوحة المحددة
- **عرض تقرير الأحمال**: عرض تقرير تفصيلي عن أحمال اللوحة (ميزة جديدة في الإصدار 2.1.0)

### 5. تحسينات الإصدار 2.1.0

تم إضافة العديد من التحسينات في الإصدار 2.1.0 لمخطط اللوحات الشجري:

1. **عرض معلومات مصدر الطاقة المحسّنة**:
   - عرض معلومات أكثر تفصيلاً عن مصادر الطاقة المرتبطة باللوحات الرئيسية
   - إضافة معلومات عن الجهد وسعة التيار لمصدر الطاقة
   - عرض معلومات عن القواطع المرتبطة بمصدر الطاقة

2. **تحسين عرض معلومات استخدام القدرة**:
   - إضافة مؤشر بصري لنسبة استخدام القدرة المتاحة في اللوحة
   - ألوان تنبيهية عند اقتراب اللوحة من الحد الأقصى للقدرة

3. **إضافة تقارير الأحمال**:
   - عرض تقرير تفصيلي عن الأحمال المرتبطة باللوحة
   - توزيع الأحمال حسب النوع وإجمالي الاستهلاك

4. **تحسين أداء المخطط**:
   - تسريع تحميل وعرض المخطط للأنظمة الكبيرة
   - استخدام تقنيات التحميل الكسول للبيانات عند الطلب

## هيكل الشيفرة وكيفية العمل

### 1. تحميل البيانات

عند زيارة صفحة المخطط الشجري، تتم العملية التالية:

```javascript
// تحميل بيانات اللوحات من واجهة برمجة التطبيقات
async function loadPanelTreeData() {
    try {
        // جلب جميع اللوحات
        const response = await fetch('/api/panels/?format=json');
        const data = await response.json();
        
        // تنظيم البيانات في هيكل شجري
        const treeData = organizePanelsIntoTree(data);
        
        // عرض الهيكل الشجري
        renderPanelTree(treeData);
    } catch (error) {
        console.error('خطأ في تحميل بيانات اللوحات:', error);
    }
}
```

### 2. تنظيم البيانات في هيكل شجري

تحويل البيانات المسطحة إلى هيكل شجري:

```javascript
function organizePanelsIntoTree(panelsList) {
    // تحديد اللوحات الجذرية (لا تملك لوحة أم)
    const rootPanels = panelsList.filter(panel => !panel.parent_panel);
    
    // وظيفة تكرارية لإضافة اللوحات الفرعية
    function addChildPanels(parentPanel) {
        // تحديد اللوحات الفرعية المباشرة
        const childPanels = panelsList.filter(
            panel => panel.parent_panel === parentPanel.id
        );
        
        // إضافة اللوحات الفرعية إلى اللوحة الأم
        parentPanel.children = childPanels;
        
        // تكرار العملية لكل لوحة فرعية
        childPanels.forEach(child => addChildPanels(child));
        
        return parentPanel;
    }
    
    // بناء الشجرة بدءاً من اللوحات الجذرية
    return rootPanels.map(panel => addChildPanels(panel));
}
```

### 3. عرض الهيكل الشجري

رسم الهيكل الشجري في الصفحة:

```javascript
function renderPanelTree(treeData) {
    const treeContainer = document.getElementById('panelTreeContainer');
    treeContainer.innerHTML = '';
    
    // إنشاء العنصر الجذري للشجرة
    const treeRoot = document.createElement('ul');
    treeRoot.className = 'panel-tree';
    
    // إضافة اللوحات الجذرية
    treeData.forEach(panel => {
        const panelNode = createPanelNode(panel);
        treeRoot.appendChild(panelNode);
    });
    
    treeContainer.appendChild(treeRoot);
}

// إنشاء عقدة لوحة في الشجرة
function createPanelNode(panel) {
    const panelItem = document.createElement('li');
    
    // إضافة معلومات اللوحة
    const panelInfo = document.createElement('div');
    panelInfo.className = 'panel-info';
    panelInfo.innerHTML = `
        <span class="panel-name">${panel.name}</span>
        <span class="panel-details">${panel.voltage}V - ${panel.ampacity}A</span>
        <div class="panel-actions">
            <button class="btn-edit">تحرير</button>
            <button class="btn-add-child">إضافة لوحة فرعية</button>
        </div>
    `;
    
    panelItem.appendChild(panelInfo);
    
    // إضافة اللوحات الفرعية إذا وجدت
    if (panel.children && panel.children.length > 0) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.textContent = '+';
        panelInfo.insertBefore(toggleBtn, panelInfo.firstChild);
        
        const childList = document.createElement('ul');
        childList.className = 'panel-children collapsed';
        
        panel.children.forEach(childPanel => {
            const childNode = createPanelNode(childPanel);
            childList.appendChild(childNode);
        });
        
        panelItem.appendChild(childList);
        
        // إضافة حدث الطي/التوسعة
        toggleBtn.addEventListener('click', () => {
            childList.classList.toggle('collapsed');
            toggleBtn.textContent = childList.classList.contains('collapsed') ? '+' : '-';
            // حفظ حالة الطي/التوسعة (ميزة جديدة في الإصدار 2.1.0)
            savePanelExpandState(panel.id, !childList.classList.contains('collapsed'));
        });
        
        // استرجاع حالة الطي/التوسعة المحفوظة (ميزة جديدة في الإصدار 2.1.0)
        if (getPanelExpandState(panel.id)) {
            childList.classList.remove('collapsed');
            toggleBtn.textContent = '-';
        }
    }
    
    return panelItem;
}

// حفظ حالة الطي/التوسعة (ميزة جديدة في الإصدار 2.1.0)
function savePanelExpandState(panelId, isExpanded) {
    const expandStates = JSON.parse(localStorage.getItem('panelExpandStates') || '{}');
    expandStates[panelId] = isExpanded;
    localStorage.setItem('panelExpandStates', JSON.stringify(expandStates));
}

// استرجاع حالة الطي/التوسعة (ميزة جديدة في الإصدار 2.1.0)
function getPanelExpandState(panelId) {
    const expandStates = JSON.parse(localStorage.getItem('panelExpandStates') || '{}');
    return expandStates[panelId] || false;
}
```

## التفاعل مع المخطط

### 1. طي وتوسعة اللوحات الفرعية

```javascript
// إضافة مستمعي الأحداث لأزرار الطي/التوسعة
function setupTreeInteraction() {
    // طي/توسعة لوحة
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const parentLi = this.closest('li');
            const childList = parentLi.querySelector('ul.panel-children');
            
            childList.classList.toggle('collapsed');
            this.textContent = childList.classList.contains('collapsed') ? '+' : '-';
        });
    });
}
```

### 2. عرض تفاصيل اللوحة

```javascript
// إضافة مستمعي الأحداث لعناصر اللوحات
function setupPanelActions() {
    // عرض تفاصيل اللوحة
    document.querySelectorAll('.panel-info').forEach(panelInfo => {
        panelInfo.addEventListener('click', function() {
            const panelId = this.dataset.panelId;
            showPanelDetails(panelId);
        });
    });
}

// عرض تفاصيل اللوحة
async function showPanelDetails(panelId) {
    try {
        // جلب تفاصيل اللوحة
        const response = await fetch(`/api/panels/${panelId}/?format=json`);
        const panelData = await response.json();
        
        // جلب بيانات القواطع والأحمال المرتبطة
        const breakersResponse = await fetch(`/api/panels/${panelId}/breakers/?format=json`);
        const breakersData = await breakersResponse.json();
        
        // عرض البيانات في لوحة التفاصيل
        const detailsPanel = document.getElementById('panelDetailsPanel');
        
        // تحسين عرض تفاصيل مصدر الطاقة (محسّن في الإصدار 2.1.0)
        let powerSourceInfo = '';
        if (panelData.power_source_details) {
            const ps = panelData.power_source_details;
            powerSourceInfo = `
                <tr><td>مصدر الطاقة:</td><td>${ps.name}</td></tr>
                <tr><td>نوع المصدر:</td><td>${translateSourceType(ps.source_type)}</td></tr>
                <tr><td>الجهد:</td><td>${ps.voltage} فولت</td></tr>
                <tr><td>سعة التيار:</td><td>${ps.total_ampacity} أمبير</td></tr>
            `;
        }
        
        // إضافة مؤشر استخدام القدرة (ميزة جديدة في الإصدار 2.1.0)
        const utilizationPercent = panelData.total_loads_info?.utilization_percentage || 0;
        let utilizationClass = 'normal';
        if (utilizationPercent > 90) utilizationClass = 'critical';
        else if (utilizationPercent > 75) utilizationClass = 'warning';
        
        detailsPanel.innerHTML = `
            <h3>${panelData.name}</h3>
            <table class="details-table">
                <tr><td>النوع:</td><td>${translatePanelType(panelData.panel_type)}</td></tr>
                <tr><td>الجهد:</td><td>${panelData.voltage} فولت</td></tr>
                <tr><td>الأمبير:</td><td>${panelData.ampacity} أمبير</td></tr>
                <tr><td>عدد القواطع:</td><td>${breakersData.length}</td></tr>
                ${powerSourceInfo}
                <tr>
                    <td>نسبة الاستخدام:</td>
                    <td>
                        <div class="utilization-bar">
                            <div class="utilization-fill ${utilizationClass}" 
                                 style="width: ${utilizationPercent}%"></div>
                        </div>
                        <span>${utilizationPercent.toFixed(1)}%</span>
                    </td>
                </tr>
            </table>
            <div class="action-buttons">
                <a href="/panels/${panelId}/edit/" class="btn btn-primary">تحرير</a>
                <a href="/panels/${panelId}/add-breaker/" class="btn btn-success">
                    إضافة قاطع
                </a>
                <a href="/panels/${panelId}/loads-report/" class="btn btn-warning">
                    تقرير الأحمال
                </a>
                <a href="/network-visualizer/#panel-${panelId}" class="btn btn-info">
                    عرض في المخطط التفاعلي
                </a>
            </div>
        `;
        
        detailsPanel.style.display = 'block';
    } catch (error) {
        console.error('خطأ في جلب تفاصيل اللوحة:', error);
    }
}
```

### 3. عرض تقرير الأحمال (ميزة جديدة في الإصدار 2.1.0)

```javascript
// عرض تقرير أحمال اللوحة
async function showPanelLoadReport(panelId) {
    try {
        // جلب بيانات اللوحة
        const panelResponse = await fetch(`/api/panels/${panelId}/?format=json`);
        const panelData = await panelResponse.json();
        
        // جلب بيانات الأحمال المباشرة والفرعية
        const loadsResponse = await fetch(`/api/panels/${panelId}/all_loads/?format=json`);
        const loadsData = await loadsResponse.json();
        
        // تنظيم الأحمال حسب النوع
        const loadsByType = {};
        loadsData.forEach(load => {
            const type = load.load_type_display || 'غير محدد';
            if (!loadsByType[type]) {
                loadsByType[type] = {
                    count: 0,
                    totalAmpacity: 0,
                    loads: []
                };
            }
            
            loadsByType[type].count++;
            loadsByType[type].totalAmpacity += load.ampacity || 0;
            loadsByType[type].loads.push(load);
        });
        
        // عرض تقرير الأحمال
        const reportContainer = document.getElementById('loadReportContainer');
        reportContainer.innerHTML = `
            <h3>تقرير أحمال لوحة: ${panelData.name}</h3>
            <div class="summary-box">
                <div class="summary-item">
                    <span class="summary-label">إجمالي الأحمال:</span>
                    <span class="summary-value">${loadsData.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">إجمالي الاستهلاك:</span>
                    <span class="summary-value">${panelData.total_loads_info.total_ampacity} أمبير</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">نسبة الاستخدام:</span>
                    <span class="summary-value">${panelData.total_loads_info.utilization_percentage.toFixed(1)}%</span>
                </div>
            </div>
            
            <h4>توزيع الأحمال حسب النوع</h4>
            <div class="load-types-container">
                ${Object.entries(loadsByType).map(([type, data]) => `
                    <div class="load-type-box">
                        <h5>${type}</h5>
                        <div class="load-type-stats">
                            <div>العدد: ${data.count}</div>
                            <div>الاستهلاك: ${data.totalAmpacity} أمبير</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        reportContainer.style.display = 'block';
    } catch (error) {
        console.error('خطأ في جلب تقرير الأحمال:', error);
    }
}
```

## تخصيص المخطط الشجري

### تخصيص مظهر المخطط

يمكن تخصيص مظهر المخطط الشجري من خلال CSS:

```css
/* المظهر العام للشجرة */
.panel-tree {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    list-style-type: none;
    padding: 0;
}

/* نمط عقدة اللوحة */
.panel-info {
    display: flex;
    align-items: center;
    background-color: #f0f8ff;
    border: 1px solid #cce5ff;
    padding: 8px 12px;
    border-radius: 4px;
    margin: 4px 0;
    cursor: pointer;
    transition: all 0.3s;
}

/* تأثير التمرير على عقدة اللوحة */
.panel-info:hover {
    background-color: #d6ebff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* أنماط مختلفة حسب نوع اللوحة */
.panel-type-main { background-color: #d1ecf1; border-color: #bee5eb; }
.panel-type-sub_main { background-color: #d4edda; border-color: #c3e6cb; }
.panel-type-sub { background-color: #fff3cd; border-color: #ffeeba; }
.panel-type-distribution { background-color: #f8d7da; border-color: #f5c6cb; }

/* أنماط جديدة لمؤشر نسبة الاستخدام (الإصدار 2.1.0) */
.utilization-bar {
    width: 100%;
    height: 10px;
    background-color: #e9ecef;
    border-radius: 5px;
    overflow: hidden;
    margin-top: 3px;
}

.utilization-fill {
    height: 100%;
    background-color: #28a745;
}

.utilization-fill.warning {
    background-color: #ffc107;
}

.utilization-fill.critical {
    background-color: #dc3545;
}
```

### تخصيص تقرير الأحمال (الإصدار 2.1.0)

```css
/* تصميم تقرير الأحمال */
.load-types-container {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-top: 20px;
}

.load-type-box {
    flex: 1 1 200px;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 5px;
    padding: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.load-type-box h5 {
    margin-top: 0;
    color: #495057;
    border-bottom: 1px solid #dee2e6;
    padding-bottom: 5px;
}

.load-type-stats {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    color: #6c757d;
}

.summary-box {
    display: flex;
    justify-content: space-between;
    background-color: #e9ecef;
    border-radius: 5px;
    padding: 15px;
    margin-bottom: 20px;
}

.summary-item {
    text-align: center;
}

.summary-label {
    display: block;
    color: #6c757d;
    font-size: 0.9em;
}

.summary-value {
    display: block;
    font-size: 1.2em;
    font-weight: bold;
    color: #212529;
    margin-top: 5px;
}
```

## نصائح وأفضل الممارسات

1. **الهيكل المتوازن**: تصميم هيكل شجري متوازن للوحات لتحسين قابلية القراءة
2. **تسمية مناسبة**: استخدام تسميات وصفية واضحة للوحات
3. **مراقبة العمق**: تجنب الإفراط في عمق الشجرة (أكثر من 5-6 مستويات)
4. **الاتساق البصري**: الحفاظ على ألوان وأنماط متسقة لتسهيل الفهم
5. **مراقبة استخدام القدرة**: الانتباه للوحات التي تقترب من الحد الأقصى لقدرتها
6. **التوثيق المنتظم**: توثيق أي تغييرات في هيكل اللوحات

## تطويرات مستقبلية مقترحة

1. **البحث في الشجرة**: إضافة وظيفة بحث للعثور على لوحة معينة
2. **تصفية العناصر**: إمكانية تصفية العرض حسب النوع أو المستوى
3. **عرض تفاصيل أكثر**: عرض بيانات إضافية مثل الاستهلاك الفعلي
4. **تغيير الهيكل**: السماح بتغيير هيكل اللوحات بالسحب والإفلات
5. **تكامل أفضل مع المخطط التفاعلي**: تزامن حالة التحديد بين المخططين
6. **مقارنة اللوحات**: إضافة أداة لمقارنة اللوحات المختلفة وأحمالها
7. **التنبيه عن الزيادات**: إضافة نظام تنبيهات للتحذير من زيادة الأحمال
8. **تحليل المسار الحرج**: تحديد المسارات الحرجة في هيكل اللوحات