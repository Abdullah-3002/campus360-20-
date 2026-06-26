from django.urls import path
from . import views

urlpatterns = [
    path('structures/', views.list_fee_structures, name='fee-structures'),
    path('structures/create/', views.create_fee_structure, name='create-fee-structure'),

    path('challans/', views.list_challans, name='list-challans'),
    path('challans/generate/', views.generate_challan, name='generate-challan'),
    path('challans/me/', views.my_challans, name='my-challans'),

    path('payments/record/', views.record_payment, name='record-payment'),

    path('scholarships/', views.scholarships, name='scholarships'),
]