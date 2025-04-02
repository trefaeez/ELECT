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
    
    @action(detail=True, methods=['get', 'post'])
    def panels(self, request, pk=None):
        """
        طريقة للحصول على اللوحات المرتبطة بمصدر طاقة محدد أو إضافة لوحة جديدة
        GET: يجلب جميع اللوحات المرتبطة بمصدر طاقة
        POST: يضيف لوحة جديدة إلى مصدر طاقة محدد
        """
        powersource = self.get_object()
        
        if request.method == 'GET':
            # جلب اللوحات المرتبطة بمصدر الطاقة
            panels = Panel.objects.filter(power_source=powersource)
            serializer = PanelSerializer(panels, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # إضافة لوحة جديدة إلى مصدر الطاقة
            data = request.data.copy()
            data['power_source'] = powersource.id
            
            serializer = PanelSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)


class PanelViewSet(viewsets.ModelViewSet):
    """
    واجهة برمجية لإدارة اللوحات الكهربائية (رئيسية وفرعية)
    توفر عمليات إنشاء، قراءة، تحديث، وحذف للوحات
    """
    queryset = Panel.objects.all()  # جلب جميع كائنات اللوحات
    serializer_class = PanelSerializer  # تحديد السيريلايزر المستخدم
    
    @action(detail=True, methods=['get', 'post'])
    def breakers(self, request, pk=None):
        """
        طريقة للحصول على القواطع المرتبطة بلوحة محددة أو إضافة قاطع جديد
        GET: يجلب جميع القواطع المرتبطة باللوحة
        POST: يضيف قاطع جديد إلى اللوحة المحددة
        """
        panel = self.get_object()
        
        if request.method == 'GET':
            # جلب القواطع المرتبطة باللوحة
            breakers = CircuitBreaker.objects.filter(panel=panel)
            serializer = CircuitBreakerSerializer(breakers, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # إضافة قاطع جديد إلى اللوحة
            data = request.data.copy()
            data['panel'] = panel.id
            
            serializer = CircuitBreakerSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)


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
    
    @action(detail=True, methods=['get', 'post'])
    def loads(self, request, pk=None):
        """
        طريقة للحصول على الأحمال المرتبطة بقاطع محدد أو إضافة حمل جديد
        GET: يجلب جميع الأحمال المرتبطة بالقاطع
        POST: يضيف حمل جديد إلى القاطع المحدد
        """
        breaker = self.get_object()
        
        if request.method == 'GET':
            # جلب الأحمال المرتبطة بالقاطع
            loads = Load.objects.filter(breaker=breaker)
            serializer = LoadSerializer(loads, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # إضافة حمل جديد إلى القاطع
            data = request.data.copy()
            data['breaker'] = breaker.id
            
            serializer = LoadSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)
