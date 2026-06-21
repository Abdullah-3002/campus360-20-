from django.contrib import admin
from .models import Designation, Faculty, Staff, EmployeeProfile

admin.site.register(Designation)
admin.site.register(Faculty)
admin.site.register(Staff)
admin.site.register(EmployeeProfile)