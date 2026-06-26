from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings


class Attendance(models.Model):
    attendance_id   = models.AutoField(primary_key=True)
    section         = models.ForeignKey('sections.Section', on_delete=models.CASCADE, related_name='attendances')
    attendance_date = models.DateField()
    lecture_number  = models.IntegerField(null=True, blank=True)
    topic_covered   = models.TextField(blank=True)
    marked_by       = models.ForeignKey(
        'faculty.Faculty', on_delete=models.RESTRICT, related_name='marked_attendances'
    )
    marked_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attendance'
        unique_together = ['section', 'attendance_date', 'lecture_number']

    def __str__(self):
        return f"{self.section} — {self.attendance_date}"


class AttendanceRecord(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'), ('absent', 'Absent'),
        ('late', 'Late'), ('leave', 'Leave'), ('excused', 'Excused'),
    ]

    record_id    = models.AutoField(primary_key=True)
    attendance   = models.ForeignKey(Attendance, on_delete=models.CASCADE, related_name='records')
    student      = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='attendance_records')
    registration = models.ForeignKey(
        'enrollments.CourseRegistration', on_delete=models.CASCADE, related_name='attendance_records'
    )
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES)
    remarks      = models.TextField(blank=True)

    class Meta:
        db_table = 'attendance_record'
        unique_together = ['attendance', 'student']


class StudentAttendanceSummary(models.Model):
    summary_id          = models.AutoField(primary_key=True)
    student             = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='attendance_summaries')
    course              = models.ForeignKey('academics.Course', on_delete=models.RESTRICT, related_name='attendance_summaries')
    section             = models.ForeignKey('sections.Section', on_delete=models.RESTRICT, related_name='attendance_summaries')
    semester            = models.ForeignKey('academics.Semester', on_delete=models.RESTRICT, related_name='attendance_summaries')
    total_lectures      = models.IntegerField(default=0)
    attended_lectures   = models.IntegerField(default=0)
    late_count          = models.IntegerField(default=0)
    leave_count         = models.IntegerField(default=0)
    attendance_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    is_below_threshold  = models.BooleanField(default=False)
    last_updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_attendance_summary'
        unique_together = ['student', 'section']