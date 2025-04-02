"""
نظام إدارة شبكة الطاقة الكهربائية - وحدة المسارات (URLs)
هذا الملف يحتوي على تعريفات المسارات لواجهات API المختلفة
"""

# استيراد الوظائف المطلوبة من مكتبات Django و Django REST framework
from django.urls import path, include  # استيراد أدوات تعريف المسارات
from rest_framework import routers  # استيراد موجه الطلبات
from django.http import HttpResponse  # استيراد فئة استجابة HTTP

# استيراد ViewSets من ملف views.py
from .views import (
    PowerSourceViewSet,        # فئة عرض مصادر الطاقة (الشبكة المحلية، المولدات)
    PanelViewSet,              # فئة عرض اللوحات الكهربائية (رئيسية وفرعية)
    LoadViewSet,               # فئة عرض الأحمال الكهربائية
    CircuitBreakerViewSet,     # فئة عرض قواطع الدارة الكهربائية
    PanelBreakerViewSet        # فئة عرض العلاقات بين اللوحات والقواطع
)

# دالة بسيطة للصفحة الرئيسية
def home(request):
    """
    الدالة المسؤولة عن عرض الصفحة الرئيسية للتطبيق
    تقدم رسالة ترحيبية ورابط للوصول إلى واجهات API
    
    المدخلات:
        request - كائن طلب HTTP
    المخرجات:
        كائن استجابة HTTP يحتوي على محتوى HTML بسيط
    """
    return HttpResponse("<h1>مرحباً بكم في مشروع إدارة الشبكة الكهربائية</h1><p>للوصول إلى واجهات API، استخدم <a href='/api/'>هذا الرابط</a></p>")

# إنشاء موجه الطلبات وتسجيل المسارات لجميع الموارد
router = routers.DefaultRouter()  # إنشاء موجه طلبات افتراضي

# تسجيل كل ViewSet في الموجه مع تحديد المسار الخاص به
router.register(r'powersources', PowerSourceViewSet)  # مسار مصادر الطاقة
router.register(r'panels', PanelViewSet)  # مسار اللوحات (رئيسية وفرعية)
router.register(r'loads', LoadViewSet)  # مسار الأحمال
router.register(r'circuitbreakers', CircuitBreakerViewSet)  # مسار قواطع الدارة
router.register(r'panelbreakers', PanelBreakerViewSet)  # مسار العلاقات بين اللوحات والقواطع

# تحديد قائمة المسارات النهائية للتطبيق
urlpatterns = [
    path('', home, name='home'),  # إضافة مسار الصفحة الرئيسية
    path('api/', include(router.urls)),  # تضمين جميع مسارات API المسجلة في الموجه
]