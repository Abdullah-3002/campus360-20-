from django.urls import path
from . import views

urlpatterns = [
    path('exam-types/',        views.list_exam_types,          name='list-exam-types'),
    path('exam-types/create/', views.create_exam_type,         name='create-exam-type'),

    path('grades/', views.list_grades, name='list-grades'),
    path('grades/create/', views.create_grade, name='create-grade'),

    path('', views.list_examinations, name='list-examinations'),
    path('create/', views.create_examination, name='create-examination'),
    path('<int:exam_id>/', views.examination_detail, name='examination-detail'),
    path('<int:exam_id>/schedule/', views.add_exam_schedule, name='add-exam-schedule'),
    path('<int:exam_id>/marks/', views.list_marks, name='list-marks'),
    path('<int:exam_id>/marks/enter/', views.enter_marks, name='enter-marks'),

    path('marks/<int:marks_id>/', views.update_marks, name='update-marks'),

    path('final-grades/me/', views.my_final_grades, name='my-final-grades'),
    path('final-grades/create/', views.create_final_grade, name='create-final-grade'),

    path('results/me/', views.my_results, name='my-results'),
    path('results/', views.list_results, name='list-results'),
    path('results/create/', views.create_result, name='create-result'),
    path('results/<int:result_id>/publish/', views.publish_result, name='publish-result'),
    path('results/<int:result_id>/approve/', views.approve_result, name='approve-result'),
]