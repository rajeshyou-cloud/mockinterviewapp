from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_score_endpoint_returns_explainable_result():
    response = client.post(
        '/v1/score',
        json={
            'answer': 'A virtual warehouse provides compute and helps isolate workloads.',
            'expected_concepts': ['virtual warehouse', 'compute', 'isolation'],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body['score'] >= 60
    assert 'compute' in body['matched_concepts']
    assert isinstance(body['missing_concepts'], list)


def test_questions_endpoint_filters_by_technology_and_difficulty():
    response = client.get('/v1/questions?technology=snowflake&difficulty=advanced')
    assert response.status_code == 200

    questions = response.json()
    assert questions
    assert all(question['technology'] == 'snowflake' for question in questions)
    assert all(question['difficulty'] == 'advanced' for question in questions)


def test_questions_endpoint_returns_stable_bounded_session_sample():
    path = '/v1/questions?technology=snowflake&difficulty=intermediate&seed=session-123&limit=10'
    first = client.get(path)
    second = client.get(path)

    assert first.status_code == 200
    assert first.json() == second.json()
    assert len(first.json()) == 10
    assert len({question['id'] for question in first.json()}) == 10


def test_question_content_has_review_and_source_metadata():
    response = client.get('/v1/questions?technology=informatica')
    assert response.status_code == 200

    questions = response.json()
    assert questions
    for question in questions:
        assert question['id']
        assert question['canonicalAnswer']
        assert question['expectedConcepts']
        assert question['followUps']
        assert question['reviewStatus'] == 'ai-reviewed'
        assert question['source']['url'].startswith('https://')
        assert question['source']['verified']
