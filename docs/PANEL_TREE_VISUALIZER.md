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

### 2. ميزات الطي والتوسعة

- **الطي الافتراضي**: جميع اللوحات الفرعية مطوية افتراضياً لتسهيل القراءة
- **التوسعة عند الطلب**: يمكن توسعة أي لوحة لعرض اللوحات الفرعية الخاصة بها
- **رموز الطي/التوسعة**: رموز بصرية واضحة تشير إلى إمكانية الطي أو التوسعة

### 3. عرض تفاصيل اللوحة

عند النقر على أي لوحة، يتم عرض تفاصيلها:

- **البيانات الأساسية**: الاسم، النوع، الجهد، الأمبير
- **مصدر التغذية**: اللوحة الأم أو مصدر الطاقة المغذي
- **القواطع**: عدد القواطع في اللوحة
- **الأحمال**: عدد الأحمال المتصلة (مباشرة أو غير مباشرة)

### 4. روابط سريعة للوظائف

المخطط يوفر روابط سريعة للأعمال الشائعة:

- **تحرير اللوحة**: رابط مباشر لتحرير بيانات اللوحة
- **إضافة لوحة فرعية**: إضافة لوحة فرعية جديدة
- **عرض في المخطط التفاعلي**: انتقال إلى المخطط التفاعلي مع تحديد اللوحة تلقائياً

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
        });
    }
    
    return panelItem;
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
        detailsPanel.innerHTML = `
            <h3>${panelData.name}</h3>
            <table class="details-table">
                <tr><td>النوع:</td><td>${translatePanelType(panelData.panel_type)}</td></tr>
                <tr><td>الجهد:</td><td>${panelData.voltage} فولت</td></tr>
                <tr><td>الأمبير:</td><td>${panelData.ampacity} أمبير</td></tr>
                <tr><td>عدد القواطع:</td><td>${breakersData.length}</td></tr>
                <!-- بيانات إضافية -->
            </table>
            <div class="action-buttons">
                <a href="/panels/${panelId}/edit/" class="btn btn-primary">تحرير</a>
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
```

### إضافة وظائف جديدة

لإضافة وظائف جديدة للمخطط الشجري:

1. تعديل وظائف JS في ملف `panel-tree-visualizer.js`
2. إضافة عناصر واجهة مستخدم جديدة في قالب HTML
3. ربط المستمعات بالأحداث المناسبة

## نصائح وأفضل الممارسات

1. **الهيكل المتوازن**: تصميم هيكل شجري متوازن للوحات لتحسين قابلية القراءة
2. **تسمية مناسبة**: استخدام تسميات وصفية واضحة للوحات
3. **مراقبة العمق**: تجنب الإفراط في عمق الشجرة (أكثر من 5-6 مستويات)
4. **الاتساق البصري**: الحفاظ على ألوان وأنماط متسقة لتسهيل الفهم

## تطويرات مستقبلية مقترحة

1. **البحث في الشجرة**: إضافة وظيفة بحث للعثور على لوحة معينة
2. **تصفية العناصر**: إمكانية تصفية العرض حسب النوع أو المستوى
3. **عرض تفاصيل أكثر**: عرض بيانات إضافية مثل الاستهلاك الفعلي
4. **تغيير الهيكل**: السماح بتغيير هيكل اللوحات بالسحب والإفلات
5. **تكامل أفضل مع المخطط التفاعلي**: تزامن حالة التحديد بين المخططين