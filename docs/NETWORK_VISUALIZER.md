# توثيق المخطط التفاعلي للشبكة الكهربائية

## نظرة عامة

المخطط التفاعلي للشبكة الكهربائية هو واجهة رسومية تسمح للمستخدم برؤية وتفاعل مع عناصر الشبكة الكهربائية بشكل مباشر. يعرض المخطط جميع عناصر الشبكة (مصادر الطاقة، اللوحات، القواطع، والأحمال) في صفحة واحدة مع إمكانية التصفح والتفاعل.

![مخطط الشبكة التفاعلي](../static/images/network-diagram-example.png)

## الملفات الرئيسية

المخطط التفاعلي يتكون من الملفات التالية:

- **`templates/network-visualizer.html`**: قالب HTML الرئيسي للمخطط التفاعلي
- **`static/js/network-visualizer.js`**: شيفرة JavaScript للتفاعل والعرض
- **`network/views.py`**: وظائف العرض في Django لتقديم المخطط وبياناته

## ميزات المخطط التفاعلي

### 1. العرض الهيكلي للشبكة

المخطط يعرض الشبكة الكهربائية بطريقة هرمية:

1. **مصادر الطاقة** في الأعلى
2. **اللوحات الكهربائية** في المستوى الثاني
3. **القواطع** (مخفية افتراضياً) تظهر عند التفاعل
4. **الأحمال الكهربائية** متصلة مباشرة باللوحات في الوضع الافتراضي

### 2. الميزات التفاعلية

- **إخفاء/إظهار العناصر**: يمكن التحكم في ظهور كل نوع من العناصر باستخدام فلاتر العرض
- **التكبير/التصغير**: إمكانية التكبير والتصغير للتركيز على أجزاء محددة من المخطط
- **السحب والتنقل**: إمكانية سحب المخطط للتنقل في المساحات الكبيرة
- **تصدير المخطط**: إمكانية تصدير المخطط كصورة PNG للطباعة أو المشاركة
- **تمييز بصري لمستويات الجهد**: إضافة ألوان مختلفة لخطوط الاتصال حسب مستوى الجهد في الإصدار 2.1.0

### 3. ميزات العرض المطوي

لتحسين قابلية القراءة ومنع الازدحام، يقدم المخطط ميزات الطي الذكي:

- **القواطع مخفية افتراضيًا**: تظهر القواطع فقط عند النقر على اللوحة المرتبطة بها
- **الروابط المباشرة بين اللوحات والأحمال**: تظهر الأحمال متصلة مباشرة باللوحات عندما تكون القواطع مخفية
- **الإشارة الخاصة للقواطع**: عند ظهور القواطع، تظهر بتأثير حركي (وميض) للإشارة إلى التغيير

### 4. إضاءة المسارات

- **إضاءة مسارات التغذية**: عند النقر على أي عنصر، يتم إضاءة مسار التغذية من مصدر الطاقة إلى العنصر المحدد
- **تمييز مسار الأحمال**: إضاءة كل الأحمال المرتبطة بالعنصر المحدد
- **ألوان مختلفة للمسارات**: 
  - برتقالي للمسار التصاعدي (من العنصر إلى المصدر)
  - أزرق للمسار التنازلي (من العنصر إلى الأحمال)
- **تمييز مصادر الطاقة**: تحسين تمييز مصادر الطاقة مع معلومات إضافية في الإصدار 2.1.0

### 5. جداول ديناميكية للمسارات

عند تحديد أي عنصر في المخطط، يظهر جدول يعرض:

1. **تفاصيل العنصر المحدد**: معلومات تفصيلية عن العنصر
2. **جدول مسار التغذية**: قائمة بجميع العناصر في مسار التغذية مرتبة حسب النوع
   - مصادر الطاقة: الجهد، الأمبير الكلي
   - اللوحات: النوع، الجهد، الأمبير
   - القواطع: الأمبير المقنن، عدد الأقطاب
   - الأحمال: نوع الحمل، الأمبير، معامل القدرة
3. **معلومات مصدر الطاقة المحسنة**: عرض معلومات أكثر تفصيلاً عن مصادر الطاقة في الإصدار 2.1.0

### 6. تحسينات الإصدار 2.1.0

تم إضافة العديد من التحسينات في الإصدار 2.1.0 للمخطط التفاعلي:

1. **تمييز بصري لمستويات الجهد**: 
   - خطوط اتصال بألوان مختلفة حسب مستويات الجهد (مثلاً: أحمر للجهد العالي، أخضر للجهد المتوسط، أزرق للجهد المنخفض)
   - سماكات خطوط مختلفة حسب سعة التيار

2. **عرض معلومات مصادر الطاقة المحسنة**:
   - عرض تفصيلي لخصائص مصدر الطاقة مثل الجهد وسعة التيار
   - إظهار القواطع المرتبطة مباشرة بمصادر الطاقة (ميزة جديدة)

3. **تحسين كفاءة عرض العلاقات المتعددة للقواطع**:
   - تمثيل أفضل للعلاقات المعقدة بين القواطع
   - عرض روابط متعددة مع تمييز نوع العلاقة (رئيسي، فرعي، تغذية)

4. **تحسين الأداء مع الشبكات الكبيرة**:
   - تحسين خوارزميات الرسم لدعم عدد أكبر من العناصر
   - تحميل متزامن للبيانات لتحسين سرعة تحميل الصفحة

## هيكل الشيفرة وكيفية العمل

### 1. تحميل البيانات

عند زيارة صفحة المخطط التفاعلي، تتم العملية التالية:

```javascript
// تحميل بيانات الشبكة من واجهة برمجة التطبيقات
async function loadNetworkData() {
    // جلب البيانات من API
    const powerSources = await NetworkAPI.getPowerSources();
    const panels = await NetworkAPI.getPanels();
    const breakers = await NetworkAPI.getCircuitBreakers();
    const loads = await NetworkAPI.getLoads();
    
    // تحويل البيانات إلى عقد وروابط للرسم البياني
    networkData = {
        nodes: [...], // تحويل العناصر إلى عقد
        edges: [...] // إنشاء الروابط بين العناصر
    };
}
```

### 2. رسم المخطط التفاعلي

يستخدم المخطط عنصر SVG لرسم العناصر بشكل تفاعلي:

```javascript
function renderNetwork(nodesGroup, edgesGroup, data) {
    // رسم الحواف أولاً
    data.edges.forEach(edge => {
        // إنشاء حواف بين العناصر
    });
    
    // رسم العقد
    data.nodes.forEach(node => {
        // إنشاء العناصر المرئية
    });
}
```

### 3. العرض الافتراضي للقواطع والأحمال

عند التحميل الأولي، تكون القواطع مخفية والأحمال مرئية مع روابط مباشرة للوحات:

```javascript
function hideAllBreakers() {
    // إخفاء جميع القواطع
    networkData.nodes.forEach(node => {
        if (node.data.entityType === 'circuitBreaker') {
            // إخفاء القواطع
        }
    });
    
    // إخفاء الروابط بين اللوحات والقواطع
    networkData.edges.forEach(edge => {
        if (edge.source.startsWith('panel-') && 
            edge.target.startsWith('breaker-')) {
            // إخفاء الرابط
        }
        
        // إخفاء الروابط بين القواطع والأحمال أيضاً
        if (edge.source.startsWith('breaker-') && 
            edge.target.startsWith('load-')) {
            // إخفاء الرابط
        }
    });
}

function updateDirectPanelToLoadConnections() {
    // إنشاء روابط مباشرة بين اللوحات والأحمال
    // لعرضها عندما تكون القواطع مخفية
}
```

### 4. التفاعل مع المخطط

#### عند النقر على لوحة كهربائية:

```javascript
function showRelatedBreakers(panelId) {
    // إظهار القواطع المرتبطة باللوحة المحددة
    // إخفاء الروابط المباشرة بين اللوحة والأحمال
    // إظهار الروابط بين القواطع والأحمال
}
```

#### عند إلغاء تحديد اللوحة:

```javascript
function hideRelatedBreakers(panelId) {
    // إخفاء القواطع المرتبطة باللوحة
    // إعادة إظهار الروابط المباشرة بين اللوحة والأحمال
}
```

#### إضاءة مسارات التغذية:

```javascript
function highlightPowerPath(nodeId) {
    // تتبع المسار التصاعدي (من العنصر إلى المصدر)
    const upstreamPath = findUpstreamPath(nodeId);
    
    // تتبع المسار التنازلي (من العنصر إلى الأحمال)
    const downstreamPath = findDownstreamPath(nodeId);
    
    // إضاءة المسارات باستخدام ألوان مختلفة
}
```

### 5. تحسينات الإصدار 2.1.0 في الشيفرة

في الإصدار 2.1.0، تمت إضافة وظائف جديدة لتحسين المخطط:

```javascript
// تمييز مستويات الجهد المختلفة
function applyVoltageStyles(edge) {
    const voltageLevel = edge.data.voltageLevel;
    let strokeColor, strokeWidth;
    
    // تحديد لون وسماكة الخط حسب مستوى الجهد
    switch(voltageLevel) {
        case 'high': // جهد عالي
            strokeColor = '#ff0000'; // أحمر
            strokeWidth = 3;
            break;
        case 'medium': // جهد متوسط
            strokeColor = '#ffa500'; // برتقالي
            strokeWidth = 2;
            break;
        case 'low': // جهد منخفض
            strokeColor = '#0000ff'; // أزرق
            strokeWidth = 1.5;
            break;
        default:
            strokeColor = '#888888'; // رمادي (افتراضي)
            strokeWidth = 1;
    }
    
    // تطبيق الأنماط على الرابط
    edge.line
        .attr('stroke', strokeColor)
        .attr('stroke-width', strokeWidth);
}

// عرض معلومات القواطع المرتبطة بمصدر الطاقة
function showPowerSourceBreakers(powerSourceId) {
    // إظهار القواطع المرتبطة مباشرة بمصدر الطاقة
    networkData.nodes.forEach(node => {
        if (node.data.entityType === 'circuitBreaker' && 
            node.data.powerSourceId === powerSourceId) {
            // إظهار القاطع المرتبط بمصدر الطاقة
            node.element.classed('hidden', false);
            
            // إظهار الروابط المناسبة
            networkData.edges.forEach(edge => {
                if ((edge.source === `powerSource-${powerSourceId}` && 
                     edge.target === node.id) ||
                    (edge.source === node.id && 
                     edge.target.startsWith('load-'))) {
                    edge.line.classed('hidden', false);
                }
            });
        }
    });
}
```

## تخصيص وتعديل المخطط

### إضافة أنواع جديدة من العناصر

لإضافة نوع جديد من العناصر إلى المخطط:

1. أضف نوع العنصر الجديد إلى قواميس الألوان والأسماء:

```javascript
const typeColors = {
    'powerSource': '#dc3545', // أحمر
    'panel': '#198754',       // أخضر
    'circuitBreaker': '#ffc107', // أصفر
    'load': '#0d6efd',        // أزرق
    'newType': '#9c27b0'      // لون العنصر الجديد
};

const typeNames = {
    // إضافة الاسم العربي للنوع الجديد
    'newType': 'النوع الجديد'
};
```

2. عدل وظيفة `renderNetwork` لتدعم العنصر الجديد
3. أضف منطق التفاعل المناسب للنوع الجديد

### تخصيص مظهر المخطط

يمكن تخصيص مظهر المخطط من خلال:

1. **تعديل الأنماط CSS**: في ملف HTML أو ملف CSS منفصل
2. **تعديل خصائص SVG**: تغيير الألوان، السماكات، والتأثيرات في شيفرة JavaScript
3. **إضافة فلاتر إضافية**: تعديل وظيفة `applyFilters` لدعم فلاتر إضافية

### تخصيص ألوان مستويات الجهد (إصدار 2.1.0)

لتخصيص ألوان مستويات الجهد المختلفة:

```javascript
// تعريف ألوان مستويات الجهد
const voltageColors = {
    'extra-high': '#880000', // فوق العالي (أحمر داكن)
    'high': '#ff0000',       // عالي (أحمر)
    'medium': '#ffa500',     // متوسط (برتقالي)
    'low': '#0000ff',        // منخفض (أزرق)
    'extra-low': '#00aaff'   // فوق المنخفض (أزرق فاتح)
};

// تعديل وظيفة تخصيص أنماط الجهد
function applyVoltageStyles(edge) {
    const voltageLevel = edge.data.voltageLevel;
    const color = voltageColors[voltageLevel] || '#888888';
    
    // تطبيق اللون على الرابط
    edge.line.attr('stroke', color);
}
```

### إضافة وظائف جديدة

لإضافة وظائف جديدة للمخطط:

1. أضف وظائف JS جديدة في ملف `network-visualizer.js`
2. أضف عناصر واجهة مستخدم في ملف HTML
3. اربط الوظائف الجديدة بأحداث المستخدم المناسبة

## نصائح وأفضل الممارسات

1. **الاختبار على شبكات كبيرة**: تأكد من اختبار المخطط بعدد كبير من العناصر
2. **التحسين للأداء**: استخدم تقنيات تحسين الأداء مع الشبكات الكبيرة
3. **النسخ الاحتياطي**: احتفظ بنسخة احتياطية من بيانات الشبكة
4. **التفاعل في الوقت الحقيقي**: لاحظ أن التفاعل يتم في الجانب الأمامي دون الحاجة لإعادة تحميل الصفحة
5. **استخدام التصنيف الموحد للألوان**: اتبع نظام ترميز ألوان موحد لمستويات الجهد وأنواع العناصر

## تطويرات مستقبلية مقترحة

1. **تحرير العناصر مباشرة في المخطط**: إمكانية تحرير خصائص العناصر بالنقر المزدوج
2. **سحب وإفلات العناصر**: إمكانية إعادة ترتيب العناصر بالسحب والإفلات
3. **حفظ تخطيطات مخصصة**: حفظ موضع العناصر للمستخدمين
4. **تحليلات الحمل**: إضافة تحليل مرئي للأحمال على كل عنصر
5. **محاكاة الأعطال**: إضافة إمكانية محاكاة أعطال القواطع لرؤية تأثيرها على الشبكة
6. **تحويل لمكتبة React أو Vue**: تحويل المخطط إلى مكون في إطار عمل JavaScript حديث
7. **إضافة مؤشرات أداء الشبكة**: عرض مؤشرات الأداء الرئيسية مثل إجمالي الاستهلاك وتوازن الأحمال
8. **خريطة حرارية للأحمال**: إضافة طريقة عرض الخريطة الحرارية لتوزيع الأحمال على الشبكة
9. **التكامل مع بيانات الوقت الحقيقي**: إضافة إمكانية عرض بيانات التشغيل في الوقت الحقيقي
10. **التحليل المقارن**: إضافة أدوات لمقارنة أداء الشبكة بين فترات زمنية مختلفة