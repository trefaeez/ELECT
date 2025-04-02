"""
نظام إدارة شبكة الطاقة الكهربائية - وحدة العرض (Views)
هذا الملف يحتوي على الفئات المسؤولة عن تحديد كيفية عرض بيانات النماذج والتعامل معها من خلال واجهة API
"""

# استيراد مكتبة viewsets من Django REST framework لإنشاء واجهات API
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

# استيراد النماذج المختلفة من ملف models.py
from .models import (
    PowerSource,        # نموذج مصادر الطاقة (الشبكة المحلية، المولدات)
    Panel,              # نموذج موحد للوحات الكهربائية (رئيسية أو فرعية)
    Load,               # نموذج الأحمال الكهربائية
    CircuitBreaker      # نموذج قواطع الدارة الكهربائية
)

# استيراد المُسلسلات (Serializers) المختلفة من ملف serializers.py
from .serializers import (
    PowerSourceSerializer,     # مُسلسل مصادر الطاقة: يحول بيانات مصادر الطاقة من/إلى JSON
    PanelSerializer,           # مُسلسل اللوحات: يحول بيانات اللوحات من/إلى JSON
    LoadSerializer,            # مُسلسل الأحمال: يحول بيانات الأحمال الكهربائية من/إلى JSON
    CircuitBreakerSerializer,  # مُسلسل قواطع الدارة: يحول بيانات القواطع من/إلى JSON
    PanelBreakerSerializer,    # مُسلسل إضافة قاطع جديد للوحة
    PowerSourcePanelSerializer, # مُسلسل إضافة لوحة جديدة مرتبطة بمصدر طاقة
    BreakerLoadSerializer      # مُسلسل إضافة حمل جديد مرتبط بقاطع
)

# الفئة المسؤولة عن عرض وإدارة مصادر الطاقة (PowerSource)
class PowerSourceViewSet(viewsets.ModelViewSet):
    """
    واجهة API للتعامل مع مصادر الطاقة (المولدات، الشبكة المحلية)
    توفر هذه الواجهة عمليات القراءة، الإضافة، التعديل والحذف لمصادر الطاقة
    """
    queryset = PowerSource.objects.all()  # استعلام قاعدة البيانات لجلب جميع مصادر الطاقة
    serializer_class = PowerSourceSerializer  # فئة المُسلسل المستخدمة لتحويل البيانات

    @action(detail=True, methods=['get'])
    def panels(self, request, pk=None):
        """
        استعلام لجلب اللوحات الرئيسية المتصلة بمصدر الطاقة
        """
        source = self.get_object()
        panels = Panel.objects.filter(power_source=source)
        serializer = PanelSerializer(panels, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_panel(self, request, pk=None):
        """
        إضافة لوحة جديدة مرتبطة بمصدر الطاقة
        يتم استخدام هذه الوظيفة لإضافة لوحات (رئيسية أو فرعية) مرتبطة بمصدر الطاقة
        """
        power_source = self.get_object()
        serializer = PowerSourcePanelSerializer(
            data=request.data,
            context={'power_source_id': power_source.id}
        )
        
        if serializer.is_valid():
            panel = serializer.save()
            # إرجاع بيانات اللوحة المضافة
            return Response(
                PanelSerializer(panel).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# الفئة المسؤولة عن عرض وإدارة اللوحات (Panel)
class PanelViewSet(viewsets.ModelViewSet):
    """
    واجهة API للتعامل مع اللوحات الكهربائية (رئيسية وفرعية)
    توفر هذه الواجهة عمليات القراءة، الإضافة، التعديل والحذف للوحات
    """
    queryset = Panel.objects.all()  # استعلام قاعدة البيانات لجلب جميع اللوحات
    serializer_class = PanelSerializer  # فئة المُسلسل المستخدمة لتحويل البيانات

    @action(detail=True, methods=['get'])
    def breakers(self, request, pk=None):
        """
        استعلام لجلب جميع القواطع المتصلة باللوحة
        """
        panel = self.get_object()
        breakers = CircuitBreaker.objects.filter(panel=panel)
        serializer = CircuitBreakerSerializer(breakers, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_breaker(self, request, pk=None):
        """
        إضافة قاطع جديد إلى اللوحة
        يتم استخدام هذه الوظيفة لإضافة قواطع توزيع إلى اللوحة
        """
        panel = self.get_object()
        serializer = PanelBreakerSerializer(
            data=request.data,
            context={'panel_id': panel.id}
        )
        
        if serializer.is_valid():
            breaker = serializer.save()
            # تأكد من أن القاطع مرتبط باللوحة
            if breaker.breaker_role != 'distribution':
                breaker.breaker_role = 'distribution'
                breaker.save()
            
            # إرجاع بيانات القاطع المضاف
            return Response(
                CircuitBreakerSerializer(breaker).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def loads(self, request, pk=None):
        """
        استعلام لجلب جميع الأحمال المتصلة باللوحة
        """
        panel = self.get_object()
        loads = Load.objects.filter(panel=panel)
        serializer = LoadSerializer(loads, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def sub_panels(self, request, pk=None):
        """
        استعلام لجلب جميع اللوحات الفرعية المتصلة باللوحة
        """
        panel = self.get_object()
        sub_panels = Panel.objects.filter(parent_panel=panel)
        serializer = PanelSerializer(sub_panels, many=True)
        return Response(serializer.data)

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
    
    @action(detail=True, methods=['get'])
    def loads(self, request, pk=None):
        """
        استعلام لجلب جميع الأحمال المتصلة بالقاطع
        """
        breaker = self.get_object()
        loads = Load.objects.filter(breaker=breaker)
        serializer = LoadSerializer(loads, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_load(self, request, pk=None):
        """
        إضافة حمل جديد مرتبط بالقاطع
        يتم استخدام هذه الوظيفة لإضافة حمل جديد مرتبط تلقائيًا بالقاطع المحدد
        """
        breaker = self.get_object()
        serializer = BreakerLoadSerializer(
            data=request.data,
            context={'breaker_id': breaker.id, 'panel_id': breaker.panel_id if breaker.panel else None}
        )
        
        if serializer.is_valid():
            load = serializer.save()
            # إرجاع بيانات الحمل المضاف
            return Response(
                LoadSerializer(load).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
