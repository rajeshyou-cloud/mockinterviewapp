import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

REPO_ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = REPO_ROOT / 'packages' / 'content' / 'schema' / 'question.schema.json'
QUESTION_PACK_PATHS = [
    REPO_ROOT / 'apps' / 'web' / 'data' / name
    for name in ('beginner.json', 'starter.json', 'expanded.json', 'generated.json')
]
CANDIDATE_PACK_PATHS = [
    REPO_ROOT / 'apps' / 'web' / 'data' / 'candidates' / name
    for name in ('aws.json', 'databricks.json', 'oracle.json', 'power-bi.json', 'python.json')
]


def test_question_packs_match_shared_schema():
    schema = json.loads(SCHEMA_PATH.read_text(encoding='utf-8'))
    questions = [
        question
        for path in QUESTION_PACK_PATHS
        for question in json.loads(path.read_text(encoding='utf-8'))
    ]
    validator = Draft202012Validator(schema, format_checker=FormatChecker())

    assert len(questions) == 300, 'reviewed question bank must contain exactly 300 questions'

    errors = []
    for question in questions:
        for error in validator.iter_errors(question):
            errors.append(f"{question.get('id', '<missing-id>')}: {error.message}")

    assert not errors, '\n'.join(errors)


def test_all_released_and_candidate_packs_have_benchmark_answers():
    schema = json.loads(SCHEMA_PATH.read_text(encoding='utf-8'))
    questions = [
        question
        for path in [*QUESTION_PACK_PATHS, *CANDIDATE_PACK_PATHS]
        for question in json.loads(path.read_text(encoding='utf-8'))
    ]
    validator = Draft202012Validator(schema, format_checker=FormatChecker())

    assert len(questions) == 1050, 'released and candidate packs must contain exactly 1,050 questions'

    errors = []
    for question in questions:
        for error in validator.iter_errors(question):
            errors.append(f"{question.get('id', '<missing-id>')}: {error.message}")
        benchmark = question['benchmark']
        assert benchmark['canonicalAnswer'] == question['canonicalAnswer']
        assert benchmark['requiredConcepts'] == question['expectedConcepts']
        review = benchmark['review']
        if review['status'] == 'ai-evidence-verified':
            assert len(review['reviewerModels']) >= 2
            assert review['reviewedAt'] is not None
        elif review['status'] == 'human-verified':
            assert review['reviewedAt'] is not None
        assert benchmark['evidence'][0]['url'] == question['source']['url']

    assert not errors, '\n'.join(errors)
