from django.contrib import admin
from .models import (
    PowerSource, Panel, CircuitBreaker, PanelBreaker, Load
)

class PanelBreakerInline(admin.TabularInline):
    model = PanelBreaker
    extra = 0

class LoadInline(admin.TabularInline):
    model = Load
    extra = 0

@admin.register(CircuitBreaker)
class CircuitBreakerAdmin(admin.ModelAdmin):
    list_display = ('name', 'manufacturer', 'breaker_type', 'breaker_role', 'number_of_poles', 'rated_current', 'short_circuit_current')
    list_filter = ('manufacturer', 'breaker_type', 'breaker_role', 'number_of_poles')
    search_fields = ('name', 'model', 'label')

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
    inlines = [PanelBreakerInline, LoadInline]
    
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

@admin.register(PanelBreaker)
class PanelBreakerAdmin(admin.ModelAdmin):
    list_display = ('panel', 'breaker')
    list_filter = ('panel',)
    search_fields = ('breaker__name', 'breaker__label')
