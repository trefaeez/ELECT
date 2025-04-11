/**
 * network-visualizer-d3.js
 * وصف:
 * - يعرض شبكة كهربائية تفاعلية باستخدام مكتبة D3.js.
 * - يتم تحميل بيانات الشبكة من API وبناء هيكل شجري للعقد والحواف.
 * - يستخدم d3-force لتوزيع العقد تلقائيًا.
 * - تُرسم الحواف باستخدام منحنيات بيزييه (Bezier curves) لتكون شكل الموصلات مشابهًا للنسخة الأصلية.
 * - يدعم التكبير/التصغير (Zoom/Pan)، السحب (Drag)، عرض تفاصيل العقد،
 *   وكذلك دعم خاصية الطي/التوسيع (collapse/expand) وأيضًا آلية الفلترة التي تُعيد ربط الحواف للعقد المخفية.
 *
 * ملاحظة: تأكد من تحميل مكتبة D3.js (مثلاً d3.v7) وإدراجها في صفحة HTML.
 */

// المتغيرات العالمية
let svg, g;                       // عنصر SVG الأساسي ومجموعة g لتطبيق التكبير والسحب
let linkGroup, nodeGroup;         // مجموعات الحواف والعقد
let simulation;                   // محاكاة d3-force
let width = window.innerWidth;
let height = window.innerHeight;
let zoom;                         // دالة التكبير/التصغير
let selectedNode = null;          // لتخزين العقدة المحددة
let networkData = { nodes: [], edges: [] }; // بيانات الشبكة المستخدمة في المحاكاة
// حفظ نسخة من الحواف الأصلية قبل تطبيق تغييرات الفلترة
let originalEdges = [];

// خريطة الأب للعقد (childId -> parentId)
// تُبنى أثناء بناء الهيكل الشجري (تعتمد على العلاقات الواردة في البيانات)
let parentMap = {};

// كائن لتخزين إعدادات التصفية حسب نوع العقد
// القيمة true تعني عرض العقد، false يعني إخفاءها
let filters = {
  'powerSource': true,
  'panel': true,
  'circuitBreaker': true,
  'load': true
};

// تعريف ألوان وأنواع العقد
const typeColors = {
  'powerSource': '#dc3545',
  'panel': '#198754',
  'circuitBreaker': '#ffc107',
  'load': '#0d6efd'
};
const typeNames = {
  'powerSource': 'مصدر طاقة',
  'panel': 'لوحة كهربائية',
  'circuitBreaker': 'قاطع كهربائي',
  'load': 'حمل كهربائي'
};

/* ===========================================================
   أقسام تحميل وبناء بيانات الشبكة
   =========================================================== */

/**
 * تحميل بيانات الشبكة من API.
 * يفترض وجود كائن NetworkAPI يحتوي على الدوال:
 * getPowerSources(), getPanels(), getCircuitBreakers(), getLoads().
 */
async function loadNetworkData() {
  try {
    const powerSourcesResponse = await NetworkAPI.getPowerSources();
    const panelsResponse = await NetworkAPI.getPanels();
    const breakersResponse = await NetworkAPI.getCircuitBreakers();
    const loadsResponse = await NetworkAPI.getLoads();

    if (!powerSourcesResponse.success || !panelsResponse.success ||
        !breakersResponse.success || !loadsResponse.success) {
      throw new Error('فشل في جلب بيانات الشبكة');
    }

    // بناء الهيكل الشجري الموحد وتخزين البيانات
    buildNetworkHierarchy(
      powerSourcesResponse.data,
      panelsResponse.data,
      breakersResponse.data,
      loadsResponse.data
    );

    // حفظ نسخة من الحواف الأصلية قبل تطبيق التصفية
    originalEdges = JSON.parse(JSON.stringify(networkData.edges));

    // بعد تحميل البيانات، تهيئة المخطط
    initializeNetworkVisualizer();

    // تطبيق الفلاتر الأولية (يمكن استدعاء updateFiltering لاحقاً عند تغيير معايير الفلترة)
    updateFiltering();
  } catch (error) {
    console.error('حدث خطأ أثناء تحميل بيانات الشبكة:', error);
    alert('حدث خطأ أثناء تحميل بيانات الشبكة. يرجى المحاولة لاحقاً.');
  }
}

/**
 * بناء الهيكل الشجري وتجهيز بيانات العقد والحواف.
 */
function buildNetworkHierarchy(powerSources, panels, breakers, loads) {
  networkData.nodes = [];
  networkData.edges = [];
  parentMap = {}; // إعادة تعيين خريطة الأب

  // إضافة مصادر الطاقة (الجذور: لا تمتلك أبًا)
  powerSources.forEach(source => {
    networkData.nodes.push({
      id: 'ps-' + source.id,
      label: source.name,
      entityType: 'powerSource',
      sourceData: source,
      collapsed: false,
      visible: true // الافتراضي: ظاهر
    });
  });

  // إضافة اللوحات الكهربائية
  panels.forEach(panel => {
    networkData.nodes.push({
      id: 'panel-' + panel.id,
      label: panel.name,
      entityType: 'panel',
      sourceData: panel,
      collapsed: false,
      visible: true
    });
    // تحديد الأب: إذا كانت اللوحة مرتبطة بمصدر أو بلوحة أم
    if (panel.power_source) {
      parentMap['panel-' + panel.id] = 'ps-' + panel.power_source;
    }
    if (panel.parent_panel) {
      parentMap['panel-' + panel.id] = 'panel-' + panel.parent_panel;
    }
  });

  // إضافة القواطع الكهربائية
  breakers.forEach(breaker => {
    networkData.nodes.push({
      id: 'breaker-' + breaker.id,
      label: breaker.name || ('قاطع ' + breaker.id),
      entityType: 'circuitBreaker',
      sourceData: breaker,
      collapsed: false,
      visible: true
    });
    if (breaker.panel) {
      parentMap['breaker-' + breaker.id] = 'panel-' + breaker.panel;
    }
  });

  // إضافة الأحمال الكهربائية
  loads.forEach(load => {
    networkData.nodes.push({
      id: 'load-' + load.id,
      label: load.name,
      entityType: 'load',
      sourceData: load,
      visible: true
    });
    if (load.breaker) {
      parentMap['load-' + load.id] = 'breaker-' + load.breaker;
    }
  });

  // إنشاء الحواف بناءً على العلاقات:
  // ربط مصادر الطاقة باللوحات الكهربائية
  panels.forEach(panel => {
    if (panel.power_source) {
      networkData.edges.push({
        id: `edge-ps${panel.power_source}-panel${panel.id}`,
        source: 'ps-' + panel.power_source,
        target: 'panel-' + panel.id,
        label: 'يغذي'
      });
    }
    if (panel.parent_panel) {
      networkData.edges.push({
        id: `edge-panel${panel.parent_panel}-panel${panel.id}`,
        source: 'panel-' + panel.parent_panel,
        target: 'panel-' + panel.id,
        label: 'فرعية'
      });
    }
  });

  // ربط القواطع باللوحات الكهربائية
  breakers.forEach(breaker => {
    if (breaker.panel) {
      networkData.edges.push({
        id: `edge-panel${breaker.panel}-breaker${breaker.id}`,
        source: 'panel-' + breaker.panel,
        target: 'breaker-' + breaker.id
      });
    }
  });

  // ربط الأحمال بالقواطع الكهربائية
  loads.forEach(load => {
    if (load.breaker) {
      networkData.edges.push({
        id: `edge-breaker${load.breaker}-load${load.id}`,
        source: 'breaker-' + load.breaker,
        target: 'load-' + load.id
      });
    }
  });
}

/* ===========================================================
   تهيئة المخطط باستخدام D3.js ومحاكاة القوى
   =========================================================== */

/**
 * تهيئة المخطط:
 * - إنشاء عنصر SVG داخل الحاوية وتطبيق خاصية التكبير/التصغير.
 * - إعداد محاكاة d3-force لتوزيع العقد.
 * - رسم الحواف باستخدام عناصر <path> مع منحنى بيزييه والعقد باستخدام مجموعات <g>.
 */
function initializeNetworkVisualizer() {
  svg = d3.select('#networkContainer')
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .attr('class', 'network-graph');

  zoom = d3.zoom()
           .scaleExtent([0.1, 5])
           .on('zoom', (event) => {
             g.attr('transform', event.transform);
           });
  svg.call(zoom);

  g = svg.append('g');
  linkGroup = g.append('g').attr('class', 'edges-group');
  nodeGroup = g.append('g').attr('class', 'nodes-group');

  simulation = d3.forceSimulation(networkData.nodes)
                 .force('link', d3.forceLink(networkData.edges)
                                   .id(d => d.id)
                                   .distance(150))
                 .force('charge', d3.forceManyBody().strength(-300))
                 .force('center', d3.forceCenter(width / 2, height / 2))
                 .on('tick', ticked);

  // رسم الحواف باستخدام <path> مع منحنى بيزييه
  linkGroup.selectAll('path')
           .data(networkData.edges)
           .enter()
           .append('path')
           .attr('class', 'edge-path')
           .attr('stroke', '#6c757d')
           .attr('stroke-width', 2)
           .attr('fill', 'none');

  // رسم العقد كمجموعات <g>
  const nodes = nodeGroup.selectAll('g')
                         .data(networkData.nodes)
                         .enter()
                         .append('g')
                         .attr('class', d => `network-node ${d.entityType}-node`)
                         .attr('id', d => `node-${d.id}`)
                         .call(d3.drag()
                                  .on('start', dragstarted)
                                  .on('drag', dragged)
                                  .on('end', dragended));

  nodes.append('rect')
       .attr('width', 150)
       .attr('height', 40)
       .attr('rx', 5)
       .attr('ry', 5)
       .attr('fill', d => typeColors[d.entityType] || '#6c757d')
       .attr('stroke', '#222138')
       .attr('stroke-width', 1);

  nodes.append('text')
       .attr('x', 75)
       .attr('y', 25)
       .attr('text-anchor', 'middle')
       .attr('dominant-baseline', 'middle')
       .attr('fill', 'white')
       .style('font-family', 'Arial, sans-serif')
       .style('font-size', '14px')
       .text(d => d.label);

  nodes.on('click', function(event, d) {
    event.stopPropagation();
    selectNode(d, d3.select(this));
  });

  console.log('تم تهيئة المخطط باستخدام D3.js.');
}

/**
 * دالة لحساب مسار منحني (Bezier curve) للحواف.
 * @param {Object} d - بيانات الحافة.
 * @returns {string} - سلسلة المسار (d attribute).
 */
function linkPath(d) {
  const sourceX = d.source.x,
        sourceY = d.source.y,
        targetX = d.target.x,
        targetY = d.target.y;
  const dx = Math.abs(targetX - sourceX),
        curve = Math.min(dx / 2, 100);
  return `M ${sourceX},${sourceY}
          C ${sourceX},${sourceY + curve}
            ${targetX},${targetY - curve}
            ${targetX},${targetY}`;
}

/**
 * دالة ticked التي تُستدعى في كل tick من محاكاة d3-force لتحديث مواقع الحواف والعقد.
 */
function ticked() {
  linkGroup.selectAll('path')
           .attr('d', d => linkPath(d));
  nodeGroup.selectAll('g')
           .attr('transform', d => `translate(${d.x - 75}, ${d.y - 20})`);
}

/* ===========================================================
   وظائف السحب والتكبير/التصغير بواسطة d3.drag
   =========================================================== */
function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}
function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}
function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

/* ===========================================================
   وظائف التعامل مع العقد (التحديد، عرض التفاصيل، الطي/التوسيع)
   =========================================================== */
/**
 * عند النقر على عقدة:
 * - إعادة ضبط التمييز للعقد السابقة.
 * - تمييز العقدة الحالية وعرض تفاصيلها.
 * - إذا كانت تحتوي على أبناء، تبديل حالة الطي/التوسيع.
 */
function selectNode(d, nodeSelection) {
  if (selectedNode) {
    d3.select(`#node-${selectedNode.id} rect`)
      .attr('stroke-width', 1)
      .attr('stroke', '#222138');
  }
  selectedNode = d;
  nodeSelection.select('rect')
               .attr('stroke-width', 3)
               .attr('stroke', '#ff8c00');
  displayNodeDetails(d);
  if (hasChildren(d)) {
    toggleCollapseNode(d);
  }
}

/**
 * عرض تفاصيل العقدة في لوحة معلومات (يتطلب وجود عناصر HTML بمعرف detailsTitle و detailsContent).
 */
function displayNodeDetails(d) {
  const detailsTitle = document.getElementById('detailsTitle');
  const detailsContent = document.getElementById('detailsContent');
  detailsTitle.textContent = d.label;
  let content = `<table class="table table-sm node-details-table">
                   <tbody>
                     <tr>
                       <td>نوع العنصر</td>
                       <td>${typeNames[d.entityType] || d.entityType}</td>
                     </tr>`;
  if (d.entityType === 'powerSource') {
    content += `<tr><td>الجهد</td><td>${d.sourceData.voltage || '-'}</td></tr>
                <tr><td>القدرة الكلية</td><td>${d.sourceData.capacity || '-'}</td></tr>`;
  } else if (d.entityType === 'panel') {
    content += `<tr><td>نوع اللوحة</td><td>${d.sourceData.panel_type || '-'}</td></tr>
                <tr><td>التيار المقنن</td><td>${d.sourceData.current_rating || '-'}</td></tr>`;
  } else if (d.entityType === 'circuitBreaker') {
    content += `<tr><td>التيار المقنن</td><td>${d.sourceData.current_rating || '-'}</td></tr>
                <tr><td>عدد الأقطاب</td><td>${d.sourceData.poles || '-'}</td></tr>`;
  } else if (d.entityType === 'load') {
    content += `<tr><td>القدرة</td><td>${d.sourceData.power || '-'}</td></tr>
                <tr><td>التيار</td><td>${d.sourceData.current || '-'}</td></tr>`;
  }
  content += `   </tbody>
              </table>`;
  detailsContent.innerHTML = content;
}

/**
 * التحقق مما إذا كانت العقدة (حسب نوعها) يمكن أن تحتوي على أبناء.
 */
function hasChildren(d) {
  return (d.entityType === 'powerSource' || d.entityType === 'panel' || d.entityType === 'circuitBreaker');
}

/**
 * تبديل حالة الطي/التوسيع لعقدة معينة.
 */
function toggleCollapseNode(d) {
  d.collapsed = !d.collapsed;
  console.log(`تم تغيير حالة العقدة ${d.id}: ${d.collapsed ? 'مطوية' : 'موسعة'}`);
  simulation.alpha(0.5).restart();
}

/* ===========================================================
   دعم الفلترة وإعادة ربط الحواف للعقد المخفية
   =========================================================== */
/**
 * تحديث الفلترة: تُطبّق معايير الفلترة (المُخزنة في filters) على كل عقدة،
 * ثم يتم تحديث حقل "visible" وإعادة ربط الحواف باستخدام updateFilteredEdges().
 */
function updateFiltering() {
  networkData.nodes.forEach(node => {
    node.visible = filters[node.entityType];
    d3.select(`#node-${node.id}`)
      .style('display', node.visible ? 'block' : 'none');
  });
  updateFilteredEdges();
}

/**
 * دالة مساعدة لإيجاد أقرب أسلاف ظاهر (visible) لعقدة معينة.
 * تستخدم خريطة parentMap للانتقال إلى الأب حتى نجد عقدة ظاهر.
 */
function getVisibleAncestor(nodeId) {
  let currentId = nodeId;
  while (currentId) {
    const currentNode = networkData.nodes.find(n => n.id === currentId);
    if (currentNode && currentNode.visible) {
      return currentNode;
    }
    currentId = parentMap[currentId];
  }
  return null;
}

/**
 * تحديث الحواف بحيث إذا كان أحد طرفي الحافة غير ظاهر، يُعاد توصيله
 * مع أقرب أسلاف ظاهر لضمان استمرار الاتصال.
 */
function updateFilteredEdges() {
  // استخدام نسخة من الحواف الأصلية لإعادة بناء الاتصالات
  networkData.edges = originalEdges.map(edge => Object.assign({}, edge));

  networkData.edges.forEach(edge => {
    let sourceNode = networkData.nodes.find(n => n.id === edge.source);
    let targetNode = networkData.nodes.find(n => n.id === edge.target);
    if (sourceNode && !sourceNode.visible) {
      const visibleAncestor = getVisibleAncestor(sourceNode.id);
      if (visibleAncestor) {
        edge.source = visibleAncestor.id;
      }
    }
    if (targetNode && !targetNode.visible) {
      const visibleAncestor = getVisibleAncestor(targetNode.id);
      if (visibleAncestor) {
        edge.target = visibleAncestor.id;
      }
    }
  });

  // إعادة رسم الحواف باستخدام البيانات المُحدّثة
  const edgeSelection = linkGroup.selectAll('path')
                                 .data(networkData.edges, d => d.id);
  edgeSelection.exit().remove();
  edgeSelection.attr('d', d => linkPath(d));
  edgeSelection.enter()
               .append('path')
               .attr('class', 'edge-path')
               .attr('stroke', '#6c757d')
               .attr('stroke-width', 2)
               .attr('fill', 'none')
               .attr('d', d => linkPath(d));
}

/* ===========================================================
   ربط عناصر HTML للتحكم بالفلترة (مثال)
   =========================================================== */
// نفترض وجود CheckBoxes مع المعرفات التالية:
// filter-powerSource, filter-panel, filter-circuitBreaker, filter-load
function bindFilterControls() {
  ['powerSource', 'panel', 'circuitBreaker', 'load'].forEach(type => {
    const checkbox = document.getElementById(`filter-${type}`);
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        filters[type] = e.target.checked;
        updateFiltering();
      });
    }
  });
}

/* ===========================================================
   بدء تشغيل تحميل البيانات عند تحميل الصفحة
   =========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  loadNetworkData();
  // ربط عناصر الفلترة إذا وُجدت عناصر HTML للتحكم
  bindFilterControls();
});