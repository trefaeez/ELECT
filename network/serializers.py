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
    ويتضمن تفاصيل اللوحة المغذية والقاطع المغذي
    """
    # إضافة تفاصيل اللوحة المغذية للعرض فقط
    panel_details = serializers.SerializerMethodField()
    
    # إضافة تفاصيل القاطع المغذي للعرض فقط
    breaker_details = CircuitBreakerSerializer(source='breaker', read_only=True)
    
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