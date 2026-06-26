from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.list_categories, name='list-categories'),
    path('categories/create/', views.create_category, name='create-category'),

    path('submit/', views.submit_complaint, name='submit-complaint'),
    path('me/', views.my_complaints, name='my-complaints'),
    path('', views.list_all_complaints, name='list-complaints'),
    path('<int:complaint_id>/', views.complaint_detail, name='complaint-detail'),
    path('<int:complaint_id>/assign/', views.assign_complaint, name='assign-complaint'),
    path('<int:complaint_id>/thread/', views.complaint_thread, name='complaint-thread'),

        # Feedback
    path('<int:complaint_id>/feedback/submit/', views.submit_feedback, name='submit-feedback'),
    path('<int:complaint_id>/feedback/', views.list_feedback, name='list-feedback'),
]