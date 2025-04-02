"""
نظام إدارة شبكة الطاقة الكهربائية - وحدة العرض (Views)
هذا الملف يحتوي على الفئات المسؤولة عن تحديد كيفية عرض بيانات النماذج والتعامل معها من خلال واجهة API
"""

# استيراد مكتبة viewsets من Django REST framework لإنشاء واجهات API
from rest_framework import viewsets

# استيراد النماذج المختلفة من ملف models.py
from .models import (
    PowerSource,        # نموذج مصادر الطاقة (الشبكة المحلية، المولدات)
    Panel,              # نموذج موحد للوحات الكهربائية (رئيسية أو فرعية)
    Load,               # نموذج الأحمال الكهربائية
    CircuitBreaker,     # نموذج قواطع الدارة الكهربائية
    PanelBreaker        # نموذج الربط بين اللوحات والقواطع
)

# استيراد المُسلسلات (Serializers) المختلفة من ملف serializers.py
from .serializers import (
    PowerSourceSerializer,     # مُسلسل مصادر الطاقة: يحول بيانات مصادر الطاقة من/إلى JSON
    PanelSerializer,           # مُسلسل اللوحات: يحول بيانات اللوحات من/إلى JSON
    LoadSerializer,            # مُسلسل الأحمال: يحول بيانات الأحمال الكهربائية من/إلى JSON
    CircuitBreakerSerializer,  # مُسلسل قواطع الدارة: يحول بيانات القواطع من/إلى JSON
    PanelBreakerSerializer     # مُسلسل ربط اللوحات بالقواطع: يحول بيانات العلاقة من/إلى JSON
)

# الفئة المسؤولة عن عرض وإدارة مصادر الطاقة (PowerSource)
class PowerSourceViewSet(viewsets.ModelViewSet):
    """
    واجهة API للتعامل مع مصادر الطاقة (المولدات، الشبكة المحلية)
    توفر هذه الواجهة عمليات القراءة، الإضافة، التعديل والحذف لمصادر الطاقة
    """
    queryset = PowerSource.objects.all()  # استعلام قاعدة البيانات لجلب جميع مصادر الطاقة
    serializer_class = PowerSourceSerializer  # فئة المُسلسل المستخدمة لتحويل البيانات

# الفئة المسؤولة عن عرض وإدارة اللوحات (Panel)
class PanelViewSet(viewsets.ModelViewSet):
    """
    واجهة API للتعامل مع اللوحات الكهربائية (رئيسية وفرعية)
    توفر هذه الواجهة عمليات القراءة، الإضافة، التعديل والحذف للوحات
    """
    queryset = Panel.objects.all()  # استعلام قاعدة البيانات لجلب جميع اللوحات
    serializer_class = PanelSerializer  # فئة المُسلسل المستخدمة لتحويل البيانات

# الفئة المسؤولة عن عرض وإدارة الأحمال (Load)
class LoadViewSet(viewsets.ModelViewSet):
    """
    واجهة API للتعامل مع الأحمال الكهربائية
    توفر هذه الواجهة عمليات القراءة، الإضافة، التعديل والحذف للأحمال
    """
    queryset = Load.objects.all()  # استعلام قاعدة البيانات لجلب جميع الأحمال
    serializer_class = LoadSerializer  # فئة المُسلسل المستخدمة لتحويل البيانات

# الفئة المسؤولة عن عرض وإدارة قواطع الدارة (CircuitBreaker)
class CircuitBreakerViewSet(viewsets.ModelViewSet):
    """
    واجهة API للتعامل مع قواطع الدارة الكهربائية
    توفر هذه الواجهة عمليات القراءة، الإضافة، التعديل والحذف لقواطع الدارة
    """
    queryset = CircuitBreaker.objects.all()  # استعلام قاعدة البيانات لجلب جميع قواطع الدارة
    serializer_class = CircuitBreakerSerializer  # فئة المُسلسل المستخدمة لتحويل البيانات

# الفئة المسؤولة عن عرض وإدارة علاقات اللوحات والقواطع (PanelBreaker)
class PanelBreakerViewSet(viewsets.ModelViewSet):
    """
    واجهة API للتعامل مع العلاقات بين اللوحات والقواطع
    توفر هذه الواجهة عمليات القراءة، الإضافة، التعديل والحذف للعلاقات
    """
    queryset = PanelBreaker.objects.all()  # استعلام قاعدة البيانات لجلب جميع علاقات اللوحات والقواطع
    serializer_class = PanelBreakerSerializer  # فئة المُسلسل المستخدمة لتحويل البيانات
