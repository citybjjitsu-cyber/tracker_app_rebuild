from datetime import date

from app.timezone import get_request_timezone, local_today


def test_request_timezone_prefers_site_configuration(client, monkeypatch):
    monkeypatch.setenv("SITE_TIMEZONE", "Pacific/Auckland")

    response = client.get("/health")

    assert response.status_code == 200
    assert get_request_timezone() == "Pacific/Auckland"


def test_request_timezone_falls_back_to_valid_browser_timezone(client, monkeypatch):
    monkeypatch.delenv("SITE_TIMEZONE", raising=False)

    response = client.get("/health", headers={"X-Client-Timezone": "Pacific/Auckland"})

    assert response.status_code == 200
    assert get_request_timezone(response.request) == "Pacific/Auckland"


def test_invalid_browser_timezone_falls_back_to_utc(client, monkeypatch):
    monkeypatch.delenv("SITE_TIMEZONE", raising=False)

    response = client.get("/health", headers={"X-Client-Timezone": "not-a-timezone"})

    assert response.status_code == 200
    assert get_request_timezone(response.request) == "UTC"
    assert isinstance(local_today(response.request), date)
