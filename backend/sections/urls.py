from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_sections, name='list-sections'),
    path('create/', views.create_section, name='create-section'),
    path('me/', views.get_my_sections, name='my-sections'),
    path('<int:section_id>/', views.section_detail, name='section-detail'),
    path('<int:section_id>/schedules/', views.add_schedule, name='add-schedule'),
    
    # Batch Sections
    path('batch/', views.manage_batch_sections, name='manage-batch-sections'),
    path('batch/<int:batch_section_id>/', views.delete_batch_section, name='delete-batch-section'),
    
    # Section Students
    path('<int:section_id>/students/', views.get_section_students, name='section-students'),
    path('<int:section_id>/submit-marks/', views.submit_final_marks, name='submit-final-marks'),
]