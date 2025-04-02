"""
نظام إدارة شبكة الطاقة الكهربائية - وحدة العروض (Views)
هذا الملف يحتوي على تعريفات طرق العرض للواجهات البرمجية API
"""

# استيراد الوظائف المطلوبة من Django REST framework
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import render

# استيراد النماذج وسيريلايزرز
from .models import PowerSource, Panel, Load, CircuitBreaker
from .serializers import PowerSourceSerializer, PanelSerializer, LoadSerializer, CircuitBreakerSerializer

# View functions for HTML pages
def home_view(request):
    """Render the home page"""
    return render(request, 'index.html')

def power_sources_view(request):
    """Render the power sources page"""
    return render(request, 'power-sources.html')

def panels_view(request):
    """Render the panels page"""
    return render(request, 'panels.html')

def loads_view(request):
    """Render the loads page"""
    return render(request, 'loads.html')

def breakers_view(request):
    """Render the circuit breakers page"""
    return render(request, 'breakers.html')

# ViewSets لكل نموذج - توفر CRUD operations بشكل تلقائي

class PowerSourceViewSet(viewsets.ModelViewSet):
    """
    واجهة برمجية لإدارة مصادر الطاقة (مثل الشبكة المحلية، المولدات)
    توفر عمليات إنشاء، قراءة، تحديث، وحذف لمصادر الطاقة
    """
    queryset = PowerSource.objects.all()  # جلب جميع كائنات مصادر الطاقة
    serializer_class = PowerSourceSerializer  # تحديد السيريلايزر المستخدم

    # يمكن إضافة طرق مخصصة هنا كالتالي:
    @action(detail=True, methods=['get'])
    def info(self, request, pk=None):
        """
        طريقة مخصصة لعرض معلومات إضافية عن مصدر الطاقة
        """
        powersource = self.get_object()
        return Response({'message': f'معلومات عن مصدر الطاقة: {powersource.name}'})


class PanelViewSet(viewsets.ModelViewSet):
    """
    واجهة برمجية لإدارة اللوحات الكهربائية (رئيسية وفرعية)
    توفر عمليات إنشاء، قراءة، تحديث، وحذف للوحات
    """
    queryset = Panel.objects.all()  # جلب جميع كائنات اللوحات
    serializer_class = PanelSerializer  # تحديد السيريلايزر المستخدم


class LoadViewSet(viewsets.ModelViewSet):
    """
    واجهة برمجية لإدارة الأحمال الكهربائية
    توفر عمليات إنشاء، قراءة، تحديث، وحذف للأحمال
    """
    queryset = Load.objects.all()  # جلب جميع كائنات الأحمال
    serializer_class = LoadSerializer  # تحديد السيريلايزر المستخدم


class CircuitBreakerViewSet(viewsets.ModelViewSet):
    """
    واجهة برمجية لإدارة قواطع الدارة الكهربائية
    توفر عمليات إنشاء، قراءة، تحديث، وحذف للقواطع
    """
    queryset = CircuitBreaker.objects.all()  # جلب جميع كائنات القواطع
    serializer_class = CircuitBreakerSerializer  # تحديد السيريلايزر المستخدم
