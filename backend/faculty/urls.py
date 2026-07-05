from django.urls import path
from . import views

urlpatterns = [
    path('designations/', views.list_designations, name='list-designations'),
    path('designations/create/', views.create_designation, name='create-designation'),

    path('', views.list_faculty, name='list-faculty'),
    path('create/', views.create_faculty, name='create-faculty'),
    path('me/', views.get_my_faculty_profile, name='my-faculty-profile'),
    path('<int:faculty_id>/', views.faculty_detail, name='faculty-detail'),

    path('profile/', views.employee_profile, name='employee-profile'),
    path('onboarding/complete/', views.complete_teacher_onboarding, name='complete-teacher-onboarding'),
]
