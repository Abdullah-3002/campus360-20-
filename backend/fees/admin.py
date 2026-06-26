from django.contrib import admin
from .models import FeeStructure, Challan, Payment, Scholarship

admin.site.register(FeeStructure)
admin.site.register(Challan)
admin.site.register(Payment)
admin.site.register(Scholarship)