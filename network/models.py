from django.db import models
import math
from django.core.exceptions import ValidationError

# إنشاء فئة مساعدة لتخزين بيانات مقاطع الكابلات والمعاملات المشتركة
class CableConstants:
    # قيم مقاومة الكابلات (أوم/كم) للمقاطع المختلفة بناء على المادة
    CABLE_RESISTIVITY = {
        'copper': {
            # مقطع الكابل (ملم²) : المقاومة (أوم لكل كم)
            1.5: 12.1,
            2.5: 7.41,
            4: 4.61,
            6: 3.08,
            10: 1.83,
            16: 1.15,
            25: 0.727,
            35: 0.524,
            50: 0.387,
            70: 0.268,
            95: 0.193,
            120: 0.153,
            150: 0.124,
            185: 0.0991,
            240: 0.0754,
            300: 0.0601,
            400: 0.0470,
            500: 0.0366,
            630: 0.0283
        },
        'aluminum': {
            # مقطع الكابل (ملم²) : المقاومة (أوم لكل كم)
            16: 1.91,
            25: 1.20,
            35: 0.868,
            50: 0.641,
            70: 0.443,
            95: 0.320,
            120: 0.253,
            150: 0.206,
            185: 0.164,
            240: 0.125,
            300: 0.100,
            400: 0.0778,
            500: 0.0605,
            630: 0.0469
        }
    }
    
    # قيم الحمل الأقصى للكابلات (أمبير)
    CURRENT_CAPACITY = {
        'copper': {
            1.5: 16,
            2.5: 22,
            4: 30,
            6: 38,
            10: 52,
            16: 69,
            25: 90,
            35: 111,
            50: 133,
            70: 171,
            95: 207,
            120: 239,
            150: 272,
            185: 310,
            240: 364,
            300: 419,
            400: 502,
            500: 578,
            630: 669
        },
        'aluminum': {
            16: 53,
            25: 70,
            35: 86,
            50: 104,
            70: 133,
            95: 161,
            120: 186,
            150: 212,
            185: 240,
            240: 282,
            300: 324,
            400: 385,
            500: 443,
            630: 510
        }
    }
    
    # معامل تصحيح لمسار الكابل
    PATH_CORRECTION_FACTOR = {
        'aerial': 1.0,   # في الهواء
        'buried': 0.8,   # مدفون
        'conduit': 0.7,  # في أنابيب
        'tray': 0.9      # في مجاري كابلات
    }
    
    # قائمة بخيارات المقاطع الشائعة للكابلات
    COMMON_CROSS_SECTIONS = [
        (1.5, '1.5 mm²'),
        (2.5, '2.5 mm²'),
        (4, '4 mm²'),
        (6, '6 mm²'),
        (10, '10 mm²'),
        (16, '16 mm²'),
        (25, '25 mm²'),
        (35, '35 mm²'),
        (50, '50 mm²'),
        (70, '70 mm²'),
        (95, '95 mm²'),
        (120, '120 mm²'),
        (150, '150 mm²'),
        (185, '185 mm²'),
        (240, '240 mm²'),
        (300, '300 mm²'),
        (400, '400 mm²'),
        (500, '500 mm²'),
        (630, '630 mm²'),
    ]


# ميكسن للخصائص المشتركة للكابلات - لتجنب تكرار الشيفرة في كل نموذج
class CableMixin:
    def get_cable_specification(self):
        """حساب مواصفات الكابل بتنسيق نصي"""
        if self.neutral_cross_section:
            return f"{self.cable_quantity}x{self.cable_cross_section}+{self.neutral_cross_section}"
        else:
            return f"{self.cable_quantity}x{self.cable_cross_section}"
    
    def get_cable_resistance(self):
        """حساب مقاومة الكابل بناءً على نوعه ومساحة مقطعه"""
        material = CableConstants.CABLE_RESISTIVITY.get(self.cable_material, CableConstants.CABLE_RESISTIVITY['copper'])
        resistance_per_km = material.get(float(self.cable_cross_section), 0.5)  # قيمة افتراضية إذا لم يكن المقطع موجوداً
        return resistance_per_km / 1000 / self.cable_quantity
    
    def calculate_voltage_drop(self):
        """حساب انخفاض الجهد بناءً على معطيات الكابل"""
        current = getattr(self, 'total_ampacity', None) or getattr(self, 'ampacity', 0)
        resistance = self.get_cable_resistance()
        return current * resistance * self.cable_length
    
    def calculate_power_loss(self):
        """حساب الفقد في الطاقة بسبب مقاومة الكابل"""
        current = getattr(self, 'total_ampacity', None) or getattr(self, 'ampacity', 0)
        resistance = self.get_cable_resistance()
        return math.pow(current, 2) * resistance * self.cable_length
    
    def get_max_current_capacity(self):
        """تقدير السعة القصوى للتيار بناءً على نوع الكابل ومساره"""
        material_capacity = CableConstants.CURRENT_CAPACITY.get(self.cable_material, CableConstants.CURRENT_CAPACITY['copper'])
        base_capacity = material_capacity.get(float(self.cable_cross_section), 0)
        path_factor = CableConstants.PATH_CORRECTION_FACTOR.get(self.cable_path, 1.0)
        return base_capacity * path_factor * self.cable_quantity


# تعديل نموذج CircuitBreaker ليدعم المتطلبات الجديدة
class CircuitBreaker(models.Model):
    """
    نموذج موحد للقواطع الكهربائية
    يمكن أن يكون قاطع رئيسي أو قاطع توزيع
    يدعم ربط القاطع بقواطع أخرى للتغذية المتعددة
    """
    POLES_CHOICES = [
        (1, '1 قطب'),
        (2, '2 قطب'),
        (3, '3 أقطاب'),
        (4, '4 أقطاب'),
    ]
    
    BREAKER_TYPE_CHOICES = [
        ('MCB', 'MCB - قاطع دارة مصغر'),
        ('MCCB', 'MCCB - قاطع دارة مشكل'),
        ('ACB', 'ACB - قاطع دارة هوائي'),
        ('ELCB', 'ELCB - قاطع دارة تسرب أرضي'),
        ('RCD', 'RCD - جهاز تيار متبقي'),
        ('RCBO', 'RCBO - قاطع دارة بتيار متبقي'),
    ]

    BREAKER_ROLE_CHOICES = [
        ('main', 'قاطع رئيسي'),
        ('sub_main', 'قاطع رئيسي فرعي'),
        ('distribution', 'قاطع توزيع'),
    ]
    
    MANUFACTURER_CHOICES = [
        ('ABB', 'ABB'),
        ('Schneider', 'شنايدر إلكتريك'),
        ('Siemens', 'سيمنس'),
        ('Legrand', 'لوجراند'),
        ('Eaton', 'إيتون'),
        ('GE', 'جنرال إلكتريك'),
        ('Havells', 'هافيلس'),
        ('Chint', 'تشينت'),
        ('LS', 'LS'),
        ('Mitsubishi', 'ميتسوبيشي'),
        ('Hyundai', 'هيونداي'),
        ('other', 'أخرى'),
    ]
    
    name = models.CharField(max_length=100, help_text="اسم القاطع", blank=True, null=True)
    model = models.CharField(max_length=100, help_text="موديل القاطع", blank=True, null=True)
    manufacturer = models.CharField(
        max_length=20, 
        choices=MANUFACTURER_CHOICES,
        help_text="الشركة المصنعة للقاطع",
        default='Schneider'
    )
    breaker_type = models.CharField(
        max_length=10, 
        choices=BREAKER_TYPE_CHOICES,
        help_text="نوع القاطع",
        default='MCB'
    )
    breaker_role = models.CharField(
        max_length=20, 
        choices=BREAKER_ROLE_CHOICES,
        help_text="دور القاطع (رئيسي، رئيسي فرعي، أو توزيع)",
        default='distribution'
    )
    number_of_poles = models.IntegerField(
        choices=POLES_CHOICES,
        help_text="عدد الأقطاب",
        default=1
    )
    rated_current = models.FloatField(help_text="التيار المقنن بالأمبير", default=0)
    short_circuit_current = models.FloatField(help_text="تيار القصر (Isc) بالكيلو أمبير", default=0)
    trip_curve = models.CharField(
        max_length=10, 
        help_text="منحنى الفصل (مثل B، C، D، K)",
        default='C'
    )
    label = models.CharField(max_length=100, help_text="وصف مختصر للقاطع (مثال: إنارة الطابق الأول)", blank=True, null=True)
    position = models.IntegerField(help_text="الموقع في اللوحة (الترتيب)", default=0)
    
    # إضافة ارتباط مباشر باللوحة التي ينتمي إليها القاطع
    panel = models.ForeignKey(
        'Panel',
        on_delete=models.CASCADE,
        related_name='breakers',
        help_text="اللوحة التي ينتمي إليها القاطع",
        null=True,
        blank=True
    )
    
    # إضافة حقل جديد للقواطع المغذية لهذا القاطع (علاقة عديد لعديد)
    # يمكن لقاطع أن يتغذى من عدة قواطع أخرى (في حالة الترحيل أو الأنظمة المعقدة)
    feeding_breakers = models.ManyToManyField(
        'self',
        symmetrical=False,
        related_name='fed_breakers',
        blank=True,
        help_text="القواطع التي تغذي هذا القاطع"
    )

    def __str__(self):
        manufacturer_name = dict(self.MANUFACTURER_CHOICES).get(self.manufacturer, self.manufacturer)
        role_name = dict(self.BREAKER_ROLE_CHOICES).get(self.breaker_role)
        panel_name = f" - {self.panel.name}" if self.panel else ""
        return f"{manufacturer_name} - {self.breaker_type} {self.rated_current}A {self.number_of_poles}P" + (f" - {self.name}" if self.name else "") + f"{panel_name} ({role_name})"
    
    def get_full_path(self):
        """
        الحصول على المسار الكامل للقاطع من خلال تتبع القواطع المغذية
        """
        path = [str(self)]
        
        # الحصول على القواطع المغذية بشكل متكرر
        feeding_breakers = list(self.feeding_breakers.all())
        visited = set([self.id])
        
        while feeding_breakers:
            feeder = feeding_breakers.pop(0)
            if feeder.id in visited:  # تجنب الدورات
                continue
                
            visited.add(feeder.id)
            path.insert(0, str(feeder))
            
            # إضافة المغذيات لهذا القاطع
            for next_feeder in feeder.feeding_breakers.all():
                if next_feeder.id not in visited:
                    feeding_breakers.append(next_feeder)
        
        return " → ".join(path)
    
    def get_total_load(self):
        """
        حساب إجمالي الحمل على هذا القاطع (مجموع الأحمال المباشرة والقواطع المغذاة)
        """
        # حساب الأحمال المباشرة
        direct_load = sum(load.ampacity for load in self.loads.all())
        
        # حساب أحمال القواطع المغذاة
        fed_breakers_load = sum(breaker.rated_current for breaker in self.fed_breakers.all())
        
        return direct_load + fed_breakers_load
    
    def clean(self):
        """
        التحقق من صحة العلاقات والمعلومات
        """
        # منع الدارات المغلقة في علاقات التغذية
        if self.id:  # للتحقق فقط إذا كان القاطع مخزنًا مسبقًا
            # التحقق عند حفظ العلاقات من خلال علاقة many-to-many
            # يتم إجراؤه في save_m2m في النموذج المرتبط
            pass
    
    def save(self, *args, **kwargs):
        """
        حفظ القاطع والتأكد من أن حالته متناسقة مع دوره
        """
        # التحقق من تناسق دور القاطع مع علاقاته
        if self.breaker_role == 'main':
            # إذا كان قاطعًا رئيسيًا للوحة، يجب أن يكون مرتبطًا كقاطع رئيسي
            if hasattr(self, 'panel_as_main') or hasattr(self, 'power_source'):
                pass  # القاطع مرتبط بشكل صحيح
            elif self.panel:
                # تعيين هذا القاطع كقاطع رئيسي للوحة المرتبطة
                panel = self.panel
                if not panel.main_breaker:
                    panel.main_breaker = self
                    panel.save(update_fields=['main_breaker'])
        
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['position']
        verbose_name = "قاطع كهربائي"
        verbose_name_plural = "القواطع الكهربائية"


class PowerSource(models.Model, CableMixin):
    """
    نموذج لمصادر الطاقة
    يمكن أن يكون الشبكة المحلية أو مولد
    """
    SOURCE_TYPE_CHOICES = [
        ('Local Grid', 'الشبكة المحلية'),
        ('Generator', 'مولد'),
    ]
    
    VOLTAGE_CHOICES = [
        ('11KV', '11 كيلو فولت'),
        ('380', '380 فولت'),
        ('220', '220 فولت'),
        ('24', '24 فولت'),
    ]
    
    CABLE_MATERIAL_CHOICES = [
        ('copper', 'نحاس'),
        ('aluminum', 'ألومنيوم'),
    ]
    
    CABLE_PATH_CHOICES = [
        ('aerial', 'في الهواء'),
        ('buried', 'مدفون'),
        ('conduit', 'في أنابيب'),
        ('tray', 'في مجاري كابلات'),
    ]
    
    name = models.CharField(max_length=100, unique=True, help_text="اسم المصدر")
    source_type = models.CharField(
        max_length=50, 
        choices=SOURCE_TYPE_CHOICES,
        help_text="نوع المصدر (الشبكة المحلية أو مولد)",
        default='Local Grid'
    )
    voltage = models.CharField(
        max_length=10, 
        choices=VOLTAGE_CHOICES,
        help_text="الجهد الكهربائي للمصدر",
        default='220'
    )
    total_ampacity = models.FloatField(help_text="الأمبير الكلي بالأمبير", default=0)
    
    # بيانات الكابلات المغذية - حقول منفصلة لتجنب أخطاء الإدخال
    cable_quantity = models.PositiveIntegerField(help_text="عدد الكابلات", default=1)
    cable_cross_section = models.FloatField(
        help_text="مساحة مقطع الكابل (ملم²)",
        default=2.5,
        choices=CableConstants.COMMON_CROSS_SECTIONS
    )
    neutral_cross_section = models.FloatField(
        help_text="مساحة مقطع المحايد (ملم²)",
        default=0,
        null=True, 
        blank=True,
        choices=CableConstants.COMMON_CROSS_SECTIONS
    )
    cable_material = models.CharField(
        max_length=10,
        choices=CABLE_MATERIAL_CHOICES,
        help_text="نوع مادة الكابل (نحاس أو ألومنيوم)",
        default='copper'
    )
    cable_length = models.FloatField(help_text="طول الكابل (متر)", default=0)
    cable_path = models.CharField(
        max_length=10,
        choices=CABLE_PATH_CHOICES,
        help_text="مسار الكابل (في الهواء أو مدفون)",
        default='aerial'
    )
    
    # القاطع الرئيسي للمصدر
    main_breaker = models.OneToOneField(
        CircuitBreaker,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='power_source',
        help_text="القاطع العمومي لمصدر الطاقة"
    )

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        """
        حفظ نموذج مصدر الطاقة والتأكد من أن القاطع المرتبط به هو قاطع رئيسي
        """
        if self.main_breaker and self.main_breaker.breaker_role != 'main':
            self.main_breaker.breaker_role = 'main'
            self.main_breaker.save()
        super().save(*args, **kwargs)


# تعديل نموذج Panel ليدعم الهيكلية الشجرية واللوحات الفرعية المتداخلة
class Panel(models.Model, CableMixin):
    """
    نموذج موحد للوحات الكهربائية
    يدعم هيكلية شجرية حيث يمكن للوحة أن تحتوي على لوحات فرعية
    ويمكن للوحة الفرعية أن تحتوي على لوحات فرعية أخرى بدورها
    """
    PANEL_TYPE_CHOICES = [
        ('main', 'لوحة رئيسية'),
        ('sub_main', 'لوحة رئيسية فرعية'),  # لوحة فرعية لكن لها لوحات فرعية أخرى
        ('sub', 'لوحة فرعية')  # لوحة فرعية نهائية
    ]
    
    VOLTAGE_CHOICES = [
        ('11KV', '11 كيلو فولت'),
        ('380', '380 فولت'),
        ('220', '220 فولت'),
        ('24', '24 فولت'),
    ]
    
    CABLE_MATERIAL_CHOICES = [
        ('copper', 'نحاس'),
        ('aluminum', 'ألومنيوم'),
    ]
    
    CABLE_PATH_CHOICES = [
        ('aerial', 'في الهواء'),
        ('buried', 'مدفون'),
        ('conduit', 'في أنابيب'),
        ('tray', 'في مجاري كابلات'),
    ]
    
    name = models.CharField(max_length=100, unique=True, help_text="اسم اللوحة")
    panel_type = models.CharField(
        max_length=10, 
        choices=PANEL_TYPE_CHOICES,
        help_text="نوع اللوحة (رئيسية، رئيسية فرعية، أو فرعية)",
        default='main'
    )
    
    # مصدر الطاقة - يمكن أن يكون مصدر طاقة أو لوحة أخرى
    power_source = models.ForeignKey(
        PowerSource, 
        on_delete=models.CASCADE, 
        related_name='panels',
        help_text="مصدر الطاقة المغذي (في حالة اللوحة الرئيسية)",
        null=True, 
        blank=True
    )
    
    # اللوحة الأم - علاقة ذاتية (self-relation) لبناء هيكل شجري
    parent_panel = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        related_name='child_panels',
        help_text="اللوحة الأم المغذية (للوحات الفرعية)",
        null=True, 
        blank=True
    )
    
    # القاطع المغذي في اللوحة الأم
    feeder_breaker = models.OneToOneField(
        CircuitBreaker,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fed_panel',
        help_text="القاطع المغذي للوحة في اللوحة الأم (للوحات الفرعية)"
    )
    
    # القاطع الرئيسي للوحة
    main_breaker = models.OneToOneField(
        CircuitBreaker,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='panel_as_main',
        help_text="القاطع العمومي للوحة"
    )
    
    voltage = models.CharField(
        max_length=10, 
        choices=VOLTAGE_CHOICES,
        help_text="الجهد الكهربائي",
        default='220'
    )
    
    ampacity = models.FloatField(help_text="الأمبير الكلي", default=0)
    
    # بيانات الكابلات المغذية - حقول منفصلة
    cable_quantity = models.PositiveIntegerField(help_text="عدد الكابلات", default=1)
    cable_cross_section = models.FloatField(
        help_text="مساحة مقطع الكابل (ملم²)",
        default=2.5,
        choices=CableConstants.COMMON_CROSS_SECTIONS
    )
    neutral_cross_section = models.FloatField(
        help_text="مساحة مقطع المحايد (ملم²)",
        default=0,
        null=True, 
        blank=True,
        choices=CableConstants.COMMON_CROSS_SECTIONS
    )
    cable_material = models.CharField(
        max_length=10,
        choices=CABLE_MATERIAL_CHOICES,
        help_text="نوع مادة الكابل (نحاس أو ألومنيوم)",
        default='copper'
    )
    cable_length = models.FloatField(help_text="طول الكابل (متر)", default=0)
    cable_path = models.CharField(
        max_length=10,
        choices=CABLE_PATH_CHOICES,
        help_text="مسار الكابل (في الهواء أو مدفون)",
        default='aerial'
    )
    
    # معلومات إضافية
    location = models.CharField(
        max_length=200, 
        help_text="موقع اللوحة", 
        blank=True, 
        null=True
    )
    
    description = models.TextField(
        help_text="وصف إضافي", 
        blank=True, 
        null=True
    )
    
    def __str__(self):
        panel_type_name = dict(self.PANEL_TYPE_CHOICES).get(self.panel_type)
        parent_info = f" ← {self.parent_panel.name}" if self.parent_panel else ""
        return f"{self.name} ({panel_type_name}){parent_info}"
    
    def get_full_path(self):
        """
        الحصول على المسار الكامل للوحة من خلال تتبع اللوحات الأم
        """
        path = [self.name]
        current_panel = self
        
        while current_panel.parent_panel:
            current_panel = current_panel.parent_panel
            path.insert(0, current_panel.name)
            
        # إذا كانت لوحة رئيسية، أضف مصدر الطاقة
        if current_panel.power_source:
            path.insert(0, current_panel.power_source.name)
            
        return " → ".join(path)
    
    def get_all_child_panels(self, include_indirect=True):
        """
        الحصول على جميع اللوحات الفرعية التابعة لهذه اللوحة
        
        Args:
            include_indirect (bool): تضمين اللوحات الفرعية غير المباشرة (الأحفاد)
        
        Returns:
            list: قائمة باللوحات الفرعية
        """
        direct_children = list(self.child_panels.all())
        
        if not include_indirect:
            return direct_children
            
        all_children = direct_children.copy()
        for child in direct_children:
            all_children.extend(child.get_all_child_panels())
            
        return all_children
    
    def get_total_loads(self):
        """
        حساب إجمالي الأحمال المرتبطة باللوحة وبجميع لوحاتها الفرعية
        
        Returns:
            tuple: (إجمالي الأمبير, عدد الأحمال)
        """
        # حساب الأحمال المباشرة
        direct_load = sum(load.ampacity for load in self.loads.all())
        direct_count = self.loads.count()
        
        # حساب أحمال اللوحات الفرعية
        child_load = 0
        child_count = 0
        
        for child_panel in self.child_panels.all():
            cl, cc = child_panel.get_total_loads()
            child_load += cl
            child_count += cc
            
        return (direct_load + child_load, direct_count + child_count)
    
    def clean(self):
        """
        التحقق من اتساق العلاقات والبيانات
        """
        # منع الدارات المغلقة في الهيكل الشجري
        if self.parent_panel:
            # التحقق من أن اللوحة الأم ليست هي ذاتها أو لوحة فرعية من اللوحة الحالية
            if self.parent_panel == self:
                raise ValidationError("لا يمكن تعيين اللوحة كأم لنفسها")
                
            # التحقق من أن اللوحة الأم ليست فرعية من هذه اللوحة
            parent = self.parent_panel
            while parent:
                if parent.parent_panel == self:
                    raise ValidationError("يوجد دورة في هيكل اللوحات: اللوحة الأم هي أيضًا لوحة فرعية من هذه اللوحة")
                parent = parent.parent_panel
                
        # التحقق من تناسق نوع اللوحة مع علاقاتها
        if self.panel_type == 'main':
            # اللوحة الرئيسية يجب أن تكون متصلة بمصدر طاقة وليس لوحة أم
            if not self.power_source:
                raise ValidationError("اللوحة الرئيسية يجب أن تكون متصلة بمصدر طاقة")
            if self.parent_panel:
                raise ValidationError("اللوحة الرئيسية لا يمكن أن تكون متصلة بلوحة أم")
        else:
            # اللوحة الفرعية أو الرئيسية الفرعية يجب أن تكون متصلة بلوحة أم
            if not self.parent_panel:
                raise ValidationError("اللوحة الفرعية يجب أن تكون متصلة بلوحة أم")
            if self.power_source:
                raise ValidationError("اللوحة الفرعية لا يمكن أن تكون متصلة بمصدر طاقة مباشرة")
        
        # التحقق من أن اللوحة الفرعية العادية لا تحتوي على لوحات فرعية
        if self.panel_type == 'sub' and self.child_panels.exists():
            raise ValidationError("اللوحة الفرعية العادية لا يمكن أن تحتوي على لوحات فرعية. يجب تغيير نوعها إلى 'لوحة رئيسية فرعية'")
    
    def save(self, *args, **kwargs):
        """
        حفظ نموذج اللوحة والتأكد من ضبط العلاقات بشكل صحيح
        """
        # التأكد من أن القاطع الرئيسي هو قاطع رئيسي وتحديث دوره
        if self.main_breaker and self.main_breaker.breaker_role != 'main':
            self.main_breaker.breaker_role = 'main'
            self.main_breaker.panel = self
            self.main_breaker.save(update_fields=['breaker_role', 'panel'])
        
        # إذا كان القاطع المغذي في اللوحة الأم، تأكد من ضبط العلاقات بشكل صحيح
        if self.feeder_breaker and self.parent_panel:
            # تعيين اللوحة الأم للقاطع المغذي
            if self.feeder_breaker.panel != self.parent_panel:
                self.feeder_breaker.panel = self.parent_panel
                self.feeder_breaker.save(update_fields=['panel'])
            
            # إضافة القاطع المغذي كمصدر تغذية للقاطع الرئيسي إذا وجد
            if self.main_breaker:
                self.main_breaker.feeding_breakers.add(self.feeder_breaker)
        
        # الحصول على الجهد من المصدر أو اللوحة الأم إذا لم يتم تحديده
        if not self.voltage:
            if self.panel_type == 'main' and self.power_source:
                self.voltage = self.power_source.voltage
            elif self.parent_panel:
                self.voltage = self.parent_panel.voltage
        
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['name']
        verbose_name = "لوحة كهربائية"
        verbose_name_plural = "اللوحات الكهربائية"


class Load(models.Model, CableMixin):
    """
    نموذج للأحمال الكهربائية
    يمكن ربطه بأي قاطع في أي لوحة
    يتيح تصنيف الأحمال حسب النوع (إنارة، آلات، تكييف، إلخ)
    """
    VOLTAGE_CHOICES = [
        ('11KV', '11 كيلو فولت'),
        ('380', '380 فولت'),
        ('220', '220 فولت'),
        ('24', '24 فولت'),
    ]
    
    CABLE_MATERIAL_CHOICES = [
        ('copper', 'نحاس'),
        ('aluminum', 'ألومنيوم'),
    ]
    
    CABLE_PATH_CHOICES = [
        ('aerial', 'في الهواء'),
        ('buried', 'مدفون'),
        ('conduit', 'في أنابيب'),
        ('tray', 'في مجاري كابلات'),
    ]
    
    # إضافة خيارات تصنيف الأحمال
    LOAD_TYPE_CHOICES = [
        ('machine', 'آلة صناعية'),
        ('service_panel', 'لوحة خدمة'),
        ('outlet', 'بلاجة أو مخرج كهربائي'),
        ('lighting', 'إنارة'),
        ('fan', 'مراوح'),
        ('screen', 'شاشات'),
        ('exhaust', 'شفاطات هواء'),
        ('ac', 'تكييف'),
        ('heater', 'سخان'),
        ('refrigerator', 'ثلاجات وتبريد'),
        ('motor', 'محركات'),
        ('pump', 'مضخات'),
        ('other', 'أخرى'),
    ]
    
    name = models.CharField(max_length=100, unique=True, help_text="اسم الحمل")
    
    # إضافة حقل تصنيف الحمل
    load_type = models.CharField(
        max_length=20, 
        choices=LOAD_TYPE_CHOICES,
        help_text="نوع الحمل (آلة، إنارة، شفاط، إلخ)",
        default='other'
    )
    
    # إضافة حقل لوصف الحمل
    description = models.TextField(
        help_text="وصف تفصيلي للحمل", 
        blank=True, 
        null=True
    )
    
    # إضافة حقل للعلامة الشارحة (الفائدة، المكان، معلومات إضافية)
    label = models.CharField(
        max_length=100, 
        help_text="علامة توضيحية للحمل (مثل 'إنارة الممر'، 'بلاجة الاستراحة')", 
        blank=True, 
        null=True
    )
    
    # إضافة حقل لاستهلاك الطاقة المقدر (بالكيلو واط/ساعة)
    estimated_usage_hours = models.FloatField(
        help_text="عدد ساعات التشغيل اليومية المقدرة", 
        default=8.0
    )
    
    # إضافة حقل معامل القدرة
    power_factor = models.FloatField(
        help_text="معامل القدرة (Power Factor) من 0 إلى 1", 
        default=0.85
    )
    
    panel = models.ForeignKey(
        Panel, 
        on_delete=models.CASCADE, 
        related_name='loads',
        help_text="اللوحة المغذية للحمل",
        null=True,
        blank=True
    )
    breaker = models.ForeignKey(
        CircuitBreaker, 
        on_delete=models.SET_NULL,
        related_name='loads',
        null=True, 
        blank=True, 
        help_text="القاطع المغذي للحمل"
    )
    voltage = models.CharField(
        max_length=10, 
        choices=VOLTAGE_CHOICES,
        help_text="الجهد الكهربائي",
        default='220'
    )
    ampacity = models.FloatField(help_text="الأمبير الكلي", default=0)
    
    # بيانات الكابلات المغذية - حقول منفصلة
    cable_quantity = models.PositiveIntegerField(help_text="عدد الكابلات", default=1)
    cable_cross_section = models.FloatField(
        help_text="مساحة مقطع الكابل (ملم²)",
        default=2.5,
        choices=CableConstants.COMMON_CROSS_SECTIONS
    )
    neutral_cross_section = models.FloatField(
        help_text="مساحة مقطع المحايد (ملم²)",
        default=0,
        null=True, 
        blank=True,
        choices=CableConstants.COMMON_CROSS_SECTIONS
    )
    cable_material = models.CharField(
        max_length=10,
        choices=CABLE_MATERIAL_CHOICES,
        help_text="نوع مادة الكابل (نحاس أو ألومنيوم)",
        default='copper'
    )
    cable_length = models.FloatField(help_text="طول الكابل (متر)", default=0)
    cable_path = models.CharField(
        max_length=10,
        choices=CABLE_PATH_CHOICES,
        help_text="مسار الكابل (في الهواء أو مدفون)",
        default='aerial'
    )
    
    power_consumption = models.FloatField(help_text="استهلاك الطاقة بالواط", default=0)
    
    def get_total_path(self):
        """إرجاع المسار الكامل من المصدر للحمل"""
        path = [self.name]
        panel = self.panel
        
        while panel:
            path.insert(0, panel.name)
            if panel.panel_type == 'sub' and panel.parent_panel:
                panel = panel.parent_panel
            elif panel.panel_type == 'main' and panel.power_source:
                path.insert(0, panel.power_source.name)
                break
            else:
                break
                
        return ' → '.join(path)
    
    def calculate_daily_consumption(self):
        """حساب الاستهلاك اليومي للحمل بالكيلو واط ساعة"""
        watts = self.power_consumption if self.power_consumption > 0 else (self.voltage_value() * self.ampacity)
        kwh = (watts * self.estimated_usage_hours) / 1000
        return kwh
        
    def voltage_value(self):
        """تحويل قيمة الجهد من النص إلى رقم"""
        if self.voltage == '11KV':
            return 11000
        else:
            return float(self.voltage)
    
    def calculate_monthly_cost(self, price_per_kwh=0.18):
        """حساب التكلفة الشهرية التقديرية للحمل"""
        daily_kwh = self.calculate_daily_consumption()
        monthly_kwh = daily_kwh * 30  # تقريبًا
        return monthly_kwh * price_per_kwh

    def __str__(self):
        load_type_display = dict(self.LOAD_TYPE_CHOICES).get(self.load_type, "غير محدد")
        return f"{self.name} ({load_type_display})"
    
    def save(self, *args, **kwargs):
        """
        حفظ نموذج الحمل وضبط الجهد تلقائياً إذا لم يتم تحديده وضمان اتساق العلاقات
        """
        # الحصول على الجهد من اللوحة إذا لم يتم تحديده
        if not self.voltage and self.panel:
            self.voltage = self.panel.voltage
            
        # التأكد أن القاطع المحدد ينتمي للوحة المحددة أو ضبط اللوحة تلقائياً
        if self.breaker and self.panel:
            # إذا لم يكن القاطع مرتبطًا بلوحة أو لوحته مختلفة
            if self.breaker.panel is None:
                self.breaker.panel = self.panel
                self.breaker.save()
            # إذا كان مرتبطًا بلوحة أخرى غير لوحة الحمل
            elif self.breaker.panel != self.panel:
                # حدث عدم اتساق، فنتخذ أحد الإجراءين:
                # 1. ضبط لوحة الحمل لتطابق لوحة القاطع
                self.panel = self.breaker.panel
        
        # حساب استهلاك الطاقة تلقائيًا إذا لم يتم تحديده
        if not self.power_consumption and self.ampacity > 0:
            # P = V × I × PF للتيار المتردد أحادي الطور
            voltage_val = self.voltage_value()
            self.power_consumption = voltage_val * self.ampacity * self.power_factor
        
        super().save(*args, **kwargs)
        
    class Meta:
        verbose_name = "حمل كهربائي"
        verbose_name_plural = "الأحمال الكهربائية"
