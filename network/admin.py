from django.contrib import admin
from .models import (
    PowerSource, Panel, CircuitBreaker, Load
)

class BreakerInline(admin.TabularInline):
    model = CircuitBreaker
    extra = 0
    fk_name = 'panel'
    fields = ('name', 'manufacturer', 'breaker_type', 'rated_current', 'number_of_poles', 'position', 'label')
    verbose_name = "قاطع توزيع"
    verbose_name_plural = "قواطع التوزيع"

class LoadInline(admin.TabularInline):
    model = Load
    extra = 0
    fields = ('name', 'voltage', 'ampacity', 'breaker', 'power_consumption')
    verbose_name = "حمل"
    verbose_name_plural = "الأحمال"

@admin.register(CircuitBreaker)
class CircuitBreakerAdmin(admin.ModelAdmin):
    list_display = ('name', 'manufacturer', 'breaker_type', 'breaker_role', 'number_of_poles', 'rated_current', 'panel_display')
    list_filter = ('manufacturer', 'breaker_type', 'breaker_role', 'number_of_poles', 'panel')
    search_fields = ('name', 'model', 'label')
    
    def panel_display(self, obj):
        return obj.panel.name if obj.panel else "-"
    panel_display.short_description = "اللوحة"

@admin.register(PowerSource)
class PowerSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'source_type', 'voltage', 'total_ampacity', 'get_cable_specification')
    list_filter = ('source_type', 'voltage')
    search_fields = ('name',)

@admin.register(Panel)
class PanelAdmin(admin.ModelAdmin):
    list_display = ('name', 'panel_type', 'get_source_or_parent', 'voltage', 'ampacity')
    list_filter = ('panel_type', 'voltage')
    search_fields = ('name',)
    inlines = [BreakerInline, LoadInline]
    
    def get_source_or_parent(self, obj):
        if obj.panel_type == 'main':
            return obj.power_source
        else:
            return obj.parent_panel
    get_source_or_parent.short_description = 'مصدر التغذية / اللوحة الأم'

@admin.register(Load)
class LoadAdmin(admin.ModelAdmin):
    list_display = ('name', 'panel', 'breaker', 'voltage', 'ampacity', 'power_consumption')
    list_filter = ('panel', 'voltage')
    search_fields = ('name',)
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """تخصيص عرض حقول القواطع ليعرض فقط القواطع المناسبة للوحة المحددة"""
        if db_field.name == "breaker" and request.resolver_match.kwargs.get('object_id'):
            load = self.get_object(request, request.resolver_match.kwargs.get('object_id'))
            if load and load.panel:
                kwargs["queryset"] = CircuitBreaker.objects.filter(panel=load.panel)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
