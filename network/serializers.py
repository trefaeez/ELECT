"""
نظام إدارة شبكة الطاقة الكهربائية - وحدة المُسلسلات (Serializers)
هذا الملف يحتوي على فئات المُسلسلات المسؤولة عن تحويل نماذج البيانات إلى JSON والعكس
تم تحديثه ليدعم الهيكلية الشجرية للوحات والعلاقات المتعددة بين القواطع
"""

# استيراد مكتبة serializers من Django REST framework لإنشاء فئات المُسلسلات
from rest_framework import serializers

# استيراد النماذج المختلفة من ملف models.py
from .models import (
    PowerSource,        # نموذج مصادر الطاقة (الشبكة المحلية، المولدات)
    Panel,              # نموذج موحد للوحات الكهربائية (رئيسية، رئيسية فرعية، فرعية)
    Load,               # نموذج الأحمال الكهربائية
    CircuitBreaker      # نموذج قواطع الدارة الكهربائية
)

# فئة المُسلسل الخاصة بقواطع الدارة (CircuitBreaker) - إصدار مختصر للعلاقات المتداخلة
class CircuitBreakerBasicSerializer(serializers.ModelSerializer):
    """
    مُسلسل قواطع الدارة الكهربائية المختصر
    يستخدم في العلاقات المتداخلة لتجنب التكرار العميق
    """
    panel_name = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()

    class Meta:
        model = CircuitBreaker
        fields = ['id', 'name', 'label', 'manufacturer', 'breaker_type', 'breaker_role', 
                  'rated_current', 'number_of_poles', 'panel', 'panel_name', 'role_display']
    
    def get_panel_name(self, obj):
        """إرجاع اسم اللوحة التي ينتمي إليها القاطع (إن وجدت)"""
        return obj.panel.name if obj.panel else None
    
    def get_role_display(self, obj):
        """إرجاع عرض مفهوم لدور القاطع"""
        return dict(CircuitBreaker.BREAKER_ROLE_CHOICES).get(obj.breaker_role, obj.breaker_role)

# فئة المُسلسل الكاملة الخاصة بقواطع الدارة (CircuitBreaker)
class CircuitBreakerSerializer(serializers.ModelSerializer):
    """
    مُسلسل قواطع الدارة الكهربائية
    يقوم هذا المُسلسل بتحويل بيانات قواطع الدارة من وإلى النموذج
    ويدعم العلاقات المتعددة بين القواطع
    """
    panel_name = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    feeding_breakers_info = serializers.SerializerMethodField()
    fed_breakers_info = serializers.SerializerMethodField()
    loads_info = serializers.SerializerMethodField()
    total_load = serializers.SerializerMethodField()
    full_path = serializers.SerializerMethodField()

    class Meta:
        model = CircuitBreaker
        fields = '__all__'
    
    def get_panel_name(self, obj):
        """إرجاع اسم اللوحة التي ينتمي إليها القاطع (إن وجدت)"""
        return obj.panel.name if obj.panel else None
    
    def get_role_display(self, obj):
        """إرجاع عرض مفهوم لدور القاطع"""
        return dict(CircuitBreaker.BREAKER_ROLE_CHOICES).get(obj.breaker_role, obj.breaker_role)
    
    def get_feeding_breakers_info(self, obj):
        """إرجاع معلومات القواطع التي تغذي هذا القاطع"""
        return CircuitBreakerBasicSerializer(obj.feeding_breakers.all(), many=True).data
    
    def get_fed_breakers_info(self, obj):
        """إرجاع معلومات القواطع التي يغذيها هذا القاطع"""
        return CircuitBreakerBasicSerializer(obj.fed_breakers.all(), many=True).data
    
    def get_loads_info(self, obj):
        """إرجاع معلومات الأحمال المتصلة بهذا القاطع"""
        loads = obj.loads.all()
        return [
            {
                'id': load.id,
                'name': load.name,
                'ampacity': load.ampacity,
                'load_type': load.load_type,
                'load_type_display': dict(Load.LOAD_TYPE_CHOICES).get(load.load_type, "غير محدد")
            } for load in loads
        ]
    
    def get_total_load(self, obj):
        """إرجاع إجمالي الحمل على هذا القاطع"""
        return obj.get_total_load()
    
    def get_full_path(self, obj):
        """إرجاع المسار الكامل للقاطع عبر سلسلة التغذية"""
        return obj.get_full_path()

# سيريلايزر لإنشاء قاطع جديد داخل لوحة
class PanelBreakerSerializer(serializers.ModelSerializer):
    """
    مُسلسل خاص بإنشاء قاطع جديد داخل لوحة محددة
    يستخدم لإنشاء قواطع توزيع في داخل اللوحات
    """
    class Meta:
        model = CircuitBreaker
        exclude = ['panel']  # استبعاد حقل panel لأنه سيتم تحديده تلقائياً
    
    def validate(self, data):
        """التحقق من صحة البيانات حسب دور القاطع"""
        breaker_role = data.get('breaker_role')
        
        if breaker_role == 'main':
            # التحقق مما إذا كانت اللوحة تحتوي بالفعل على قاطع رئيسي
            panel_id = self.context.get('panel_id')
            panel = Panel.objects.get(id=panel_id)
            
            if panel.main_breaker:
                raise serializers.ValidationError(
                    {"breaker_role": "هذه اللوحة تحتوي بالفعل على قاطع رئيسي. قم بتعديل القاطع الرئيسي الحالي أو استخدم دور آخر للقاطع الجديد"}
                )
        
        return data

    def create(self, validated_data):
        """إنشاء قاطع جديد وربطه باللوحة المحددة"""
        panel_id = self.context.get('panel_id')
        if not panel_id:
            raise serializers.ValidationError("يجب تحديد اللوحة")
        
        panel = Panel.objects.get(id=panel_id)
        
        # إنشاء القاطع وربطه باللوحة
        circuit_breaker = CircuitBreaker.objects.create(panel=panel, **validated_data)
        
        # إذا كان القاطع الجديد هو قاطع رئيسي، قم بتحديث اللوحة
        if validated_data.get('breaker_role') == 'main' and not panel.main_breaker:
            panel.main_breaker = circuit_breaker
            panel.save(update_fields=['main_breaker'])
        
        return circuit_breaker

# سيريلايزر لربط القواطع ببعضها (تحديد القواطع المغذية)
class BreakerFeedingSerializer(serializers.Serializer):
    """
    مُسلسل خاص بربط القواطع ببعضها البعض
    يستخدم لتحديد علاقات التغذية بين القواطع
    """
    feeding_breakers = serializers.PrimaryKeyRelatedField(
        queryset=CircuitBreaker.objects.all(),
        many=True,
        required=True,
        help_text="القواطع التي تغذي هذا القاطع"
    )
    
    def validate_feeding_breakers(self, value):
        """التحقق من عدم وجود دورات في علاقات التغذية"""
        if self.instance.id in [breaker.id for breaker in value]:
            raise serializers.ValidationError("لا يمكن أن يكون القاطع مغذيًا لنفسه")
        
        # التحقق من عدم وجود دورات معقدة
        for feeding_breaker in value:
            # تحقق مما إذا كان القاطع الحالي يغذي بشكل مباشر أو غير مباشر أحد القواطع المغذية
            if self._is_feeding_recursively(self.instance, feeding_breaker):
                raise serializers.ValidationError(
                    f"يوجد دورة في سلسلة التغذية: القاطع {self.instance} يغذي بالفعل القاطع {feeding_breaker}"
                )
        
        return value
    
    def _is_feeding_recursively(self, source_breaker, target_breaker):
        """التحقق مما إذا كان القاطع المصدر يغذي القاطع الهدف بشكل مباشر أو غير مباشر"""
        # تجنب الاستدعاء الذاتي إذا لم يكن لدينا معرف للقاطع المصدر (مثل عند إنشاء قاطع جديد)
        if not source_breaker.id:
            return False
        
        # لا نحتاج إلى التحقق من القاطع نفسه
        if source_breaker.id == target_breaker.id:
            return True
        
        # التحقق من القواطع التي يغذيها القاطع المصدر
        for fed_breaker in source_breaker.fed_breakers.all():
            if fed_breaker.id == target_breaker.id:
                return True
            if self._is_feeding_recursively(fed_breaker, target_breaker):
                return True
        
        return False
    
    def update(self, instance, validated_data):
        """تحديث علاقات التغذية للقاطع"""
        feeding_breakers = validated_data.get('feeding_breakers', [])
        
        # إعادة تعيين العلاقات
        instance.feeding_breakers.set(feeding_breakers)
        
        return instance

# سيريلايزر لإنشاء لوحة جديدة مرتبطة بمصدر طاقة
class PowerSourcePanelSerializer(serializers.ModelSerializer):
    """
    مُسلسل خاص بإنشاء لوحة جديدة مرتبطة بمصدر طاقة محدد
    يستخدم لإضافة لوحات رئيسية من صفحة مصدر الطاقة
    """
    class Meta:
        model = Panel
        exclude = ['power_source']  # استبعاد حقل power_source لأنه سيتم تحديده تلقائياً

    def create(self, validated_data):
        """إنشاء لوحة جديدة وربطها بمصدر الطاقة المحدد"""
        power_source_id = self.context.get('power_source_id')
        if not power_source_id:
            raise serializers.ValidationError("يجب تحديد مصدر الطاقة")
        
        power_source = PowerSource.objects.get(id=power_source_id)
        
        # التأكد من أن اللوحة الجديدة مرتبطة بمصدر الطاقة وتعيين النوع كلوحة رئيسية
        panel = Panel.objects.create(
            power_source=power_source,
            panel_type='main',  # تعيين كلوحة رئيسية لأنها متصلة بمصدر طاقة مباشرة
            **validated_data
        )
        return panel

# سيريلايزر لإنشاء لوحة فرعية مرتبطة بلوحة أم
class ParentPanelChildSerializer(serializers.ModelSerializer):
    """
    مُسلسل خاص بإنشاء لوحة فرعية مرتبطة بلوحة أم محددة
    يستخدم لإضافة لوحات فرعية من صفحة اللوحة الأم
    """
    class Meta:
        model = Panel
        exclude = ['parent_panel', 'power_source']  # استبعاد الحقول التي سيتم تحديدها تلقائياً
    
    def validate(self, data):
        """التحقق من صحة البيانات للوحة الفرعية"""
        panel_type = data.get('panel_type')
        
        # التأكد من أن نوع اللوحة الجديدة هو فرعية أو رئيسية فرعية
        if panel_type == 'main':
            raise serializers.ValidationError({
                "panel_type": "اللوحة الفرعية لا يمكن أن تكون من نوع رئيسية"
            })
        
        return data
    
    def create(self, validated_data):
        """إنشاء لوحة فرعية وربطها باللوحة الأم المحددة"""
        parent_panel_id = self.context.get('parent_panel_id')
        feeder_breaker_id = self.context.get('feeder_breaker_id')
        
        if not parent_panel_id:
            raise serializers.ValidationError("يجب تحديد اللوحة الأم")
        
        parent_panel = Panel.objects.get(id=parent_panel_id)
        
        # التحقق من وجود القاطع المغذي واعتباره إجباريًا
        if not feeder_breaker_id:
            raise serializers.ValidationError("يجب تحديد القاطع المغذي للوحة الفرعية")
        
        try:
            feeder_breaker = CircuitBreaker.objects.get(id=feeder_breaker_id)
            
            # التأكد من أن القاطع المغذي ينتمي إلى اللوحة الأم
            if feeder_breaker.panel != parent_panel:
                raise serializers.ValidationError("القاطع المغذي لا ينتمي إلى اللوحة الأم المحددة")
            
            # إنشاء اللوحة الفرعية وربطها باللوحة الأم والقاطع المغذي
            panel = Panel.objects.create(
                parent_panel=parent_panel,
                feeder_breaker=feeder_breaker,
                **validated_data
            )
            
            return panel
            
        except CircuitBreaker.DoesNotExist:
            raise serializers.ValidationError("القاطع المغذي غير موجود")

# سيريلايزر لإنشاء حمل جديد مرتبط بقاطع
class BreakerLoadSerializer(serializers.ModelSerializer):
    """
    مُسلسل خاص بإنشاء حمل جديد مرتبط بقاطع محدد
    يستخدم لإضافة أحمال من صفحة القاطع
    """
    class Meta:
        model = Load
        exclude = ['breaker', 'panel']  # استبعاد حقول breaker و panel لأنها ستحدد تلقائياً

    def create(self, validated_data):
        """إنشاء حمل جديد وربطه بالقاطع واللوحة المحددين"""
        breaker_id = self.context.get('breaker_id')
        panel_id = self.context.get('panel_id')
        
        if not breaker_id:
            raise serializers.ValidationError("يجب تحديد القاطع")
        
        breaker = CircuitBreaker.objects.get(id=breaker_id)
        
        # للتأكد من الاتساق، نتحقق من وجود اللوحة التي ينتمي إليها القاطع
        if panel_id:
            panel = Panel.objects.get(id=panel_id)
        elif breaker.panel:
            panel = breaker.panel
        else:
            raise serializers.ValidationError("لا يمكن إضافة حمل لقاطع غير مرتبط بلوحة")
        
        # إنشاء الحمل مع ربطه بالقاطع واللوحة
        load = Load.objects.create(
            breaker=breaker,
            panel=panel,
            **validated_data
        )
        return load

# فئة المُسلسل الخاصة بمصادر الطاقة (PowerSource)
class PowerSourceSerializer(serializers.ModelSerializer):
    """
    مُسلسل مصادر الطاقة
    يقوم هذا المُسلسل بتحويل بيانات مصادر الطاقة من وإلى النموذج
    ويتضمن بيانات القاطع الرئيسي للمصدر
    """
    # إضافة تفاصيل القاطع الرئيسي للمصدر للعرض فقط
    main_breaker_details = CircuitBreakerSerializer(source='main_breaker', read_only=True)
    
    # إضافة تفاصيل اللوحات المتصلة للعرض فقط
    panels = serializers.SerializerMethodField()
    
    # إضافة مواصفات الكابل المُجمعة
    cable_specification = serializers.SerializerMethodField()
    
    class Meta:
        model = PowerSource
        fields = '__all__'
    
    def get_panels(self, obj):
        """إرجاع معلومات اللوحات المتصلة بمصدر الطاقة"""
        panels = obj.panels.all()
        return [
            {
                'id': panel.id,
                'name': panel.name,
                'panel_type': panel.panel_type,
                'ampacity': panel.ampacity
            } for panel in panels
        ]
    
    def get_cable_specification(self, obj):
        """إرجاع مواصفات الكابل بتنسيق نصي"""
        return obj.get_cable_specification()

# فئة المُسلسل الخاصة باللوحات (Panel) - إصدار مختصر للعلاقات المتداخلة
class PanelBasicSerializer(serializers.ModelSerializer):
    """
    مُسلسل مختصر للوحات الكهربائية
    يستخدم في العلاقات المتداخلة لتجنب التكرار العميق
    """
    class Meta:
        model = Panel
        fields = ['id', 'name', 'panel_type', 'ampacity', 'voltage']

# فئة المُسلسل الخاصة باللوحات (Panel)
class PanelSerializer(serializers.ModelSerializer):
    """
    مُسلسل اللوحات الكهربائية
    يقوم هذا المُسلسل بتحويل بيانات اللوحات من وإلى النموذج
    ويتضمن تفاصيل القاطع الرئيسي والقواطع الفرعية ومصدر التغذية
    ويدعم الهيكلية الشجرية للوحات
    """
    # إضافة تفاصيل القاطع الرئيسي للوحة للعرض فقط
    main_breaker_details = CircuitBreakerSerializer(source='main_breaker', read_only=True)
    
    # إضافة تفاصيل جميع القواطع في اللوحة للعرض فقط
    breakers = serializers.SerializerMethodField()
    
    # إضافة تفاصيل القاطع المغذي للوحة (في حالة اللوحة الفرعية) للعرض فقط
    feeder_breaker_details = CircuitBreakerSerializer(source='feeder_breaker', read_only=True)
    
    # إضافة تفاصيل مصدر الطاقة (في حالة اللوحة الرئيسية) للعرض فقط
    power_source_details = PowerSourceSerializer(source='power_source', read_only=True)
    
    # إضافة تفاصيل اللوحة الأم (في حالة اللوحة الفرعية) للعرض فقط
    parent_panel_details = PanelBasicSerializer(source='parent_panel', read_only=True)
    
    # إضافة تفاصيل اللوحات الفرعية للعرض فقط
    child_panels = serializers.SerializerMethodField()
    
    # إضافة تفاصيل الأحمال المتصلة للعرض فقط
    loads = serializers.SerializerMethodField()
    
    # إضافة المسار الكامل للوحة
    full_path = serializers.SerializerMethodField()
    
    # إضافة إجمالي الأحمال
    total_loads_info = serializers.SerializerMethodField()
    
    # إضافة مواصفات الكابل المُجمعة
    cable_specification = serializers.SerializerMethodField()
    
    class Meta:
        model = Panel
        fields = '__all__'
    
    def validate(self, data):
        """
        التحقق من صحة البيانات حسب نوع اللوحة
        يتأكد من استيفاء شروط اللوحة الرئيسية واللوحة الفرعية
        """
        panel_type = data.get('panel_type')
        power_source = data.get('power_source')
        parent_panel = data.get('parent_panel')
        
        # التحقق من شروط اللوحة الرئيسية
        if panel_type == 'main':
            if not power_source:
                raise serializers.ValidationError({"power_source": "يجب تحديد مصدر الطاقة للوحة الرئيسية"})
            if parent_panel:
                raise serializers.ValidationError({"parent_panel": "اللوحة الرئيسية لا يمكن أن تكون متصلة بلوحة أم"})
        
        # التحقق من شروط اللوحة الفرعية والرئيسية الفرعية
        elif panel_type in ['sub', 'sub_main']:
            if not parent_panel:
                raise serializers.ValidationError({"parent_panel": "يجب تحديد اللوحة الأم للوحة الفرعية"})
            if power_source:
                raise serializers.ValidationError({"power_source": "اللوحة الفرعية لا يمكن أن تكون متصلة بمصدر طاقة مباشرة"})
        
        # منع الدارات في هيكل اللوحات
        if parent_panel and self.instance:
            if parent_panel.id == self.instance.id:
                raise serializers.ValidationError({"parent_panel": "لا يمكن أن تكون اللوحة أم لنفسها"})
                
            # التحقق من عدم تعيين لوحة فرعية كأم للوحة الحالية
            child_panels = self.instance.get_all_child_panels()
            if parent_panel.id in [child.id for child in child_panels]:
                raise serializers.ValidationError({"parent_panel": "لا يمكن تعيين لوحة فرعية من هذه اللوحة كأم لها"})
        
        return data
    
    def get_breakers(self, obj):
        """
        إرجاع معلومات جميع القواطع في اللوحة
        """
        breakers = obj.breakers.all()
        return CircuitBreakerBasicSerializer(breakers, many=True).data
    
    def get_child_panels(self, obj):
        """
        إرجاع معلومات اللوحات الفرعية المباشرة
        """
        child_panels = obj.child_panels.all()
        return [
            {
                'id': panel.id,
                'name': panel.name,
                'panel_type': panel.panel_type,
                'ampacity': panel.ampacity,
                'has_children': panel.child_panels.exists()
            } for panel in child_panels
        ]
    
    def get_loads(self, obj):
        """
        إرجاع معلومات الأحمال المتصلة بشكل مختصر
        """
        loads = obj.loads.all()
        return [
            {
                'id': load.id,
                'name': load.name,
                'ampacity': load.ampacity,
                'load_type': load.load_type,
                'load_type_display': dict(Load.LOAD_TYPE_CHOICES).get(load.load_type, "غير محدد")
            } for load in loads
        ]
    
    def get_full_path(self, obj):
        """
        إرجاع المسار الكامل للوحة
        """
        return obj.get_full_path()
    
    def get_total_loads_info(self, obj):
        """
        إرجاع معلومات عن إجمالي الأحمال
        """
        total_ampacity, total_count = obj.get_total_loads()
        return {
            'total_ampacity': total_ampacity,
            'total_count': total_count,
            'utilization_percentage': (total_ampacity / obj.ampacity * 100) if obj.ampacity else 0
        }
    
    def get_cable_specification(self, obj):
        """
        إرجاع مواصفات الكابل بتنسيق نصي
        """
        return obj.get_cable_specification()

# فئة المُسلسل الخاصة بالأحمال (Load)
class LoadSerializer(serializers.ModelSerializer):
    """
    مُسلسل الأحمال الكهربائية
    يقوم هذا المُسلسل بتحويل بيانات الأحمال من وإلى النموذج
    ويتضمن تفاصيل اللوحة المغذية والقاطع المغذي ونوع الحمل
    """
    # إضافة تفاصيل اللوحة المغذية للعرض فقط
    panel_details = PanelBasicSerializer(source='panel', read_only=True)
    
    # إضافة تفاصيل القاطع المغذي للعرض فقط
    breaker_details = CircuitBreakerBasicSerializer(source='breaker', read_only=True)
    
    # إضافة اسم نوع الحمل للعرض
    load_type_display = serializers.SerializerMethodField()
    
    # إضافة حقل لمسار الحمل الكامل من المصدر إلى الحمل
    total_path = serializers.SerializerMethodField()
    
    # إضافة حقول محسوبة
    daily_consumption = serializers.SerializerMethodField()
    monthly_cost = serializers.SerializerMethodField()
    voltage_drop = serializers.SerializerMethodField()
    cable_specification = serializers.SerializerMethodField()
    
    class Meta:
        model = Load
        fields = '__all__'
    
    def get_load_type_display(self, obj):
        """
        إرجاع اسم نوع الحمل من الخيارات المعرفة
        """
        return dict(Load.LOAD_TYPE_CHOICES).get(obj.load_type, "غير محدد")
    
    def get_total_path(self, obj):
        """
        إرجاع المسار الكامل للحمل من المصدر
        """
        return obj.get_total_path()
    
    def get_daily_consumption(self, obj):
        """
        إرجاع الاستهلاك اليومي المقدر للحمل
        """
        return obj.calculate_daily_consumption()
    
    def get_monthly_cost(self, obj):
        """
        إرجاع التكلفة الشهرية المقدرة للحمل
        """
        return obj.calculate_monthly_cost()
    
    def get_voltage_drop(self, obj):
        """
        إرجاع هبوط الجهد في كابل الحمل
        """
        return obj.calculate_voltage_drop()
    
    def get_cable_specification(self, obj):
        """
        إرجاع مواصفات الكابل بتنسيق نصي
        """
        return obj.get_cable_specification()