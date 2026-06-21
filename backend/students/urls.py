from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.get_my_student_profile, name='my-student-profile'),
    path('me/profile/', views.update_student_profile, name='update-student-profile'),
    path('', views.list_students, name='list-students'),
    path('create/', views.create_student, name='create-student'),
    path('<int:student_id>/', views.get_student, name='get-student'),
    path('<int:student_id>/status/', views.update_student_status, name='update-student-status'),
]