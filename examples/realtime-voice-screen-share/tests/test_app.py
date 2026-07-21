import importlib.util
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


MODULE_PATH = Path(__file__).resolve().parents[1] / "app.py"
SPEC = importlib.util.spec_from_file_location("realtime_screen_app", MODULE_PATH)
app_module = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(app_module)


def test_realtime_endpoint_accepts_resource_name():
    assert (
        app_module.realtime_endpoint("PackageFlow-AI")
        == "https://packageflow-ai.openai.azure.com"
    )


@pytest.mark.parametrize("value", ["", "https://example.com", "space name", "name/path"])
def test_realtime_endpoint_rejects_unsafe_values(value):
    with pytest.raises(ValueError):
        app_module.realtime_endpoint(value)


def test_session_config_keeps_sensitive_instructions_on_server():
    config = app_module.session_config("realtime-deployment", "marin")
    session = config["session"]

    assert session["type"] == "realtime"
    assert session["model"] == "realtime-deployment"
    assert session["audio"]["output"]["voice"] == "marin"
    assert session["audio"]["input"]["turn_detection"]["interrupt_response"] is True
    assert session["reasoning"]["effort"] == "low"
    assert "api_key" not in config
    assert "access_token" not in config
    assert "client_secret" not in config


def test_health_does_not_return_credentials():
    client = TestClient(app_module.app)
    response = client.get("/api/health")

    assert response.status_code == 200
    assert "token" not in response.text.lower()
    assert "api-key" not in response.text.lower()


def test_browser_e2e_fixture_is_served():
    client = TestClient(app_module.app)
    response = client.get("/docs/realtime-screen-lab-hero.png")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert len(response.content) > 1_000


def test_token_endpoint_rejects_unapproved_origin():
    client = TestClient(app_module.app)
    response = client.post(
        "/api/realtime/token",
        headers={"Origin": "https://untrusted.example"},
    )

    assert response.status_code == 403
