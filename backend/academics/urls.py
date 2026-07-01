from django.urls import path
from . import views

urlpatterns = [
    # Departments
    path('departments/', views.list_departments, name='list-departments'),
    path('departments/create/', views.create_department, name='create-department'),
    path('departments/<int:department_id>/', views.department_detail, name='department-detail'),

    # Degree Programs
    path('programs/', views.list_programs, name='list-programs'),
    path('programs/create/', views.create_program, name='create-program'),
    path('programs/<int:program_id>/', views.program_detail, name='program-detail'),
    path('programs/<int:program_id>/courses/', views.list_program_courses, name='program-courses'),

    # Semesters
    path('semesters/', views.list_semesters, name='list-semesters'),
    path('semesters/current/', views.get_current_semester, name='current-semester'),
    path('semesters/create/', views.create_semester, name='create-semester'),
    path('semesters/<int:semester_id>/', views.semester_detail, name='semester-detail'),

    # Courses
    path('courses/', views.list_courses, name='list-courses'),
    path('courses/create/', views.create_course, name='create-course'),
    path('courses/<int:course_id>/', views.course_detail, name='course-detail'),

    # Program Course mapping
    path('program-courses/add/', views.add_program_course, name='add-program-course'),
    path('program-courses/<int:program_course_id>/', views.remove_program_course, name='remove-program-course'),
]