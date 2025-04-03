"""
نظام إدارة شبكة الطاقة الكهربائية - وحدة المسارات (URLs)
هذا الملف يحتوي على تعريفات المسارات لواجهات API المختلفة
"""

# استيراد الوظائف المطلوبة من مكتبات Django و Django REST framework
from django.urls import path, include  # استيراد أدوات تعريف المسارات
from rest_framework import routers  # استيراد موجه الطلبات
from django.http import HttpResponse  # استيراد فئة استجابة HTTP
from django.shortcuts import render  # استيراد وظيفة عرض القوالب
from django.views.generic import TemplateView  # استيراد العرض العام للقوالب

# استيراد ViewSets من ملف views.py
from .views import (
    PowerSourceViewSet,        # فئة عرض مصادر الطاقة (الشبكة المحلية، المولدات)
    PanelViewSet,              # فئة عرض اللوحات الكهربائية (رئيسية وفرعية)
    LoadViewSet,               # فئة عرض الأحمال الكهربائية
    CircuitBreakerViewSet,      # فئة عرض قواطع الدارة الكهربائية
    # Import the new view functions
    home_view,
    power_sources_view,
    panels_view,
    loads_view,
    breakers_view
)

# إضافة وظائف عرض للمرئيات
def network_visualizer_view(request):
    """عرض المرئيات الشبكية"""
    return render(request, 'network-visualizer.html')

def panel_tree_visualizer_view(request):
    """عرض هيكل اللوحات الشجري"""
    return render(request, 'panel-tree-visualizer.html')

# دالة بسيطة للصفحة الرئيسية
def home(request):
    """
    الدالة المسؤولة عن عرض الصفحة الرئيسية للتطبيق
    تعرض صفحة إدارة شبكة الطاقة الكهربائية
    
    المدخلات:
        request - كائن طلب HTTP
    المخرجات:
        عرض القالب الرئيسي للتطبيق
    """
    return render(request, 'index.html')

# إنشاء موجه الطلبات وتسجيل المسارات لجميع الموارد
router = routers.DefaultRouter()  # إنشاء موجه طلبات افتراضي

# تسجيل كل ViewSet في الموجه مع تحديد المسار الخاص به
router.register(r'powersources', PowerSourceViewSet)  # مسار مصادر الطاقة
router.register(r'panels', PanelViewSet)  # مسار اللوحات (رئيسية وفرعية)
router.register(r'loads', LoadViewSet)  # مسار الأحمال
router.register(r'circuitbreakers', CircuitBreakerViewSet)  # مسار قواطع الدارة

# تحديد قائمة المسارات النهائية للتطبيق
urlpatterns = [
    # Use the new home_view instead of the local home function
    path('', home_view, name='home'),  # إضافة مسار الصفحة الرئيسية
    path('api/', include(router.urls)),  # تضمين جميع مسارات API المسجلة في الموجه
    
    # Add paths for each HTML page
    path('power-sources/', power_sources_view, name='power_sources'),
    path('panels/', panels_view, name='panels'),
    path('loads/', loads_view, name='loads'),
    path('breakers/', breakers_view, name='breakers'),
    
    # إضافة مسارات المرئيات
    path('network-visualizer/', network_visualizer_view, name='network_visualizer'),
    path('panel-tree-visualizer/', panel_tree_visualizer_view, name='panel_tree_visualizer'),
]