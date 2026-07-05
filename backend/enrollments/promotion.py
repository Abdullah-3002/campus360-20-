"""
Auto-enrollment: students are enrolled by the system after results are published.
No self-service course registration.
"""
from __future__ import annotations

import uuid
from datetime import timedelta

from django.utils import timezone

from academics.models import ProgramCourse, Semester
from enrollments.models import Enrollment, CourseRegistration
from examinations.models import FinalGrade
from fees.models import FeeStructure, Challan
from notifications.models import Notification, NotificationType
from sections.models import Section


def _pick_section(course, semester, student):
    """Pick an active section with capacity for the course."""
    sections = Section.objects.filter(
        course=course, semester=semester, is_active=True,
    ).order_by('section_id')
    for sec in sections:
        if sec.enrolled_count < sec.max_capacity:
            return sec
    return sections.first()


def _failed_course_ids(student, semester) -> set:
    return set(
        FinalGrade.objects.filter(
            student=student, semester=semester, status='fail',
        ).values_list('course_id', flat=True)
    )


def enroll_student_for_semester(student, target_semester, performed_by=None) -> dict:
    """
    Enroll student in curriculum courses for their current_semester number,
    plus any failed courses carried forward.
    """
    from students.models import Student

    if isinstance(student, int):
        student = Student.objects.select_related('program').get(student_id=student)

    sem_num = student.current_semester
    program = student.program
    performed_by = performed_by or student.user

    enrollment, _ = Enrollment.objects.get_or_create(
        student=student,
        semester=target_semester,
        defaults={'status': 'enrolled'},
    )

    enrolled = []
    warnings = []
    course_ids_done = set()

    prev_semester = Semester.objects.filter(
        academic_year__lte=target_semester.academic_year,
    ).exclude(semester_id=target_semester.semester_id).order_by(
        '-academic_year', '-start_date',
    ).first()

    if prev_semester:
        for cid in _failed_course_ids(student, prev_semester):
            from academics.models import Course
            course = Course.objects.get(course_id=cid)
            if CourseRegistration.objects.filter(enrollment=enrollment, course=course).exists():
                course_ids_done.add(cid)
                continue
            section = _pick_section(course, target_semester, student)
            if not section:
                warnings.append(f'No section for repeat {course.course_code}')
                continue
            CourseRegistration.objects.create(
                enrollment=enrollment,
                course=course,
                section=section,
                student=student,
            )
            section.enrolled_count += 1
            section.save(update_fields=['enrolled_count'])
            enrolled.append(f'{course.course_code} (repeat)')
            course_ids_done.add(cid)

    program_courses = ProgramCourse.objects.filter(
        program=program, semester_number=sem_num,
    ).select_related('course')

    for pc in program_courses:
        if pc.course_id in course_ids_done:
            continue
        if CourseRegistration.objects.filter(enrollment=enrollment, course=pc.course).exists():
            continue
        section = _pick_section(pc.course, target_semester, student)
        if not section:
            warnings.append(f'No section for {pc.course.course_code}')
            continue
        if section.enrolled_count >= section.max_capacity:
            warnings.append(f'Section full for {pc.course.course_code}')
            continue
        CourseRegistration.objects.create(
            enrollment=enrollment,
            course=pc.course,
            section=section,
            student=student,
        )
        section.enrolled_count += 1
        section.save(update_fields=['enrolled_count'])
        enrolled.append(pc.course.course_code)

    enrollment.total_credit_hours_registered = sum(
        r.course.credit_hours for r in CourseRegistration.objects.filter(
            enrollment=enrollment, status='registered',
        ).select_related('course')
    )
    enrollment.save(update_fields=['total_credit_hours_registered'])

    _ensure_semester_challan(student, program, target_semester, sem_num, performed_by)

    notif_type, _ = NotificationType.objects.get_or_create(
        type_name='Academic',
        defaults={'description': 'Academic updates'},
    )
    course_list = ', '.join(enrolled) if enrolled else 'pending section assignment'
    Notification.objects.create(
        notification_type=notif_type,
        recipient=student.user,
        title=f'Enrolled — {target_semester.semester_name}',
        message=f'You have been enrolled for semester {sem_num}: {course_list}.',
        priority='high',
    )

    return {'enrolled_courses': enrolled, 'warnings': warnings}


def promote_student_after_published_result(student, completed_semester, performed_by=None) -> dict:
    """
    After a semester result is published: advance semester counter and enroll
    in the next term if the student passed or is on probation.
    """
    from examinations.results_pipeline import ensure_semester_result
    from examinations.models import Result

    result = Result.objects.filter(
        student=student, semester=completed_semester, is_published=True,
    ).first()
    if not result:
        return {'promoted': False, 'reason': 'Result not published.'}

    if result.status == 'fail':
        return {'promoted': False, 'reason': 'Student failed semester; manual review required.'}

    next_sem_num = student.current_semester + 1
    max_sem = ProgramCourse.objects.filter(program=student.program).order_by(
        '-semester_number',
    ).values_list('semester_number', flat=True).first()

    if max_sem and next_sem_num > max_sem:
        student.status = 'graduated'
        student.save(update_fields=['status'])
        return {'promoted': False, 'reason': 'Program completed.', 'graduated': True}

    student.current_semester = next_sem_num
    student.save(update_fields=['current_semester'])

    next_semester = Semester.objects.filter(is_current=True).first()
    if not next_semester:
        return {
            'promoted': True,
            'current_semester': next_sem_num,
            'enrollment': None,
            'reason': 'No current semester set for enrollment.',
        }

    enroll_stats = enroll_student_for_semester(student, next_semester, performed_by)
    return {
        'promoted': True,
        'current_semester': next_sem_num,
        **enroll_stats,
    }


def _ensure_semester_challan(student, program, semester, sem_num, performed_by):
    if Challan.objects.filter(student=student, semester=semester).exists():
        return
    fee_structure = FeeStructure.objects.filter(
        program=program, semester_number=sem_num, fee_type='semester_fee',
    ).order_by('-effective_from').first()
    amount = fee_structure.amount if fee_structure else (program.fee_per_semester or 75000)
    Challan.objects.create(
        challan_number=f"CH-{timezone.now().year}-{str(uuid.uuid4().int)[:6]}",
        student=student,
        semester=semester,
        due_date=timezone.now().date() + timedelta(days=30),
        total_amount=amount,
        generated_by=performed_by,
    )
