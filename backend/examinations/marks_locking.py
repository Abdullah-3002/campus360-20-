"""
Semester phase-based marks locking.

Timeline:
  1. First half (before mid_term_cutoff): Assignment 1/2, Quiz 1, Mid Term editable
  2. Second half (mid cutoff → semester end): Assignment 3, Quiz 2, Final editable;
     pre-mid + mid-term locked unless admin approves per student+exam
  3. Grace week (after end_date, within 7 days): post-mid + final still editable
  4. After grace: all locked unless admin approves per student+exam
"""
from __future__ import annotations

from datetime import date, timedelta

from django.utils import timezone

PERIOD_PRE_MID = 'pre_mid'
PERIOD_MID_TERM = 'mid_term'
PERIOD_POST_MID = 'post_mid'
PERIOD_FINAL = 'final'

FIRST_HALF_PERIODS = {PERIOD_PRE_MID, PERIOD_MID_TERM}
SECOND_HALF_PERIODS = {PERIOD_POST_MID, PERIOD_FINAL}

PHASE_FIRST_HALF = 'first_half'
PHASE_SECOND_HALF = 'second_half'
PHASE_GRACE = 'grace'
PHASE_ARCHIVED = 'archived'

PERIOD_LABELS = {
    PERIOD_PRE_MID: 'Assignment 1, Assignment 2, Quiz 1',
    PERIOD_MID_TERM: 'Mid Term Exam',
    PERIOD_POST_MID: 'Assignment 3, Quiz 2',
    PERIOD_FINAL: 'Final Term Exam',
}


def _today() -> date:
    return timezone.now().date()


def get_mid_term_cutoff(semester) -> date:
    if semester.mid_term_cutoff_date:
        return semester.mid_term_cutoff_date
    total = (semester.end_date - semester.start_date).days
    return semester.start_date + timedelta(days=max(total // 2, 1))


def get_grace_end(semester) -> date:
    if semester.marks_grace_end_date:
        return semester.marks_grace_end_date
    return semester.end_date + timedelta(days=7)


def get_semester_phase(semester, on_date: date | None = None) -> str:
    today = on_date or _today()
    mid = get_mid_term_cutoff(semester)
    grace = get_grace_end(semester)

    if today < mid:
        return PHASE_FIRST_HALF
    if today <= semester.end_date:
        return PHASE_SECOND_HALF
    if today <= grace:
        return PHASE_GRACE
    return PHASE_ARCHIVED


def resolve_marks_period(exam_type) -> str:
    if exam_type.marks_period:
        return exam_type.marks_period
    name = (exam_type.type_name or '').lower()
    if 'assignment 1' in name or 'assignment 2' in name or 'quiz 1' in name:
        return PERIOD_PRE_MID
    if 'mid' in name and 'term' in name:
        return PERIOD_MID_TERM
    if 'assignment 3' in name or 'quiz 2' in name:
        return PERIOD_POST_MID
    if 'final' in name:
        return PERIOD_FINAL
    return PERIOD_PRE_MID


def is_period_naturally_editable(marks_period: str, phase: str) -> bool:
    if phase == PHASE_FIRST_HALF:
        return marks_period in FIRST_HALF_PERIODS
    if phase in (PHASE_SECOND_HALF, PHASE_GRACE):
        return marks_period in SECOND_HALF_PERIODS
    return False


def get_lock_reason(marks_period: str, phase: str) -> str:
    if phase == PHASE_ARCHIVED:
        return 'Semester grace period ended. Request admin approval to edit marks.'
    if phase == PHASE_SECOND_HALF and marks_period in FIRST_HALF_PERIODS:
        return f'Mid-semester passed. {PERIOD_LABELS.get(marks_period, marks_period)} marks are locked.'
    if phase == PHASE_FIRST_HALF and marks_period in SECOND_HALF_PERIODS:
        return f'{PERIOD_LABELS.get(marks_period, marks_period)} opens after mid-semester cutoff.'
    if phase in (PHASE_GRACE, PHASE_ARCHIVED) and marks_period in FIRST_HALF_PERIODS:
        return f'{PERIOD_LABELS.get(marks_period, marks_period)} are locked.'
    return 'Marks are locked for this assessment.'


def exam_edit_status(exam, user, student_id=None) -> dict:
    """Return editability info for an exam (optionally per student)."""
    from examinations.models import MarksEditPermission

    period = resolve_marks_period(exam.exam_type)
    phase = get_semester_phase(exam.semester)
    naturally_editable = is_period_naturally_editable(period, phase)

    result = {
        'exam_id': exam.exam_id,
        'exam_name': exam.exam_name,
        'marks_period': period,
        'semester_phase': phase,
        'mid_term_cutoff': str(get_mid_term_cutoff(exam.semester)),
        'grace_end': str(get_grace_end(exam.semester)),
        'naturally_editable': naturally_editable,
        'editable': naturally_editable,
        'lock_reason': '' if naturally_editable else get_lock_reason(period, phase),
    }

    if user and getattr(user, 'user_type', None) == 'admin':
        result['editable'] = True
        result['lock_reason'] = ''
        return result

    if naturally_editable:
        return result

    if student_id and user:
        faculty = getattr(user, 'faculty_profile', None)
        if faculty:
            approved = MarksEditPermission.objects.filter(
                section=exam.section,
                student_id=student_id,
                examination=exam,
                granted_to=faculty,
                request_status='approved',
                is_active=True,
                expires_at__gt=timezone.now(),
            ).exists()
            if approved:
                result['editable'] = True
                result['lock_reason'] = ''
                result['admin_override'] = True

    return result


def can_edit_exam_marks(exam, user, student_id) -> tuple[bool, str]:
    if not user or not user.is_authenticated:
        return False, 'Authentication required.'
    if user.user_type == 'admin':
        return True, ''

    if user.user_type == 'teacher':
        faculty = getattr(user, 'faculty_profile', None)
        if not faculty or exam.section.faculty_id != faculty.faculty_id:
            return False, 'You can only edit marks for your own sections.'

    status = exam_edit_status(exam, user, student_id=student_id)
    if status['editable']:
        return True, ''
    return False, status['lock_reason']
