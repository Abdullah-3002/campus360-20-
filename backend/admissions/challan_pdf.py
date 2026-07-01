"""
Generate admission fee challan PDF with applicant and program details.
"""
from __future__ import annotations

import io
from decimal import Decimal
from datetime import date


UNIVERSITY_NAME = 'Campus360 University'
UNIVERSITY_TAGLINE = 'Excellence in Education'
BANK_NAME = 'Allied Bank Limited — Campus Branch'
BANK_ACCOUNT = 'Campus360 Admissions Account'


def _fmt_amount(amount) -> str:
    val = Decimal(str(amount))
    return f'Rs. {val:,.2f}'


def build_challan_payload(application, applicant) -> dict:
    program = application.program
    issue = application.submitted_at.date() if application.submitted_at else date.today()
    from datetime import timedelta
    due = issue + timedelta(days=14)
    amount = application.admission_challan_amount or program.fee_per_semester or Decimal('0')

    return {
        'university_name': UNIVERSITY_NAME,
        'university_tagline': UNIVERSITY_TAGLINE,
        'bank_name': BANK_NAME,
        'bank_account': BANK_ACCOUNT,
        'challan_number': application.admission_challan_number,
        'application_number': application.application_number,
        'applicant_name': f'{applicant.first_name} {applicant.last_name}'.strip(),
        'father_name': applicant.father_name or '—',
        'cnic': applicant.cnic or '—',
        'phone': applicant.phone or '—',
        'email': applicant.user.email if applicant.user_id else '—',
        'program_name': program.program_name,
        'program_code': program.program_code,
        'department_name': program.department.department_name if program.department_id else '—',
        'degree_level': program.degree_level,
        'fee_label': 'Admission / First Semester Fee',
        'amount': amount,
        'amount_display': _fmt_amount(amount),
        'issue_date': issue.isoformat(),
        'due_date': due.isoformat(),
        'instructions': [
            'Pay this amount at any designated bank branch using this challan.',
            'Keep the bank-stamped paid copy safe.',
            'Upload a clear photo of the paid challan in your applicant portal.',
            'Ensure challan number, amount, and bank stamp are visible in the upload.',
        ],
    }


def generate_challan_pdf(payload: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'ChallanTitle', parent=styles['Heading1'],
        fontSize=16, textColor=colors.HexColor('#1e3a8a'),
        spaceAfter=4, alignment=1,
    )
    sub_style = ParagraphStyle(
        'ChallanSub', parent=styles['Normal'],
        fontSize=10, textColor=colors.grey, alignment=1, spaceAfter=12,
    )
    section_style = ParagraphStyle(
        'Section', parent=styles['Heading2'],
        fontSize=11, textColor=colors.HexColor('#1e40af'), spaceBefore=8, spaceAfter=6,
    )
    normal = styles['Normal']

    story = [
        Paragraph(payload['university_name'], title_style),
        Paragraph(payload['university_tagline'], sub_style),
        Paragraph('<b>ADMISSION FEE CHALLAN</b>', ParagraphStyle(
            'Banner', parent=normal, fontSize=13, alignment=1,
            backColor=colors.HexColor('#eff6ff'), borderPadding=8, spaceAfter=14,
        )),
    ]

    meta_rows = [
        ['Challan No.', payload['challan_number'], 'Application No.', payload['application_number']],
        ['Issue Date', payload['issue_date'], 'Due Date', payload['due_date']],
        ['Bank', payload['bank_name'], 'Account', payload['bank_account']],
    ]
    meta_table = Table(meta_rows, colWidths=[32 * mm, 58 * mm, 32 * mm, 58 * mm])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e2e8f0')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph('Applicant Details', section_style))
    applicant_rows = [
        ['Full Name', payload['applicant_name'], 'Father Name', payload['father_name']],
        ['CNIC', payload['cnic'], 'Phone', payload['phone']],
        ['Email', payload['email'], 'Program Code', payload['program_code']],
        ['Program', payload['program_name'], 'Department', payload['department_name']],
        ['Degree Level', payload['degree_level'], 'Fee Type', payload['fee_label']],
    ]
    app_table = Table(applicant_rows, colWidths=[32 * mm, 58 * mm, 32 * mm, 58 * mm])
    app_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e2e8f0')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(app_table)
    story.append(Spacer(1, 14))

    amount_table = Table(
        [['Amount Payable', payload['amount_display']]],
        colWidths=[180 * mm],
    )
    amount_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (0, 0), 14),
        ('FONTSIZE', (0, 1), (-1, -1), 18),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(amount_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph('Instructions', section_style))
    for line in payload['instructions']:
        story.append(Paragraph(f'• {line}', normal))

    story.append(Spacer(1, 16))
    sig_table = Table([
        ['Bank Stamp & Signature', 'Applicant Signature', 'Accounts Office'],
        ['', '', ''],
    ], colWidths=[60 * mm, 60 * mm, 60 * mm], rowHeights=[12 * mm, 22 * mm])
    sig_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94a3b8')),
        ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#cbd5e1')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
    ]))
    story.append(sig_table)

    doc.build(story)
    return buffer.getvalue()
