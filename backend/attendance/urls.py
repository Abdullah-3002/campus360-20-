from django.urls import path
from . import views

urlpatterns = [
    path('mark/', views.mark_attendance, name='mark-attendance'),
    path('', views.list_attendance, name='list-attendance'),
    path('summary/me/', views.my_attendance_summary, name='my-attendance-summary'),
    path('summary/', views.list_attendance_summaries, name='list-attendance-summaries'),
]