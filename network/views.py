"""
نظام إدارة شبكة الطاقة الكهربائية - وحدة العروض (Views)
هذا الملف يحتوي على تعريفات طرق العرض للواجهات البرمجية API
تم تحديثه ليدعم الهيكلية الشجرية للوحات وعلاقات التغذية المتعددة للقواطع
"""

# استيراد الوظائف المطلوبة من Django REST framework
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import render, get_object_or_404

# استيراد النماذج وسيريلايزرز
from .models import PowerSource, Panel, Load, CircuitBreaker
from .serializers import (
    PowerSourceSerializer, PanelSerializer, LoadSerializer, 
    CircuitBreakerSerializer, CircuitBreakerBasicSerializer,
    PowerSourcePanelSerializer, PanelBreakerSerializer,
    BreakerLoadSerializer, ParentPanelChildSerializer,
    BreakerFeedingSerializer, PanelBasicSerializer
)

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
        try:
            powersource = self.get_object()
            
            if request.method == 'GET':
                # جلب اللوحات المرتبطة بمصدر الطاقة
                panels = Panel.objects.filter(power_source=powersource)
                serializer = PanelSerializer(panels, many=True)
                return Response(serializer.data)
            
            elif request.method == 'POST':
                try:
                    # طباعة بيانات الطلب للتشخيص
                    print(f"POST data: {request.data}")
                    
                    # التحقق من البيانات الأساسية المطلوبة
                    required_fields = ['name', 'ampacity', 'voltage']
                    missing_fields = [field for field in required_fields if not request.data.get(field)]
                    
                    if missing_fields:
                        missing_fields_str = ", ".join(missing_fields)
                        return Response(
                            {f: f"حقل {f} مطلوب" for f in missing_fields},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # استخدام السيريلايزر المخصص لإنشاء لوحة لمصدر طاقة
                    serializer = PowerSourcePanelSerializer(
                        data=request.data,
                        context={'power_source_id': powersource.id}
                    )
                    
                    if serializer.is_valid():
                        panel = serializer.save()
                        # إرجاع البيانات باستخدام السيريلايزر الكامل
                        panel_serializer = PanelSerializer(panel)
                        return Response(panel_serializer.data, status=status.HTTP_201_CREATED)
                    
                    # إرجاع أخطاء التحقق من صحة البيانات
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
                except serializers.ValidationError as ve:
                    # إرجاع أخطاء التحقق من البيانات بتنسيق منظم
                    return Response(ve.detail, status=status.HTTP_400_BAD_REQUEST)
                except Exception as e:
                    # تسجيل تفاصيل الخطأ للمساعدة في التشخيص
                    import traceback
                    error_message = str(e)
                    error_trace = traceback.format_exc()
                    print(f"Error: {error_message}")
                    print(f"Traceback: {error_trace}")
                    
                    # إرجاع رسالة خطأ واضحة للمستخدم
                    return Response(
                        {'error': f'حدث خطأ أثناء إنشاء اللوحة الجديدة: {error_message}'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
        except PowerSource.DoesNotExist:
            return Response({'error': 'مصدر الطاقة المحدد غير موجود'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            # تسجيل الخطأ العام
            import traceback
            print(f"General error: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            
            return Response({'error': f'حدث خطأ: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def set_main_breaker(self, request, pk=None):
        """
        تعيين القاطع الرئيسي لمصدر الطاقة
        """
        powersource = self.get_object()
        breaker_id = request.data.get('breaker_id')
        
        if not breaker_id:
            return Response({'error': 'يجب تحديد معرف القاطع'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            breaker = CircuitBreaker.objects.get(id=breaker_id)
            
            # التأكد من أن القاطع ليس مرتبطًا بأي لوحة أو مصدر طاقة آخر كقاطع رئيسي
            if hasattr(breaker, 'panel_as_main') and breaker.panel_as_main:
                return Response(
                    {'error': f'هذا القاطع مرتبط بالفعل كقاطع رئيسي للوحة: {breaker.panel_as_main.name}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if hasattr(breaker, 'power_source') and breaker.power_source and breaker.power_source != powersource:
                return Response(
                    {'error': f'هذا القاطع مرتبط بالفعل كقاطع رئيسي لمصدر طاقة آخر: {breaker.power_source.name}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # تعيين القاطع الرئيسي لمصدر الطاقة
            powersource.main_breaker = breaker
            powersource.save()
            
            # تحديث دور القاطع
            breaker.breaker_role = 'main'
            breaker.save()
            
            serializer = PowerSourceSerializer(powersource)
            return Response(serializer.data)
            
        except CircuitBreaker.DoesNotExist:
            return Response({'error': 'القاطع غير موجود'}, status=status.HTTP_404_NOT_FOUND)


class PanelViewSet(viewsets.ModelViewSet):
    """
    واجهة برمجية لإدارة اللوحات الكهربائية (رئيسية وفرعية)
    توفر عمليات إنشاء، قراءة، تحديث، وحذف للوحات
    وتدعم الهيكلية الشجرية للوحات
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
        try:
            panel = self.get_object()
            
            if request.method == 'GET':
                # جلب القواطع المرتبطة باللوحة
                breakers = CircuitBreaker.objects.filter(panel=panel)
                serializer = CircuitBreakerSerializer(breakers, many=True)
                return Response(serializer.data)
            
            elif request.method == 'POST':
                try:
                    # استخدام السيريلايزر المخصص لإنشاء قاطع للوحة
                    serializer = PanelBreakerSerializer(
                        data=request.data,
                        context={'panel_id': panel.id}
                    )
                    
                    if serializer.is_valid():
                        breaker = serializer.save()
                        # إرجاع البيانات باستخدام السيريلايزر الكامل
                        breaker_serializer = CircuitBreakerSerializer(breaker)
                        return Response(breaker_serializer.data, status=status.HTTP_201_CREATED)
                    
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                except Exception as e:
                    return Response({'error': f'حدث خطأ أثناء إنشاء القاطع: {str(e)}'}, 
                                   status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Panel.DoesNotExist:
            return Response({'error': 'اللوحة المحددة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'حدث خطأ: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get', 'post'])
    def child_panels(self, request, pk=None):
        """
        طريقة للحصول على اللوحات الفرعية للوحة محددة أو إضافة لوحة فرعية جديدة
        GET: يجلب جميع اللوحات الفرعية المباشرة
        POST: يضيف لوحة فرعية جديدة للوحة المحددة
        """
        try:
            panel = self.get_object()
            
            if request.method == 'GET':
                # جلب اللوحات الفرعية المباشرة
                child_panels = panel.child_panels.all()
                serializer = PanelSerializer(child_panels, many=True)
                return Response(serializer.data)
            
            elif request.method == 'POST':
                # استخدام السيريلايزر المخصص لإنشاء لوحة فرعية
                feeder_breaker_id = request.data.get('feeder_breaker_id')
                
                # التحقق من وجود القاطع المغذي (إجباري)
                if not feeder_breaker_id:
                    return Response({'error': 'يجب تحديد القاطع المغذي للوحة الفرعية'}, status=status.HTTP_400_BAD_REQUEST)
                
                try:
                    serializer = ParentPanelChildSerializer(
                        data=request.data,
                        context={
                            'parent_panel_id': panel.id,
                            'feeder_breaker_id': feeder_breaker_id
                        }
                    )
                    
                    if serializer.is_valid():
                        child_panel = serializer.save()
                        # إرجاع البيانات باستخدام السيريلايزر الكامل
                        panel_serializer = PanelSerializer(child_panel)
                        return Response(panel_serializer.data, status=status.HTTP_201_CREATED)
                    
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                    
                except CircuitBreaker.DoesNotExist:
                    return Response({'error': 'القاطع المغذي غير موجود'}, status=status.HTTP_404_NOT_FOUND)
                except Exception as e:
                    return Response({'error': f'حدث خطأ أثناء إنشاء اللوحة الفرعية: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
        except Panel.DoesNotExist:
            return Response({'error': 'اللوحة المحددة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'حدث خطأ: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def all_child_panels(self, request, pk=None):
        """
        طريقة للحصول على جميع اللوحات الفرعية (المباشرة وغير المباشرة) للوحة محددة
        """
        panel = self.get_object()
        # استخدام الطريقة المعرفة في النموذج للحصول على جميع اللوحات الفرعية
        all_children = panel.get_all_child_panels()
        serializer = PanelBasicSerializer(all_children, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def set_main_breaker(self, request, pk=None):
        """
        تعيين القاطع الرئيسي للوحة
        """
        panel = self.get_object()
        breaker_id = request.data.get('breaker_id')
        
        if not breaker_id:
            return Response({'error': 'يجب تحديد معرف القاطع'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            breaker = CircuitBreaker.objects.get(id=breaker_id)
            
            # التأكد من أن القاطع ينتمي إلى اللوحة المحددة
            if breaker.panel != panel:
                return Response(
                    {'error': 'القاطع لا ينتمي إلى هذه اللوحة. يجب أولًا إضافته إلى اللوحة.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # التأكد من أن القاطع ليس مرتبطًا بأي لوحة أخرى أو مصدر طاقة كقاطع رئيسي
            if hasattr(breaker, 'panel_as_main') and breaker.panel_as_main and breaker.panel_as_main != panel:
                return Response(
                    {'error': f'هذا القاطع مرتبط بالفعل كقاطع رئيسي للوحة: {breaker.panel_as_main.name}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if hasattr(breaker, 'power_source') and breaker.power_source:
                return Response(
                    {'error': f'هذا القاطع مرتبط بالفعل كقاطع رئيسي لمصدر الطاقة: {breaker.power_source.name}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # تعيين القاطع الرئيسي للوحة
            panel.main_breaker = breaker
            panel.save()
            
            # تحديث دور القاطع
            breaker.breaker_role = 'main'
            breaker.save()
            
            serializer = PanelSerializer(panel)
            return Response(serializer.data)
            
        except CircuitBreaker.DoesNotExist:
            return Response({'error': 'القاطع غير موجود'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def set_feeder_breaker(self, request, pk=None):
        """
        تعيين القاطع المغذي للوحة في اللوحة الأم
        """
        panel = self.get_object()
        breaker_id = request.data.get('breaker_id')
        
        if not breaker_id:
            return Response({'error': 'يجب تحديد معرف القاطع'}, status=status.HTTP_400_BAD_REQUEST)
        
        # التأكد من أن اللوحة ليست لوحة رئيسية (لأن اللوحة الرئيسية لا تحتاج إلى قاطع مغذي)
        if panel.panel_type == 'main':
            return Response(
                {'error': 'لا يمكن تعيين قاطع مغذي للوحة الرئيسية. اللوحات الرئيسية تتغذى مباشرة من مصدر الطاقة.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # التأكد من وجود لوحة أم
        if not panel.parent_panel:
            return Response(
                {'error': 'يجب تعيين لوحة أم أولاً قبل تعيين القاطع المغذي.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            breaker = CircuitBreaker.objects.get(id=breaker_id)
            
            # التأكد من أن القاطع ينتمي إلى اللوحة الأم
            if breaker.panel != panel.parent_panel:
                return Response(
                    {'error': 'القاطع لا ينتمي إلى اللوحة الأم. يجب أن يكون القاطع المغذي موجودًا في اللوحة الأم.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # تعيين القاطع المغذي للوحة
            panel.feeder_breaker = breaker
            panel.save()
            
            # إذا كان هناك قاطع رئيسي للوحة، أضف القاطع المغذي إلى قائمة القواطع المغذية له
            if panel.main_breaker:
                panel.main_breaker.feeding_breakers.add(breaker)
            
            serializer = PanelSerializer(panel)
            return Response(serializer.data)
            
        except CircuitBreaker.DoesNotExist:
            return Response({'error': 'القاطع غير موجود'}, status=status.HTTP_404_NOT_FOUND)


class LoadViewSet(viewsets.ModelViewSet):
    """
    واجهة برمجية لإدارة الأحمال الكهربائية
    توفر عمليات إنشاء، قراءة، تحديث، وحذف للأحمال
    """
    queryset = Load.objects.all()  # جلب جميع كائنات الأحمال
    serializer_class = LoadSerializer  # تحديد السيريلايزر المستخدم
    
    @action(detail=False, methods=['get'])
    def by_panel(self, request):
        """
        تصفية الأحمال حسب اللوحة المغذية
        """
        panel_id = request.query_params.get('panel_id')
        if not panel_id:
            return Response({'error': 'يجب تحديد معرف اللوحة'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            panel = Panel.objects.get(id=panel_id)
            loads = Load.objects.filter(panel=panel)
            serializer = self.get_serializer(loads, many=True)
            return Response(serializer.data)
        except Panel.DoesNotExist:
            return Response({'error': 'اللوحة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def by_breaker(self, request):
        """
        تصفية الأحمال حسب القاطع المغذي
        """
        breaker_id = request.query_params.get('breaker_id')
        if not breaker_id:
            return Response({'error': 'يجب تحديد معرف القاطع'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            breaker = CircuitBreaker.objects.get(id=breaker_id)
            loads = Load.objects.filter(breaker=breaker)
            serializer = self.get_serializer(loads, many=True)
            return Response(serializer.data)
        except CircuitBreaker.DoesNotExist:
            return Response({'error': 'القاطع غير موجود'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """
        تصفية الأحمال حسب النوع
        """
        load_type = request.query_params.get('load_type')
        if not load_type:
            return Response({'error': 'يجب تحديد نوع الحمل'}, status=status.HTTP_400_BAD_REQUEST)
        
        loads = Load.objects.filter(load_type=load_type)
        serializer = self.get_serializer(loads, many=True)
        return Response(serializer.data)


class CircuitBreakerViewSet(viewsets.ModelViewSet):
    """
    واجهة برمجية لإدارة قواطع الدارة الكهربائية
    توفر عمليات إنشاء، قراءة، تحديث، وحذف للقواطع
    وتدعم عمليات ربط القواطع ببعضها البعض
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
        try:
            breaker = self.get_object()
            
            if request.method == 'GET':
                # جلب الأحمال المرتبطة بالقاطع
                loads = Load.objects.filter(breaker=breaker)
                serializer = LoadSerializer(loads, many=True)
                return Response(serializer.data)
            
            elif request.method == 'POST':
                try:
                    # استخدام السيريلايزر المخصص لإنشاء حمل للقاطع
                    panel_id = request.data.get('panel_id', None)
                    
                    # إذا لم يتم تحديد اللوحة، استخدم اللوحة المرتبطة بالقاطع
                    if not panel_id and breaker.panel:
                        panel_id = breaker.panel.id
                    
                    serializer = BreakerLoadSerializer(
                        data=request.data,
                        context={
                            'breaker_id': breaker.id,
                            'panel_id': panel_id
                        }
                    )
                    
                    if serializer.is_valid():
                        load = serializer.save()
                        # إرجاع البيانات باستخدام السيريلايزر الكامل
                        load_serializer = LoadSerializer(load)
                        return Response(load_serializer.data, status=status.HTTP_201_CREATED)
                    
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                    
                except Panel.DoesNotExist:
                    return Response({'error': 'اللوحة المحددة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)
                except Exception as e:
                    return Response({'error': f'حدث خطأ أثناء إنشاء الحمل: {str(e)}'}, 
                                   status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
        except CircuitBreaker.DoesNotExist:
            return Response({'error': 'القاطع غير موجود'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'حدث خطأ: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get', 'put'])
    def feeding_breakers(self, request, pk=None):
        """
        طريقة للحصول على القواطع التي تغذي قاطع محدد أو تحديث قائمة القواطع المغذية
        GET: يجلب جميع القواطع التي تغذي القاطع المحدد
        PUT: يحدث قائمة القواطع المغذية للقاطع المحدد
        """
        try:
            breaker = self.get_object()
            
            if request.method == 'GET':
                # جلب القواطع المغذية
                feeding_breakers = breaker.feeding_breakers.all()
                serializer = CircuitBreakerBasicSerializer(feeding_breakers, many=True)
                return Response(serializer.data)
            
            elif request.method == 'PUT':
                try:
                    # تحديث قائمة القواطع المغذية
                    serializer = BreakerFeedingSerializer(breaker, data=request.data)
                    
                    if serializer.is_valid():
                        serializer.save()
                        # إرجاع البيانات المحدثة باستخدام السيريلايزر الكامل
                        breaker_serializer = CircuitBreakerSerializer(breaker)
                        return Response(breaker_serializer.data)
                    
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                except Exception as e:
                    return Response({'error': f'حدث خطأ أثناء تحديث القواطع المغذية: {str(e)}'}, 
                                   status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        except CircuitBreaker.DoesNotExist:
            return Response({'error': 'القاطع غير موجود'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'حدث خطأ: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def fed_breakers(self, request, pk=None):
        """
        طريقة للحصول على القواطع التي يغذيها قاطع محدد
        """
        try:
            breaker = self.get_object()
            # جلب القواطع المغذاة
            fed_breakers = breaker.fed_breakers.all()
            serializer = CircuitBreakerBasicSerializer(fed_breakers, many=True)
            return Response(serializer.data)
        except CircuitBreaker.DoesNotExist:
            return Response({'error': 'القاطع غير موجود'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'حدث خطأ: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def by_panel(self, request):
        """
        تصفية القواطع حسب اللوحة
        """
        panel_id = request.query_params.get('panel_id')
        if not panel_id:
            return Response({'error': 'يجب تحديد معرف اللوحة'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            panel = Panel.objects.get(id=panel_id)
            breakers = CircuitBreaker.objects.filter(panel=panel)
            serializer = self.get_serializer(breakers, many=True)
            return Response(serializer.data)
        except Panel.DoesNotExist:
            return Response({'error': 'اللوحة غير موجودة'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'حدث خطأ: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def by_role(self, request):
        """
        تصفية القواطع حسب الدور (رئيسي، رئيسي فرعي، توزيع)
        """
        role = request.query_params.get('role')
        if not role:
            return Response({'error': 'يجب تحديد دور القاطع'}, status=status.HTTP_400_BAD_REQUEST)
        
        breakers = CircuitBreaker.objects.filter(breaker_role=role)
        serializer = self.get_serializer(breakers, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def full_path(self, request, pk=None):
        """
        طريقة للحصول على المسار الكامل للقاطع عبر سلسلة التغذية
        """
        try:
            breaker = self.get_object()
            path = breaker.get_full_path()
            return Response({'full_path': path})
        except CircuitBreaker.DoesNotExist:
            return Response({'error': 'القاطع غير موجود'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'حدث خطأ: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def total_load(self, request, pk=None):
        """
        طريقة للحصول على إجمالي الحمل على القاطع
        """
        breaker = self.get_object()
        total_load = breaker.get_total_load()
        utilization = (total_load / breaker.rated_current * 100) if breaker.rated_current else 0
        
        return Response({
            'total_load': total_load,
            'rated_current': breaker.rated_current,
            'utilization_percentage': utilization
        })
