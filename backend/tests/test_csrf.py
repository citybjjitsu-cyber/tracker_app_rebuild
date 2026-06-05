from app.auth.csrf import validate_csrf_token


class MockRequest:
    def __init__(self, headers=None):
        self.headers = headers or {}


def test_validate_csrf_token_with_matching_values():
    request = MockRequest(headers={"X-CSRF-Token": "abc123"})
    assert validate_csrf_token(request, "abc123") is True


def test_validate_csrf_token_no_header():
    request = MockRequest(headers={})
    assert validate_csrf_token(request, "abc123") is False


def test_validate_csrf_token_no_cookie():
    request = MockRequest(headers={"X-CSRF-Token": "abc123"})
    assert validate_csrf_token(request, "") is False


def test_validate_csrf_token_mismatched():
    request = MockRequest(headers={"X-CSRF-Token": "abc123"})
    assert validate_csrf_token(request, "xyz789") is False
