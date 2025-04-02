"""
نظام إدارة شبكة الطاقة الكهربائية - وحدة المُسلسلات (Serializers)
هذا الملف يحتوي على فئات المُسلسلات المسؤولة عن تحويل نماذج البيانات إلى JSON والعكس
"""

# استيراد مكتبة serializers من Django REST framework لإنشاء فئات المُسلسلات
from rest_framework import serializers

# استيراد النماذج المختلفة من ملف models.py
from .models import (
    PowerSource,        # نموذج مصادر الطاقة (الشبكة المحلية، المولدات)
    Panel,              # نموذج موحد للوحات الكهربائية (رئيسية أو فرعية)
    Load,               # نموذج الأحمال الكهربائية
    CircuitBreaker      # نموذج قواطع الدارة الكهربائية
)

# فئة المُسلسل الخاصة بقواطع الدارة (CircuitBreaker)
class CircuitBreakerSerializer(serializers.ModelSerializer):
    """
    مُسلسل قواطع الدارة الكهربائية
    يقوم هذا المُسلسل بتحويل بيانات قواطع الدارة من وإلى النموذج
    """
    panel_name = serializers.SerializerMethodField()

    class Meta:
        model = CircuitBreaker  # النموذج المرتبط
        fields = '__all__'  # تضمين جميع الحقول في المُسلسل
    
    def get_panel_name(self, obj):
        """إرجاع اسم اللوحة التي ينتمي إليها القاطع (إن وجدت)"""
        return obj.panel.name if obj.panel else None

# سيريلايزر لإنشاء قاطع جديد داخل لوحة
class PanelBreakerSerializer(serializers.ModelSerializer):
    """
    مُسلسل خاص بإنشاء قاطع جديد داخل لوحة محددة
    يستخدم لإنشاء قواطع توزيع في داخل اللوحات
    """
    class Meta:
        model = CircuitBreaker
        exclude = ['panel']  # استبعاد حقل panel لأنه سيتم تحديده تلقائياً

    def create(self, validated_data):
        """إنشاء قاطع جديد وربطه باللوحة المحددة"""
        panel_id = self.context.get('panel_id')
        if not panel_id:
            raise serializers.ValidationError("يجب تحديد اللوحة")
        
        panel = Panel.objects.get(id=panel_id)
        circuit_breaker = CircuitBreaker.objects.create(panel=panel, **validated_data)
        return circuit_breaker

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
    
    class Meta:
        model = PowerSource  # النموذج المرتبط
        fields = '__all__'  # تضمين جميع الحقول في المُسلسل

# فئة المُسلسل الخاصة باللوحات (Panel)
class PanelSerializer(serializers.ModelSerializer):
    """
    مُسلسل اللوحات الكهربائية
    يقوم هذا المُسلسل بتحويل بيانات اللوحات من وإلى النموذج
    ويتضمن تفاصيل القاطع الرئيسي والقواطع الفرعية ومصدر التغذية
    """
    # إضافة تفاصيل القاطع الرئيسي للوحة للعرض فقط
    main_breaker_details = CircuitBreakerSerializer(source='main_breaker', read_only=True)
    
    # إضافة تفاصيل القواطع الفرعية/التوزيع للوحة للعرض فقط
    distribution_breakers = serializers.SerializerMethodField()
    
    # إضافة تفاصيل القاطع المغذي للوحة (في حالة اللوحة الفرعية) للعرض فقط
    feeder_breaker_details = CircuitBreakerSerializer(source='feeder_breaker', read_only=True)
    
    # إضافة تفاصيل مصدر الطاقة (في حالة اللوحة الرئيسية) للعرض فقط
    power_source_details = PowerSourceSerializer(source='power_source', read_only=True)
    
    # إضافة تفاصيل اللوحة الأم (في حالة اللوحة الفرعية) للعرض فقط
    parent_panel_details = serializers.SerializerMethodField()
    
    # إضافة تفاصيل اللوحات الفرعية للعرض فقط
    sub_panels = serializers.SerializerMethodField()
    
    # إضافة تفاصيل الأحمال المتصلة للعرض فقط
    loads = serializers.SerializerMethodField()
    
    class Meta:
        model = Panel  # النموذج المرتبط
        fields = '__all__'  # تضمين جميع الحقول في المُسلسل
    
    def validate(self, data):
        """
        التحقق من صحة البيانات حسب نوع اللوحة
        يتأكد من استيفاء شروط اللوحة الرئيسية واللوحة الفرعية
        """
        panel_type = data.get('panel_type')
        power_source = data.get('power_source')
        parent_panel = data.get('parent_panel')
        feeder_breaker = data.get('feeder_breaker')
        
        # التحقق من شروط اللوحة الرئيسية
        if panel_type == 'main':
            if not power_source:
                raise serializers.ValidationError({"power_source": "يجب تحديد مصدر الطاقة للوحة الرئيسية"})
            if parent_panel:
                raise serializers.ValidationError({"parent_panel": "اللوحة الرئيسية لا يمكن أن تكون متصلة بلوحة أم"})
        
        # التحقق من شروط اللوحة الفرعية
        elif panel_type == 'sub':
            if not parent_panel:
                raise serializers.ValidationError({"parent_panel": "يجب تحديد اللوحة الأم للوحة الفرعية"})
            if not feeder_breaker:
                raise serializers.ValidationError({"feeder_breaker": "يجب تحديد القاطع المغذي للوحة الفرعية"})
            if power_source:
                raise serializers.ValidationError({"power_source": "اللوحة الفرعية لا يمكن أن تكون متصلة بمصدر طاقة مباشرة"})
        
        return data
    
    def get_distribution_breakers(self, obj):
        """
        إرجاع معلومات قواطع التوزيع في اللوحة
        """
        breakers = obj.distribution_breakers.all()
        return [
            {
                'id': breaker.id,
                'name': breaker.name or f"{breaker.manufacturer} {breaker.breaker_type} {breaker.rated_current}A",
                'rated_current': breaker.rated_current,
                'number_of_poles': breaker.number_of_poles,
                'label': breaker.label
            } for breaker in breakers
        ]
    
    def get_parent_panel_details(self, obj):
        """
        إرجاع معلومات اللوحة الأم بشكل مختصر
        """
        if obj.parent_panel:
            return {
                'id': obj.parent_panel.id,
                'name': obj.parent_panel.name,
                'panel_type': obj.parent_panel.panel_type
            }
        return None
    
    def get_sub_panels(self, obj):
        """
        إرجاع معلومات اللوحات الفرعية بشكل مختصر
        """
        sub_panels = obj.sub_panels.all()
        return [
            {
                'id': panel.id,
                'name': panel.name,
                'panel_type': panel.panel_type
            } for panel in sub_panels
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
                'ampacity': load.ampacity
            } for load in loads
        ]

# فئة المُسلسل الخاصة بالأحمال (Load)
class LoadSerializer(serializers.ModelSerializer):
    """
    مُسلسل الأحمال الكهربائية
    يقوم هذا المُسلسل بتحويل بيانات الأحمال من وإلى النموذج
    ويتضمن تفاصيل اللوحة المغذية والقاطع المغذي ونوع الحمل
    """
    # إضافة تفاصيل اللوحة المغذية للعرض فقط
    panel_details = serializers.SerializerMethodField()
    
    # إضافة تفاصيل القاطع المغذي للعرض فقط
    breaker_details = CircuitBreakerSerializer(source='breaker', read_only=True)
    
    # إضافة اسم نوع الحمل للعرض
    load_type_display = serializers.SerializerMethodField()
    
    # إضافة حقل لمسار الحمل الكامل من المصدر إلى الحمل
    total_path = serializers.SerializerMethodField()
    
    # إضافة حقول محسوبة
    daily_consumption = serializers.SerializerMethodField()
    monthly_cost = serializers.SerializerMethodField()
    voltage_drop = serializers.SerializerMethodField()
    
    class Meta:
        model = Load  # النموذج المرتبط
        fields = '__all__'  # تضمين جميع الحقول في المُسلسل
    
    def get_panel_details(self, obj):
        """
        إرجاع معلومات اللوحة المغذية بشكل مختصر
        """
        if obj.panel:
            return {
                'id': obj.panel.id,
                'name': obj.panel.name,
                'panel_type': obj.panel.panel_type
            }
        return None
    
    def get_load_type_display(self, obj):
        """
        إرجاع اسم نوع الحمل من الخيارات المعرفة
        """
        return obj.get_load_type_display()
    
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