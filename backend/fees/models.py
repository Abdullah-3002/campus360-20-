from django.db import models
from django.conf import settings


class FeeStructure(models.Model):
    FEE_TYPE_CHOICES = [
        ('semester_fee', 'Semester Fee'),
        ('admission_fee', 'Admission Fee'),
        ('examination_fee', 'Examination Fee'),
    ]

    structure_id    = models.AutoField(primary_key=True)
    program         = models.ForeignKey('academics.DegreeProgram', on_delete=models.CASCADE, related_name='fee_structures')
    semester_number = models.IntegerField(null=True, blank=True)
    fee_type        = models.CharField(max_length=50, choices=FEE_TYPE_CHOICES, default='semester_fee')
    amount          = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    effective_from  = models.DateField()
    effective_to    = models.DateField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fee_structure'
        unique_together = ['program', 'semester_number', 'effective_from']

    def __str__(self):
        return f"{self.program.program_code} - {self.get_fee_type_display()}: {self.amount}"


class Challan(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'), ('partial', 'Partial'),
        ('paid', 'Paid'), ('overdue', 'Overdue'),
    ]

    challan_id     = models.AutoField(primary_key=True)
    challan_number = models.CharField(max_length=50, unique=True)
    student        = models.ForeignKey('students.Student', on_delete=models.RESTRICT, related_name='challans')
    semester       = models.ForeignKey('academics.Semester', on_delete=models.RESTRICT, related_name='challans')
    issue_date     = models.DateField(auto_now_add=True)
    due_date       = models.DateField()
    late_fee       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount   = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    generated_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name='generated_challans'
    )
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'challan'


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('bank_challan', 'Bank Challan'),
        ('cash', 'Cash'), 
    ]

    payment_id       = models.AutoField(primary_key=True)
    challan          = models.ForeignKey(Challan, on_delete=models.RESTRICT, related_name='payments')
    student          = models.ForeignKey('students.Student', on_delete=models.RESTRICT, related_name='payments')
    amount           = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date     = models.DateField(auto_now_add=True)
    payment_time     = models.TimeField()
    payment_method   = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    bank_name        = models.CharField(max_length=100, blank=True)
    transaction_id   = models.CharField(max_length=100, unique=True, null=True, blank=True)
    receipt_number   = models.CharField(max_length=50, unique=True)
    recorded_by      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name='recorded_payments'
    )
    verified_by      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='verified_payments'
    )
    remarks          = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payment'


class Scholarship(models.Model):
    SCHOLARSHIP_TYPE_CHOICES = [
        ('merit', 'Merit'), ('need_based', 'Need Based'),
        ('employee_child', 'Employee Child'), ('minority', 'Minority'), 
        ('disability', 'Disability'), ('other', 'Other'),
    ]

    scholarship_id   = models.AutoField(primary_key=True)
    student          = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='scholarships')
    scholarship_type = models.CharField(max_length=50, choices=SCHOLARSHIP_TYPE_CHOICES)
    amount           = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    percentage       = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    semester         = models.ForeignKey(
        'academics.Semester', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='scholarships'
    )
    start_date       = models.DateField()
    end_date         = models.DateField(null=True, blank=True)
    is_active        = models.BooleanField(default=True)
    awarded_by       = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='awarded_scholarships'
    )
    remarks          = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'scholarship'