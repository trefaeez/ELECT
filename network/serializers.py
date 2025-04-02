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
    CircuitBreaker,     # نموذج قواطع الدارة الكهربائية
    PanelBreaker        # نموذج الربط بين اللوحات والقواطع
)

# فئة المُسلسل الخاصة بقواطع الدارة (CircuitBreaker)
class CircuitBreakerSerializer(serializers.ModelSerializer):
    """
    مُسلسل قواطع الدارة الكهربائية
    يقوم هذا المُسلسل بتحويل بيانات قواطع الدارة من وإلى النموذج
    """
    class Meta:
        model = CircuitBreaker  # النموذج المرتبط
        fields = '__all__'  # تضمين جميع الحقول في المُسلسل

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

# فئة المُسلسل الخاصة بعلاقة اللوحات والقواطع (PanelBreaker)
class PanelBreakerSerializer(serializers.ModelSerializer):
    """
    مُسلسل لعلاقة اللوحات والقواطع
    يقوم هذا المُسلسل بتحويل بيانات العلاقات بين اللوحات وقواطعها من وإلى النموذج
    """
    # إضافة تفاصيل القاطع للعرض فقط
    breaker_details = CircuitBreakerSerializer(source='breaker', read_only=True)
    
    class Meta:
        model = PanelBreaker  # النموذج المرتبط
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
    
    # إضافة تفاصيل القواطع الفرعية للوحة للعرض فقط
    panel_breakers = PanelBreakerSerializer(source='panel_breakers', many=True, read_only=True)
    
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