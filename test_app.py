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


def test_ai_generate_injects_contact_details():
    payload = {
        "name": "Contact Heavy",
        "details": {
            "amount_owed": 2500,
            "contact_methods": [
                {"method": "email", "value": "contact@example.com", "is_preferred": True},
                {"method": "phone", "value": "+1234567890", "label": "Mobile", "is_preferred": False},
            ],
            "preferred_contact": "email",
        },
    }
    resp = client.post("/ingestion/add-user", json=payload)
    assert resp.status_code == 200
    user_id = resp.json()["id"]

    resp = client.post(f"/strategies/{user_id}/ai-generate")
    assert resp.status_code == 200
    strategy = resp.json()
    assert strategy["timeline"], "Timeline should not be empty"

    first_col = strategy["timeline"][0]
    first_block = first_col["blocks"][0]
    assert first_block["block_type"] == "action"
    assert first_block["contact_method_detail"] == "contact@example.com"
    assert first_block["preferred_contact"] == "email"

    # Ensure decision block retains outputs
    decision_blocks = [
        block
        for column in strategy["timeline"]
        for block in column["blocks"]
        if block["block_type"] == "decision"
    ]
    assert decision_blocks, "Generated strategy should include a decision block"
    assert decision_blocks[0]["decision_outputs"], "Decision block must include outputs"
