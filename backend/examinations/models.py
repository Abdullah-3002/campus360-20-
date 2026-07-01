from django.db import models
from django.conf import settings


class ExamType(models.Model):
    exam_type_id        = models.AutoField(primary_key=True)
    type_name           = models.CharField(max_length=50, unique=True)
    weightage_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    description         = models.TextField(blank=True)

    class Meta:
        db_table = 'exam_type'

    def __str__(self):
        return self.type_name


class Examination(models.Model):
    exam_id      = models.AutoField(primary_key=True)
    course       = models.ForeignKey('academics.Course', on_delete=models.CASCADE, related_name='examinations')
    semester     = models.ForeignKey('academics.Semester', on_delete=models.RESTRICT, related_name='examinations')
    section      = models.ForeignKey('sections.Section', on_delete=models.CASCADE, related_name='examinations')
    exam_type    = models.ForeignKey(ExamType, on_delete=models.RESTRICT, related_name='examinations')
    exam_name    = models.CharField(max_length=200)
    exam_date    = models.DateField()
    start_time   = models.TimeField(null=True, blank=True)
    end_time     = models.TimeField(null=True, blank=True)
    duration_minutes = models.IntegerField()
    total_marks  = models.DecimalField(max_digits=6, decimal_places=2)
    passing_marks = models.DecimalField(max_digits=6, decimal_places=2)
    created_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_examinations'
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'examination'

    def __str__(self):
        return f"{self.exam_name} — {self.course.course_code}"


class ExamSchedule(models.Model):
    schedule_id     = models.AutoField(primary_key=True)
    exam            = models.ForeignKey(Examination, on_delete=models.CASCADE, related_name='schedules')
    exam_date       = models.DateField()
    start_time      = models.TimeField()
    end_time        = models.TimeField()
    duration_minutes = models.IntegerField()
    room_number     = models.CharField(max_length=20)
    building_name   = models.CharField(max_length=100, blank=True)
    student_count   = models.IntegerField(null=True, blank=True)
    invigilator     = models.ForeignKey(
        'faculty.Faculty', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='invigilated_exams'
    )
    created_by      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_exam_schedules'
    )
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'exam_schedule'


class Grade(models.Model):
    grade_id      = models.AutoField(primary_key=True)
    grade_letter  = models.CharField(max_length=5, unique=True)
    min_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    max_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    grade_points  = models.DecimalField(max_digits=3, decimal_places=2)
    status        = models.CharField(max_length=10, choices=[('pass', 'Pass'), ('fail', 'Fail')])
    description   = models.TextField(blank=True)

    class Meta:
        db_table = 'grade_scale'

    def __str__(self):
        return f"{self.grade_letter} ({self.grade_points})"


class Marks(models.Model):
    marks_id      = models.AutoField(primary_key=True)
    exam          = models.ForeignKey(Examination, on_delete=models.CASCADE, related_name='marks')
    student       = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='marks')
    registration  = models.ForeignKey(
        'enrollments.CourseRegistration', on_delete=models.CASCADE, related_name='marks'
    )
    obtained_marks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    is_absent     = models.BooleanField(default=False)
    remarks       = models.TextField(blank=True)
    entered_by    = models.ForeignKey(
        'faculty.Faculty', on_delete=models.RESTRICT, related_name='entered_marks'
    )
    entered_at    = models.DateTimeField(auto_now_add=True)
    modified_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='modified_marks'
    )
    modified_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'marks'
        unique_together = ['exam', 'student']


class FinalGrade(models.Model):
    STATUS_CHOICES = [
        ('pass', 'Pass'), ('fail', 'Fail'),
        ('incomplete', 'Incomplete'), ('withdrawn', 'Withdrawn'),
    ]

    final_grade_id      = models.AutoField(primary_key=True)
    registration        = models.OneToOneField(
        'enrollments.CourseRegistration', 
        on_delete=models.CASCADE, 
        related_name='final_grades'
    )
    student             = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='final_grades')
    course              = models.ForeignKey('academics.Course', on_delete=models.RESTRICT, related_name='final_grades')
    semester            = models.ForeignKey('academics.Semester', on_delete=models.RESTRICT, related_name='final_grades')
    total_obtained_marks = models.DecimalField(max_digits=6, decimal_places=2)
    total_marks         = models.DecimalField(max_digits=6, decimal_places=2)
    percentage          = models.DecimalField(max_digits=5, decimal_places=2)
    grade               = models.ForeignKey(Grade, on_delete=models.RESTRICT, related_name='final_grades')
    status              = models.CharField(max_length=20, choices=STATUS_CHOICES)
    verified_by         = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='verified_grades'
    )
    verified_at         = models.DateTimeField(null=True, blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'final_grade'


class Result(models.Model):
    STATUS_CHOICES = [
        ('pass', 'Pass'), ('fail', 'Fail'),
        ('incomplete', 'Incomplete'), ('probation', 'Probation'),
    ]

    result_id                   = models.AutoField(primary_key=True)
    student                     = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='results')
    semester                    = models.ForeignKey('academics.Semester', on_delete=models.RESTRICT, related_name='results')
    sgpa                        = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    cgpa                        = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    total_credit_hours_attempted = models.IntegerField(null=True, blank=True)
    total_credit_hours_earned   = models.IntegerField(null=True, blank=True)
    status                      = models.CharField(max_length=20, choices=STATUS_CHOICES)
    is_published                = models.BooleanField(default=False)
    published_date              = models.DateField(null=True, blank=True)
    published_by                = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='published_results'
    )
    created_at                  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'result'
        unique_together = ['student', 'semester']


class ResultApproval(models.Model):
    approval_id   = models.AutoField(primary_key=True)
    result        = models.OneToOneField(Result, on_delete=models.CASCADE, related_name='approval')
    approved_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name='approved_results'
    )
    approval_date = models.DateField(auto_now_add=True)
    remarks       = models.TextField(blank=True)

    class Meta:
        db_table = 'result_approval'


class MarksEditPermission(models.Model):
    permission_id = models.AutoField(primary_key=True)
    section = models.ForeignKey('sections.Section', on_delete=models.CASCADE, related_name='marks_edit_permissions')
    student = models.ForeignKey(
        'students.Student', on_delete=models.CASCADE,
        null=True, blank=True, related_name='marks_edit_permissions',
    )
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name='granted_marks_permissions'
    )
    granted_to = models.ForeignKey(
        'faculty.Faculty', on_delete=models.CASCADE, related_name='marks_edit_permissions'
    )
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'marks_edit_permission'