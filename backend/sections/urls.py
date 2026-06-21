from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_sections, name='list-sections'),
    path('create/', views.create_section, name='create-section'),
    path('me/', views.get_my_sections, name='my-sections'),
    path('<int:section_id>/', views.section_detail, name='section-detail'),
    path('<int:section_id>/schedules/', views.add_schedule, name='add-schedule'),
]