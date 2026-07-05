from django.urls import path
from . import views

urlpatterns = [
    path('structures/', views.list_fee_structures, name='fee-structures'),
    path('structures/create/', views.create_fee_structure, name='create-fee-structure'),

    path('challans/', views.list_challans, name='list-challans'),
    path('challans/generate/', views.generate_challan, name='generate-challan'),
    path('challans/me/', views.my_challans, name='my-challans'),

    path('payments/record/', views.record_payment, name='record-payment'),
    path('payments/', views.list_payments, name='list-payments'),
    path('payments/<int:payment_id>/verify/', views.verify_payment, name='verify-payment'),
    path('challans/generate-bulk/', views.generate_semester_challans, name='generate-semester-challans'),

    path('scholarships/', views.scholarships, name='scholarships'),
]