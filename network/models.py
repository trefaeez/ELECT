from django.db import models
import math

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


# نموذج موحد للقواطع (Circuit Breakers)
class CircuitBreaker(models.Model):
    """
    نموذج موحد للقواطع الكهربائية
    يمكن أن يكون قاطع رئيسي أو قاطع توزيع
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
        help_text="دور القاطع (رئيسي أو توزيع)",
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
    
    def __str__(self):
        manufacturer_name = dict(self.MANUFACTURER_CHOICES).get(self.manufacturer, self.manufacturer)
        role_name = dict(self.BREAKER_ROLE_CHOICES).get(self.breaker_role)
        return f"{manufacturer_name} - {self.breaker_type} {self.rated_current}A {self.number_of_poles}P" + (f" - {self.name}" if self.name else "") + f" ({role_name})"
    
    class Meta:
        ordering = ['position']


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


class Panel(models.Model, CableMixin):
    """
    نموذج موحد للوحات الكهربائية
    يمكن أن تكون لوحة رئيسية أو لوحة فرعية
    """
    PANEL_TYPE_CHOICES = [
        ('main', 'لوحة رئيسية'),
        ('sub', 'لوحة فرعية'),
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
        help_text="نوع اللوحة (رئيسية أو فرعية)",
        default='main'
    )
    power_source = models.ForeignKey(
        PowerSource, 
        on_delete=models.CASCADE, 
        related_name='panels',
        help_text="مصدر الطاقة المغذي (في حالة اللوحة الرئيسية)",
        null=True, 
        blank=True
    )
    parent_panel = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        related_name='sub_panels',
        help_text="اللوحة الأم المغذية (في حالة اللوحة الفرعية)",
        null=True, 
        blank=True
    )
    feeder_breaker = models.OneToOneField(
        CircuitBreaker,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fed_panel',
        help_text="القاطع المغذي للوحة في اللوحة الأم (في حالة اللوحة الفرعية)"
    )
    voltage = models.CharField(
        max_length=10, 
        choices=VOLTAGE_CHOICES,
        help_text="الجهد الكهربائي",
        default='220'
    )
    ampacity = models.FloatField(help_text="الأمبير الكلي", default=0)
    
    # القاطع الرئيسي للوحة
    main_breaker = models.OneToOneField(
        CircuitBreaker,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='panel_as_main',
        help_text="القاطع العمومي للوحة"
    )
    
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
    
    # القواطع الفرعية
    breakers = models.ManyToManyField(
        CircuitBreaker,
        through='PanelBreaker',
        related_name='panels',
        help_text="القواطع المتصلة باللوحة"
    )

    def __str__(self):
        panel_type_name = dict(self.PANEL_TYPE_CHOICES).get(self.panel_type)
        return f"{self.name} ({panel_type_name})"
    
    def clean(self):
        """
        التحقق من اتساق البيانات حسب نوع اللوحة
        """
        from django.core.exceptions import ValidationError
        
        if self.panel_type == 'main':
            # اللوحة الرئيسية يجب أن تكون متصلة بمصدر طاقة وليس لوحة أم
            if not self.power_source:
                raise ValidationError("اللوحة الرئيسية يجب أن تكون متصلة بمصدر طاقة")
            if self.parent_panel:
                raise ValidationError("اللوحة الرئيسية لا يمكن أن تكون متصلة بلوحة أم")
        else:
            # اللوحة الفرعية يجب أن تكون متصلة بلوحة أم وليس مصدر طاقة مباشرة
            if not self.parent_panel:
                raise ValidationError("اللوحة الفرعية يجب أن تكون متصلة بلوحة أم")
            if self.power_source:
                raise ValidationError("اللوحة الفرعية لا يمكن أن تكون متصلة بمصدر طاقة مباشرة")
    
    def save(self, *args, **kwargs):
        """
        حفظ نموذج اللوحة والتأكد من أن القاطع الرئيسي هو قاطع رئيسي
        """
        if self.main_breaker and self.main_breaker.breaker_role != 'main':
            self.main_breaker.breaker_role = 'main'
            self.main_breaker.save()
        
        # الحصول على الجهد من المصدر أو اللوحة الأم إذا لم يتم تحديده
        if not self.voltage:
            if self.panel_type == 'main' and self.power_source:
                self.voltage = self.power_source.voltage
            elif self.panel_type == 'sub' and self.parent_panel:
                self.voltage = self.parent_panel.voltage
        
        super().save(*args, **kwargs)


class PanelBreaker(models.Model):
    """
    نموذج للربط بين اللوحات والقواطع
    """
    panel = models.ForeignKey(
        Panel, 
        on_delete=models.CASCADE, 
        related_name='panel_breakers',
        help_text="اللوحة التي ينتمي إليها القاطع"
    )
    breaker = models.ForeignKey(
        CircuitBreaker,
        on_delete=models.CASCADE,
        related_name='breaker_panels',
        help_text="القاطع المتصل باللوحة"
    )
    
    def __str__(self):
        return f"{self.panel.name} - {self.breaker}"


class Load(models.Model, CableMixin):
    """
    نموذج للأحمال الكهربائية
    يمكن ربطه بأي قاطع في أي لوحة
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
    
    name = models.CharField(max_length=100, unique=True, help_text="اسم الحمل")
    panel = models.ForeignKey(
        Panel, 
        on_delete=models.CASCADE, 
        related_name='loads',
        help_text="اللوحة المغذية للحمل",
        null=True,  # السماح بقيمة null مؤقتاً للترحيل
        blank=True  # السماح بحقل فارغ في النماذج
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

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        """
        حفظ نموذج الحمل وضبط الجهد تلقائياً إذا لم يتم تحديده
        """
        # الحصول على الجهد من اللوحة إذا لم يتم تحديده
        if not self.voltage and self.panel:
            self.voltage = self.panel.voltage
            
        # التأكد أن القاطع المحدد ينتمي للوحة المحددة
        if self.breaker and not PanelBreaker.objects.filter(panel=self.panel, breaker=self.breaker).exists():
            # إضافة القاطع للوحة إذا لم يكن موجوداً بها
            PanelBreaker.objects.create(panel=self.panel, breaker=self.breaker)
            
        super().save(*args, **kwargs)
