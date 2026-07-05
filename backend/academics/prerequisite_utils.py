"""Helpers for course prerequisite validation."""
from collections import defaultdict

from academics.models import Course, CoursePrerequisite, ProgramCoursePrerequisite
from academics.curriculum_prerequisites import ALTERNATIVE_PREREQUISITES


def get_completed_course_ids(student):
    from enrollments.models import CourseRegistration

    return set(
        CourseRegistration.objects.filter(
            student=student,
            status='completed',
        ).values_list('course_id', flat=True)
    )


def _check_program_prerequisites(student, course, completed_codes, credit_hours):
    """Program-scoped rules including OR groups."""
    program_id = student.program_id
    rules = ProgramCoursePrerequisite.objects.filter(
        program_id=program_id, course=course,
    ).select_related('prerequisite_course')

    if not rules.exists():
        return []

    missing = []
    groups = defaultdict(list)
    standalone = []

    for rule in rules:
        if rule.min_credit_hours:
            if credit_hours < rule.min_credit_hours:
                missing.append(f'{rule.min_credit_hours}+ credit hours (have {credit_hours})')
        elif rule.prerequisite_course_id:
            code = rule.prerequisite_course.course_code
            if rule.or_group:
                groups[rule.or_group].append(code)
            else:
                standalone.append(code)

    for code in standalone:
        if code not in completed_codes:
            missing.append(code)

    for _group, codes in groups.items():
        if not any(c in completed_codes for c in codes):
            missing.append(' or '.join(codes))

    return missing


def check_course_prerequisites(student, course):
    missing = []
    completed_ids = get_completed_course_ids(student)
    completed_codes = set(
        Course.objects.filter(course_id__in=completed_ids).values_list('course_code', flat=True)
    )
    credit_hours = student.total_credit_hours_completed or 0

    prog_missing = _check_program_prerequisites(student, course, completed_codes, credit_hours)
    if prog_missing:
        return (len(prog_missing) == 0, prog_missing)

    if course.course_code in ALTERNATIVE_PREREQUISITES:
        alts = ALTERNATIVE_PREREQUISITES[course.course_code]
        if not any(a in completed_codes for a in alts):
            missing.append(' or '.join(alts))

    for prereq in CoursePrerequisite.objects.filter(course=course).select_related('prerequisite_course'):
        if prereq.prerequisite_type == 'credit_hours':
            required = prereq.min_credit_hours or 0
            if credit_hours < required:
                missing.append(f'{required}+ credit hours (have {credit_hours})')
        elif prereq.prerequisite_course_id:
            code = prereq.prerequisite_course.course_code
            if course.course_code in ALTERNATIVE_PREREQUISITES and code in ALTERNATIVE_PREREQUISITES[course.course_code]:
                continue
            if prereq.prerequisite_course_id not in completed_ids and code not in completed_codes:
                missing.append(code)

    return (len(missing) == 0, missing)
