import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

REPO_ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = REPO_ROOT / 'packages' / 'content' / 'schema' / 'question.schema.json'
QUESTION_PACK_PATH = REPO_ROOT / 'packages' / 'content' / 'questions' / 'starter.json'


def test_starter_question_pack_matches_shared_schema():
    schema = json.loads(SCHEMA_PATH.read_text(encoding='utf-8'))
    questions = json.loads(QUESTION_PACK_PATH.read_text(encoding='utf-8'))
    validator = Draft202012Validator(schema, format_checker=FormatChecker())

    assert questions, 'starter question pack must not be empty'

    errors = []
    for question in questions:
        for error in validator.iter_errors(question):
            errors.append(f"{question.get('id', '<missing-id>')}: {error.message}")

    assert not errors, '\n'.join(errors)
