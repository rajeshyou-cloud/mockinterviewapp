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
