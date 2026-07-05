"""
Semester result aggregation and publication helpers.
"""
from __future__ import annotations

from decimal import Decimal

from django.utils import timezone

from examinations.models import FinalGrade, Grade, Result
from enrollments.models import Enrollment, CourseRegistration


def _grade_points_for(grade_obj) -> Decimal:
    return grade_obj.grade_points if grade_obj else Decimal('0')


def sync_registration_from_final_grade(final_grade: FinalGrade) -> None:
    """Keep CourseRegistration grade_points/status aligned with FinalGrade."""
    reg = final_grade.registration
    reg.grade_points = _grade_points_for(final_grade.grade)
    reg.status = 'completed' if final_grade.status == 'pass' else reg.status
    if final_grade.status == 'fail':
        reg.status = 'registered'
    reg.save(update_fields=['grade_points', 'status'])


def compute_student_sgpa(student, semester) -> dict:
    """Compute SGPA from FinalGrade rows for a student in a semester."""
    grades = FinalGrade.objects.filter(
        student=student, semester=semester,
    ).select_related('registration__course', 'grade')

    attempted_ch = 0
    earned_ch = 0
    weighted_points = Decimal('0')
    fail_count = 0

    for fg in grades:
        ch = fg.course.credit_hours
        attempted_ch += ch
        gp = _grade_points_for(fg.grade)
        weighted_points += gp * ch
        if fg.status == 'pass':
            earned_ch += ch
        else:
            fail_count += 1

    sgpa = (weighted_points / attempted_ch) if attempted_ch else Decimal('0')
    status = 'pass'
    if fail_count > 0:
        status = 'probation' if sgpa >= Decimal('2.0') else 'fail'

    return {
        'sgpa': round(sgpa, 2),
        'attempted_ch': attempted_ch,
        'earned_ch': earned_ch,
        'status': status,
        'fail_count': fail_count,
    }


def compute_student_cgpa(student) -> Decimal:
    """Cumulative GPA across all completed passing courses."""
    grades = FinalGrade.objects.filter(
        student=student, status='pass',
    ).select_related('course', 'grade')
    total_points = Decimal('0')
    total_ch = 0
    for fg in grades:
        ch = fg.course.credit_hours
        total_ch += ch
        total_points += _grade_points_for(fg.grade) * ch
    if not total_ch:
        return Decimal('0')
    return round(total_points / total_ch, 2)


def ensure_semester_result(student, semester, *, created_by=None) -> Result:
    """Create or update Result row from FinalGrade aggregation."""
    stats = compute_student_sgpa(student, semester)
    cgpa = compute_student_cgpa(student)

    result, _ = Result.objects.update_or_create(
        student=student,
        semester=semester,
        defaults={
            'sgpa': stats['sgpa'],
            'cgpa': cgpa,
            'total_credit_hours_attempted': stats['attempted_ch'],
            'total_credit_hours_earned': stats['earned_ch'],
            'status': stats['status'],
        },
    )

    student.cgpa = cgpa
    student.total_credit_hours_completed = stats['earned_ch']
    student.save(update_fields=['cgpa', 'total_credit_hours_completed'])

    enrollment = Enrollment.objects.filter(student=student, semester=semester).first()
    if enrollment and stats['fail_count'] == 0:
        enrollment.status = 'completed'
        enrollment.save(update_fields=['status'])

    return result


def generate_results_for_semester(semester) -> dict:
    """Build Result rows for every student with FinalGrades in a semester."""
    student_ids = FinalGrade.objects.filter(
        semester=semester,
    ).values_list('student_id', flat=True).distinct()

    created = 0
    for sid in student_ids:
        from students.models import Student
        student = Student.objects.get(student_id=sid)
        ensure_semester_result(student, semester)
        created += 1
    return {'results_created_or_updated': created}


def published_semester_ids_for(student) -> set:
    return set(
        Result.objects.filter(student=student, is_published=True).values_list(
            'semester_id', flat=True
        )
    )
