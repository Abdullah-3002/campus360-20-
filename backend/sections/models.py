from django.db import models


class Section(models.Model):
    SECTION_TYPE_CHOICES = [
        ('theory', 'Theory'),
        ('lab', 'Lab'),
        ('theory_lab_combined', 'Theory + Lab Combined'),
    ]

    section_id    = models.AutoField(primary_key=True)
    course        = models.ForeignKey('academics.Course', on_delete=models.CASCADE, related_name='sections')
    semester      = models.ForeignKey('academics.Semester', on_delete=models.CASCADE, related_name='sections')
    faculty       = models.ForeignKey('faculty.Faculty', on_delete=models.RESTRICT, related_name='sections')
    section_name  = models.CharField(max_length=5)
    section_type  = models.CharField(max_length=30, choices=SECTION_TYPE_CHOICES)
    max_capacity  = models.IntegerField()
    enrolled_count = models.IntegerField(default=0)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'section'
        unique_together = ['course', 'semester', 'section_name']

    def __str__(self):
        return f"{self.course.course_code} — Section {self.section_name} ({self.semester.semester_name})"


class SectionSchedule(models.Model):
    DAY_CHOICES = [
        ('Monday', 'Monday'), ('Tuesday', 'Tuesday'), ('Wednesday', 'Wednesday'),
        ('Thursday', 'Thursday'), ('Friday', 'Friday'), ('Saturday', 'Saturday'),
    ]
    SCHEDULE_TYPE_CHOICES = [
        ('lecture', 'Lecture'), ('lab', 'Lab'), ('tutorial', 'Tutorial'),
    ]

    schedule_id   = models.AutoField(primary_key=True)
    section       = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='schedules')
    day_of_week   = models.CharField(max_length=10, choices=DAY_CHOICES)
    start_time    = models.TimeField()
    end_time      = models.TimeField()
    room_number   = models.CharField(max_length=20)
    building_name = models.CharField(max_length=100, blank=True)
    schedule_type = models.CharField(max_length=20, choices=SCHEDULE_TYPE_CHOICES, default='lecture')
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'section_schedule'

    def __str__(self):
        return f"{self.section} — {self.day_of_week} {self.start_time}"