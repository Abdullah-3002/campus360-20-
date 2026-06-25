from django.urls import path
from . import views

urlpatterns = [
    # Profile URLs
    path('profile/', views.applicant_profile, name='applicant-profile'),
    
    # Academic Records URLs
    path('academic/', views.add_academic_record, name='add-academic'),
    path('academic/list/', views.get_academic_records, name='academic-list'),
    path('academic/<int:record_id>/', views.delete_academic_record, name='delete-academic-record'),
    
    # Application URLs
    path('application/', views.admission_application, name='application'),
    path('application/<int:app_id>/', views.delete_application, name='delete-application'),
    
    # ========== ADD THESE DOCUMENT URLs ==========
    path('documents/', views.get_my_documents, name='get-documents'),
    path('documents/upload/', views.upload_document, name='upload-document'),
    path('documents/<int:doc_id>/', views.delete_document, name='delete-document'),
    path('documents/<int:doc_id>/download/', views.download_document, name='download-document'),

     # Applications — admin
    path('admin/applications/',                                         views.admin_list_applications,      name='admin-applications'),
    path('admin/applications/<int:application_id>/decide/',             views.make_decision,                name='make-decision'),
    path('admin/applications/<int:application_id>/confirm-registration/', views.confirm_student_registration, name='confirm-registration'),
]
