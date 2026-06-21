from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.my_enrollments, name='my-enrollments'),
    path('register/', views.register_courses, name='register-courses'),
    path('drop/<int:registration_id>/', views.drop_course, name='drop-course'),
    path('', views.list_enrollments, name='list-enrollments'),
]