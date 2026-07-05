"""
Canonical curriculum data for FCIT computing programs (BSCS, BSSE, BSAI, BSIT).
Used by seed commands to create Course and ProgramCourse records.

Each course dict: course_code, course_name, course_type ('core' or 'elective'),
credit_hours, theory_credit_hours, lab_credit_hours.
"""

DEPARTMENT_CODE = 'FCIT'


def _c(code, name, course_type, credit_hours, theory, lab):
    return {
        'course_code': code,
        'course_name': name,
        'course_type': course_type,
        'credit_hours': credit_hours,
        'theory_credit_hours': theory,
        'lab_credit_hours': lab,
    }


PROGRAM_CURRICULA = {
    'BSCS': {
        1: [
            _c('CS101', 'Programming Fundamentals', 'core', 4, 3, 1),
            _c('CS103', 'Introduction to Information & Communication Technology', 'core', 3, 2, 1),
            _c('MTH101', 'Calculus and Analytical Geometry', 'core', 3, 3, 0),
            _c('ENG101', 'Functional English', 'core', 3, 3, 0),
            _c('ISL101', 'Islamic Studies / Ethics', 'core', 2, 2, 0),
        ],
        2: [
            _c('CS104', 'Object Oriented Programming', 'core', 4, 3, 1),
            _c('CS105', 'Digital Logic Design', 'core', 4, 3, 1),
            _c('MTH102', 'Linear Algebra', 'core', 3, 3, 0),
            _c('ENG102', 'Communication & Presentation Skills', 'core', 3, 3, 0),
            _c('PAK101', 'Pakistan Studies', 'core', 2, 2, 0),
        ],
        3: [
            _c('CS201', 'Data Structures & Algorithms', 'core', 4, 3, 1),
            _c('CS202', 'Computer Organization & Assembly Language', 'core', 4, 3, 1),
            _c('MTH201', 'Discrete Structures', 'core', 3, 3, 0),
            _c('MTH202', 'Probability & Statistics', 'core', 3, 3, 0),
            _c('HUM201', 'Civics & Community Engagement', 'core', 2, 2, 0),
        ],
        4: [
            _c('CS203', 'Database Systems', 'core', 4, 3, 1),
            _c('CS204', 'Operating Systems', 'core', 4, 3, 1),
            _c('CS205', 'Design & Analysis of Algorithms', 'core', 3, 3, 0),
            _c('MTH203', 'Differential Equations', 'core', 3, 3, 0),
            _c('HUM202', 'Technical & Business Writing', 'core', 3, 3, 0),
        ],
        5: [
            _c('CS301', 'Computer Networks', 'core', 4, 3, 1),
            _c('CS302', 'Software Engineering', 'core', 3, 3, 0),
            _c('CS303', 'Theory of Automata', 'core', 3, 3, 0),
            _c('CS304', 'Human Computer Interaction', 'core', 3, 3, 0),
            _c('MGT301', 'Entrepreneurship', 'core', 3, 3, 0),
        ],
        6: [
            _c('CS305', 'Artificial Intelligence', 'core', 3, 3, 0),
            _c('CS306', 'Web Engineering', 'core', 4, 3, 1),
            _c('CS307', 'Compiler Construction', 'core', 3, 3, 0),
            _c('CS308', 'Information Security', 'core', 3, 3, 0),
            _c('CS3E1', 'Computing Elective I', 'elective', 3, 3, 0),
        ],
        7: [
            _c('CS401', 'Final Year Project I', 'core', 3, 0, 3),
            _c('CS402', 'Parallel & Distributed Computing', 'core', 3, 3, 0),
            _c('CS4E1', 'Computing Elective II', 'elective', 3, 3, 0),
            _c('CS4E2', 'Computing Elective III', 'elective', 3, 3, 0),
            _c('MGT401', 'Professional Practices', 'core', 2, 2, 0),
        ],
        8: [
            _c('CS403', 'Final Year Project II', 'core', 3, 0, 3),
            _c('CS4E3', 'Computing Elective IV', 'elective', 3, 3, 0),
            _c('CS4E4', 'Computing Elective V', 'elective', 3, 3, 0),
            _c('MGT402', 'Innovation & Entrepreneurship', 'core', 3, 3, 0),
        ],
    },
    'BSSE': {
        1: [
            _c('CS101', 'Programming Fundamentals', 'core', 4, 3, 1),
            _c('ICT101', 'Introduction to Information & Communication Technology', 'core', 3, 2, 1),
            _c('MTH101', 'Calculus and Analytical Geometry', 'core', 3, 3, 0),
            _c('ENG101', 'Functional English', 'core', 3, 3, 0),
            _c('ISL101', 'Islamic Studies / Ethics', 'core', 2, 2, 0),
        ],
        2: [
            _c('CS102', 'Object Oriented Programming', 'core', 4, 3, 1),
            _c('SE201', 'Introduction to Software Engineering', 'core', 3, 3, 0),
            _c('MTH102', 'Linear Algebra', 'core', 3, 3, 0),
            _c('ENG102', 'Communication & Presentation Skills', 'core', 3, 3, 0),
            _c('PAK101', 'Pakistan Studies', 'core', 2, 2, 0),
        ],
        3: [
            _c('CS201', 'Data Structures & Algorithms', 'core', 4, 3, 1),
            _c('SE301', 'Software Requirements Engineering', 'core', 3, 3, 0),
            _c('MTH201', 'Discrete Structures', 'core', 3, 3, 0),
            _c('MTH202', 'Probability & Statistics', 'core', 3, 3, 0),
            _c('HUM201', 'Civics & Community Engagement', 'core', 2, 2, 0),
        ],
        4: [
            _c('SE302', 'Software Design & Architecture', 'core', 3, 3, 0),
            _c('CS202', 'Database Systems', 'core', 4, 3, 1),
            _c('CS203', 'Operating Systems', 'core', 4, 3, 1),
            _c('SE303', 'Software Construction', 'core', 4, 3, 1),
        ],
        5: [
            _c('SE401', 'Software Quality Engineering', 'core', 3, 3, 0),
            _c('SE402', 'Software Project Management', 'core', 3, 3, 0),
            _c('CS301', 'Computer Networks', 'core', 4, 3, 1),
            _c('CS302', 'Human Computer Interaction', 'core', 3, 3, 0),
            _c('MGT301', 'Entrepreneurship', 'core', 3, 3, 0),
        ],
        6: [
            _c('SE501', 'Software Testing & Verification', 'core', 3, 3, 0),
            _c('SE502', 'DevOps & Configuration Management', 'core', 3, 2, 1),
            _c('CS303', 'Information Security', 'core', 3, 3, 0),
            _c('CS304', 'Web Engineering', 'core', 4, 3, 1),
            _c('SE5E1', 'Software Engineering Elective I', 'elective', 3, 3, 0),
        ],
        7: [
            _c('SE601', 'Final Year Project I', 'core', 3, 0, 3),
            _c('SE602', 'Software Process Improvement', 'core', 3, 3, 0),
            _c('SE6E1', 'Software Engineering Elective II', 'elective', 3, 3, 0),
            _c('SE6E2', 'Software Engineering Elective III', 'elective', 3, 3, 0),
            _c('MGT401', 'Professional Practices', 'core', 2, 2, 0),
        ],
        8: [
            _c('SE603', 'Final Year Project II', 'core', 3, 0, 3),
            _c('SE6E3', 'Software Engineering Elective IV', 'elective', 3, 3, 0),
            _c('SE6E4', 'Software Engineering Elective V', 'elective', 3, 3, 0),
            _c('MGT402', 'Innovation & Entrepreneurship', 'core', 3, 3, 0),
        ],
    },
    'BSAI': {
        1: [
            _c('CS101', 'Programming Fundamentals', 'core', 4, 3, 1),
            _c('ICT101', 'Introduction to Information & Communication Technology', 'core', 3, 2, 1),
            _c('MTH101', 'Calculus and Analytical Geometry', 'core', 3, 3, 0),
            _c('ENG101', 'Functional English', 'core', 3, 3, 0),
            _c('ISL101', 'Islamic Studies / Ethics', 'core', 2, 2, 0),
        ],
        2: [
            _c('CS102', 'Object Oriented Programming', 'core', 4, 3, 1),
            _c('MTH102', 'Linear Algebra', 'core', 3, 3, 0),
            _c('MTH103', 'Probability & Statistics', 'core', 3, 3, 0),
            _c('ENG102', 'Communication & Presentation Skills', 'core', 3, 3, 0),
            _c('PAK101', 'Pakistan Studies', 'core', 2, 2, 0),
        ],
        3: [
            _c('CS201', 'Data Structures & Algorithms', 'core', 4, 3, 1),
            _c('AI201', 'Introduction to Artificial Intelligence', 'core', 3, 3, 0),
            _c('MTH201', 'Discrete Structures', 'core', 3, 3, 0),
            _c('MTH202', 'Multivariable Calculus', 'core', 3, 3, 0),
            _c('HUM201', 'Civics & Community Engagement', 'core', 2, 2, 0),
        ],
        4: [
            _c('AI202', 'Machine Learning', 'core', 4, 3, 1),
            _c('CS202', 'Database Systems', 'core', 4, 3, 1),
            _c('CS203', 'Operating Systems', 'core', 4, 3, 1),
            _c('AI203', 'Knowledge Representation & Reasoning', 'core', 3, 3, 0),
        ],
        5: [
            _c('AI301', 'Deep Learning', 'core', 4, 3, 1),
            _c('AI302', 'Computer Vision', 'core', 4, 3, 1),
            _c('CS301', 'Computer Networks', 'core', 4, 3, 1),
            _c('MGT301', 'Entrepreneurship', 'core', 3, 3, 0),
        ],
        6: [
            _c('AI303', 'Natural Language Processing', 'core', 4, 3, 1),
            _c('AI304', 'Data Mining', 'core', 3, 3, 0),
            _c('AI305', 'Reinforcement Learning', 'core', 3, 3, 0),
            _c('AI3E1', 'Artificial Intelligence Elective I', 'elective', 3, 3, 0),
        ],
        7: [
            _c('AI401', 'Final Year Project I', 'core', 3, 0, 3),
            _c('AI402', 'Intelligent Systems', 'core', 3, 3, 0),
            _c('AI4E1', 'Artificial Intelligence Elective II', 'elective', 3, 3, 0),
            _c('AI4E2', 'Artificial Intelligence Elective III', 'elective', 3, 3, 0),
            _c('MGT401', 'Professional Practices', 'core', 2, 2, 0),
        ],
        8: [
            _c('AI403', 'Final Year Project II', 'core', 3, 0, 3),
            _c('AI4E3', 'Artificial Intelligence Elective IV', 'elective', 3, 3, 0),
            _c('AI4E4', 'Artificial Intelligence Elective V', 'elective', 3, 3, 0),
            _c('MGT402', 'Innovation & Entrepreneurship', 'core', 3, 3, 0),
        ],
    },
    'BSIT': {
        1: [
            _c('CS101', 'Programming Fundamentals', 'core', 4, 3, 1),
            _c('ICT101', 'Introduction to Information & Communication Technology', 'core', 3, 2, 1),
            _c('MTH101', 'Calculus and Analytical Geometry', 'core', 3, 3, 0),
            _c('ENG101', 'Functional English', 'core', 3, 3, 0),
            _c('ISL101', 'Islamic Studies / Ethics', 'core', 2, 2, 0),
        ],
        2: [
            _c('CS102', 'Object Oriented Programming', 'core', 4, 3, 1),
            _c('IT201', 'Web Technologies', 'core', 4, 3, 1),
            _c('MTH102', 'Linear Algebra', 'core', 3, 3, 0),
            _c('ENG102', 'Communication & Presentation Skills', 'core', 3, 3, 0),
            _c('PAK101', 'Pakistan Studies', 'core', 2, 2, 0),
        ],
        3: [
            _c('CS201', 'Data Structures & Algorithms', 'core', 4, 3, 1),
            _c('IT301', 'Database Systems', 'core', 4, 3, 1),
            _c('MTH201', 'Discrete Structures', 'core', 3, 3, 0),
            _c('MTH202', 'Probability & Statistics', 'core', 3, 3, 0),
            _c('HUM201', 'Civics & Community Engagement', 'core', 2, 2, 0),
        ],
        4: [
            _c('IT302', 'Operating Systems', 'core', 4, 3, 1),
            _c('IT303', 'Computer Networks', 'core', 4, 3, 1),
            _c('IT304', 'Human Computer Interaction', 'core', 3, 3, 0),
            _c('IT305', 'Software Engineering', 'core', 3, 3, 0),
        ],
        5: [
            _c('IT401', 'Information Security', 'core', 3, 3, 0),
            _c('IT402', 'System Administration', 'core', 4, 3, 1),
            _c('IT403', 'Cloud Computing', 'core', 3, 3, 0),
            _c('IT404', 'Enterprise Systems', 'core', 3, 3, 0),
            _c('MGT301', 'Entrepreneurship', 'core', 3, 3, 0),
        ],
        6: [
            _c('IT501', 'Mobile Application Development', 'core', 4, 3, 1),
            _c('IT502', 'Data Warehousing & Business Intelligence', 'core', 3, 3, 0),
            _c('IT503', 'Information Assurance', 'core', 3, 3, 0),
            _c('IT5E1', 'Information Technology Elective I', 'elective', 3, 3, 0),
        ],
        7: [
            _c('IT601', 'Final Year Project I', 'core', 3, 0, 3),
            _c('IT602', 'IT Project Management', 'core', 3, 3, 0),
            _c('IT6E1', 'Information Technology Elective II', 'elective', 3, 3, 0),
            _c('IT6E2', 'Information Technology Elective III', 'elective', 3, 3, 0),
            _c('MGT401', 'Professional Practices', 'core', 2, 2, 0),
        ],
        8: [
            _c('IT603', 'Final Year Project II', 'core', 3, 0, 3),
            _c('IT6E3', 'Information Technology Elective IV', 'elective', 3, 3, 0),
            _c('IT6E4', 'Information Technology Elective V', 'elective', 3, 3, 0),
            _c('MGT402', 'Innovation & Entrepreneurship', 'core', 3, 3, 0),
        ],
    },
}
