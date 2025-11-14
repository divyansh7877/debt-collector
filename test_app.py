from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_root():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["message"].startswith("Collections strategy backend")


def test_add_user_and_list():
    # Create a user
    payload = {"name": "Alice", "details": {"amount_owed": 500, "due_date": "2025-11-20"}}
    resp = client.post("/ingestion/add-user", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    user_id = data["id"]

    # List entities
    resp = client.get("/users/")
    assert resp.status_code == 200
    entities = resp.json()
    assert any(e["id"] == user_id and e["type"] == "user" for e in entities)


def test_ai_generate_and_execute_strategy():
    # Create a simple user
    payload = {"name": "Bob", "details": {"amount_owed": 100, "due_date": "2025-11-20"}}
    resp = client.post("/ingestion/add-user", json=payload)
    assert resp.status_code == 200
    user_id = resp.json()["id"]

    # Generate AI strategy (will fall back to deterministic plan without API key)
    resp = client.post(f"/strategies/{user_id}/ai-generate")
    assert resp.status_code == 200
    strategy = resp.json()
    assert strategy["timeline"]

    # Execute strategy
    resp = client.post(f"/strategies/{user_id}/execute")
    assert resp.status_code == 200
    exec_data = resp.json()
    assert exec_data["executed"] is True
