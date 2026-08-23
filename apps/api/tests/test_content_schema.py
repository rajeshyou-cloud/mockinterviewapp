import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

REPO_ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = REPO_ROOT / 'packages' / 'content' / 'schema' / 'question.schema.json'
QUESTION_PACK_PATHS = [
    REPO_ROOT / 'apps' / 'web' / 'data' / name
    for name in ('beginner.json', 'starter.json', 'expanded.json', 'generated.json')
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
