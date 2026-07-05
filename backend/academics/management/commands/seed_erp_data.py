"""
Seed ERP demo data: semester, courses, sections, faculty, fee structures,
complaint categories, and notification types.

Run after migrations and seed_admission_programs:
  python manage.py seed_admission_programs
  python manage.py seed_erp_data
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from academics.models import Department, DegreeProgram, Semester, Course, ProgramCourse
from academics.admission_programs import ADMISSION_DEPARTMENTS
from faculty.models import Designation, Faculty
from sections.models import Section, BatchSection
from complaints.models import ComplaintCategory
from fees.models import FeeStructure
from notifications.models import NotificationType

UNIVERSITY_COURSES = [
    {'course_code': 'ENG101', 'course_name': 'English Composition', 'credit_hours': 3, 'course_type': 'university_requirement'},
    {'course_code': 'ISL101', 'course_name': 'Islamic Studies', 'credit_hours': 2, 'course_type': 'university_requirement'},
    {'course_code': 'PAK101', 'course_name': 'Pakistan Studies', 'credit_hours': 2, 'course_type': 'university_requirement'},
]

DEPT_SEM1_COURSES = {
    'FCIT': [
        {'course_code': 'CS101', 'course_name': 'Introduction to Programming', 'credit_hours': 3, 'course_type': 'core'},
        {'course_code': 'CS102', 'course_name': 'Discrete Structures', 'credit_hours': 3, 'course_type': 'core'},
    ],
    'FENG': [
        {'course_code': 'ENGF101', 'course_name': 'Engineering Fundamentals', 'credit_hours': 3, 'course_type': 'core'},
        {'course_code': 'MTH101', 'course_name': 'Calculus I', 'credit_hours': 3, 'course_type': 'core'},
    ],
    'FMHS': [
        {'course_code': 'ANAT101', 'course_name': 'Human Anatomy', 'credit_hours': 4, 'course_type': 'core'},
        {'course_code': 'PHYS101', 'course_name': 'Biophysics', 'credit_hours': 3, 'course_type': 'core'},
    ],
    'FBMS': [
        {'course_code': 'MGT101', 'course_name': 'Principles of Management', 'credit_hours': 3, 'course_type': 'core'},
        {'course_code': 'ACC101', 'course_name': 'Financial Accounting', 'credit_hours': 3, 'course_type': 'core'},
    ],
    'FASE': [
        {'course_code': 'SOC101', 'course_name': 'Introduction to Sociology', 'credit_hours': 3, 'course_type': 'core'},
        {'course_code': 'PSY101', 'course_name': 'Introduction to Psychology', 'credit_hours': 3, 'course_type': 'core'},
    ],
}

COMPLAINT_CATEGORIES = [
    ('Academic', 'Issues related to courses, grades, or faculty'),
    ('Administrative', 'Registration, documents, or office services'),
    ('Facilities', 'Campus infrastructure, labs, or hostel'),
    ('Financial', 'Fee challans, scholarships, or payments'),
    ('Harassment', 'Conduct or safety concerns'),
]

NOTIFICATION_TYPES = [
    ('Registration', 'Student registration and enrollment'),
    ('Academic', 'Academic updates and announcements'),
    ('Financial', 'Fee and payment notifications'),
    ('General', 'General campus notifications'),
]

BATCH_SECTIONS = ['Blue', 'Grey']

from academics.curriculum_cs_programs import PROGRAM_CURRICULA, DEPARTMENT_CODE
from academics.prerequisite_sync import sync_all_prerequisites, sync_program_prerequisites


class Command(BaseCommand):
    help = 'Seed ERP data: semester, courses, sections, faculty, fees, complaints'

    def _ensure_course(self, department, course_data):
        course, created = Course.objects.update_or_create(
            course_code=course_data['course_code'],
            defaults={
                'department': department,
                'course_name': course_data['course_name'],
                'credit_hours': course_data['credit_hours'],
                'theory_credit_hours': course_data.get('theory_credit_hours', course_data['credit_hours']),
                'lab_credit_hours': course_data.get('lab_credit_hours', 0),
                'course_type': course_data['course_type'],
                'is_active': True,
            },
        )
        return course, created

    def _ensure_section(self, course, semester, faculty):
        section, created = Section.objects.update_or_create(
            course=course,
            semester=semester,
            section_name='A',
            defaults={
                'faculty': faculty,
                'section_type': 'theory',
                'max_capacity': 40,
                'enrolled_count': 0,
                'is_active': True,
            },
        )
        return section, created

    def handle(self, *args, **options):
        today = timezone.now().date()
        year = today.year

        Semester.objects.filter(is_current=True).update(is_current=False)
        end_date = today + timedelta(days=120)
        semester, _ = Semester.objects.update_or_create(
            semester_name=f'Spring {year}',
            defaults={
                'academic_year': year,
                'semester_type': 'spring',
                'start_date': today,
                'end_date': end_date,
                'mid_term_cutoff_date': today + timedelta(days=60),
                'marks_grace_end_date': end_date + timedelta(days=7),
                'registration_start_date': today - timedelta(days=14),
                'registration_end_date': today + timedelta(days=14),
                'is_current': True,
            },
        )

        from examinations.models import ExamType
        DEFAULT_EXAM_TYPES = [
            ('Assignment 1', 5, 'pre_mid'),
            ('Assignment 2', 5, 'pre_mid'),
            ('Quiz 1', 5, 'pre_mid'),
            ('Mid Term', 30, 'mid_term'),
            ('Assignment 3', 5, 'post_mid'),
            ('Quiz 2', 5, 'post_mid'),
            ('Final Term', 45, 'final'),
        ]
        for type_name, weight, period in DEFAULT_EXAM_TYPES:
            ExamType.objects.update_or_create(
                type_name=type_name,
                defaults={'weightage_percentage': weight, 'marks_period': period},
            )

        designation, _ = Designation.objects.get_or_create(
            designation_title='Assistant Professor',
            defaults={'designation_level': 3, 'job_description': 'Faculty member'},
        )

        fcit_dept = Department.objects.filter(department_code='FCIT').first()
        if not fcit_dept:
            self.stdout.write(self.style.WARNING('Run seed_admission_programs first.'))
            return

        teacher, teacher_created = User.objects.get_or_create(
            email='teacher@campus360.edu',
            defaults={
                'username': 'demo.teacher',
                'user_type': 'teacher',
                'is_active': True,
            },
        )
        if teacher_created:
            teacher.set_password('Teacher@123')
            teacher.save()

        faculty, _ = Faculty.objects.get_or_create(
            user=teacher,
            defaults={
                'department': fcit_dept,
                'designation': designation,
                'employee_code': 'FAC-001',
                'qualification': 'PhD Computer Science',
                'specialization': 'Software Engineering',
                'joining_date': today - timedelta(days=365),
                'employment_type': 'permanent',
                'status': 'active',
            },
        )

        courses_created = 0
        program_links = 0
        sections_created = 0

        uni_courses = []
        for course_data in UNIVERSITY_COURSES:
            course, created = self._ensure_course(fcit_dept, course_data)
            if created:
                courses_created += 1
            _, sec_created = self._ensure_section(course, semester, faculty)
            if sec_created:
                sections_created += 1
            uni_courses.append(course)

        for dept_data in ADMISSION_DEPARTMENTS:
            dept_code = dept_data['department_code']
            department = Department.objects.filter(department_code=dept_code).first()
            if not department:
                continue

            dept_course_objs = list(uni_courses)
            for course_data in DEPT_SEM1_COURSES.get(dept_code, []):
                course, created = self._ensure_course(department, course_data)
                if created:
                    courses_created += 1
                _, sec_created = self._ensure_section(course, semester, faculty)
                if sec_created:
                    sections_created += 1
                dept_course_objs.append(course)

            programs = DegreeProgram.objects.filter(department=department, is_active=True)
            for program in programs:
                if not program.fee_per_semester:
                    program.fee_per_semester = 75000
                    program.save(update_fields=['fee_per_semester'])

                FeeStructure.objects.update_or_create(
                    program=program,
                    semester_number=1,
                    fee_type='semester_fee',
                    effective_from=today,
                    defaults={'amount': program.fee_per_semester or 75000},
                )

                for course in dept_course_objs:
                    _, linked = ProgramCourse.objects.update_or_create(
                        program=program,
                        course=course,
                        semester_number=1,
                        defaults={'is_core': True},
                    )
                    if linked:
                        program_links += 1

        for name, desc in COMPLAINT_CATEGORIES:
            ComplaintCategory.objects.get_or_create(
                category_name=name,
                defaults={'description': desc},
            )

        for type_name, desc in NOTIFICATION_TYPES:
            NotificationType.objects.get_or_create(
                type_name=type_name,
                defaults={'description': desc},
            )

        batch_sections_created = 0
        all_programs = DegreeProgram.objects.filter(is_active=True)
        for program in all_programs:
            for section_name in BATCH_SECTIONS:
                _, created = BatchSection.objects.update_or_create(
                    section_name=section_name,
                    batch_year=year,
                    program=program,
                )
                if created:
                    batch_sections_created += 1

        cs_links = 0
        fcit = Department.objects.filter(department_code=DEPARTMENT_CODE).first()
        if fcit:
            for program_code, semesters in PROGRAM_CURRICULA.items():
                program = DegreeProgram.objects.filter(program_code=program_code).first()
                if not program:
                    continue
                for sem_num, course_list in semesters.items():
                    for course_data in course_list:
                        course, _ = self._ensure_course(fcit, course_data)
                        _, linked = ProgramCourse.objects.update_or_create(
                            program=program,
                            course=course,
                            semester_number=sem_num,
                            defaults={'is_core': course_data['course_type'] == 'core'},
                        )
                        if linked:
                            cs_links += 1
                        if sem_num == 1:
                            self._ensure_section(course, semester, faculty)

        self.stdout.write(self.style.SUCCESS(
            f'ERP seed complete: semester={semester.semester_name}, '
            f'courses={courses_created}, program_course_links={program_links}, '
            f'sections={sections_created}, faculty={faculty.employee_code}, '
            f'batch_sections={batch_sections_created}, cs_course_links={cs_links}, '
            f'prerequisites={sync_all_prerequisites()}, program_prerequisites={sync_program_prerequisites()}'
        ))
