# Python Testing Patterns

Referência completa de patterns para testes em Python com pytest, FastAPI, Flask e Django.

## Table of Contents
1. [Pytest Setup](#pytest-setup)
2. [Unit Tests — Funções e Classes](#unit-tests)
3. [Fixtures e Factories](#fixtures-e-factories)
4. [Parametrize](#parametrize)
5. [FastAPI Tests](#fastapi-tests)
6. [Flask Tests](#flask-tests)
7. [Django Tests](#django-tests)
8. [Async Patterns](#async-patterns)
9. [Mocking Patterns](#mocking-patterns)
10. [Database Testing](#database-testing)
11. [Pydantic Validation Tests](#pydantic-validation-tests)
12. [CLI Testing](#cli-testing)

---

## Pytest Setup

```ini
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
asyncio_mode = "auto"  # para pytest-asyncio
addopts = "-v --tb=short --strict-markers"
markers = [
    "slow: testes lentos (ex: integração com DB real)",
    "integration: testes de integração",
    "e2e: testes end-to-end",
]

[tool.coverage.run]
source = ["src"]
omit = ["tests/*", "*/migrations/*"]

[tool.coverage.report]
fail_under = 80
show_missing = true
```

```bash
# Dependências essenciais
pip install pytest pytest-cov pytest-asyncio pytest-mock httpx
# Para Django: pip install pytest-django
# Para Flask: pip install pytest-flask
```

### Estrutura de diretórios

```
project/
├── src/
│   ├── services/
│   ├── models/
│   └── api/
├── tests/
│   ├── conftest.py          # fixtures globais
│   ├── unit/
│   │   ├── conftest.py      # fixtures de unit
│   │   ├── test_pricing.py
│   │   └── test_validators.py
│   ├── integration/
│   │   ├── conftest.py
│   │   └── test_user_api.py
│   └── factories.py         # factories reutilizáveis
└── pyproject.toml
```

---

## Unit Tests

Lógica pura é o tipo de teste mais valioso. Sem mocks, sem IO, rápido.

```python
# src/services/pricing.py
from decimal import Decimal

def calculate_discount(amount: Decimal, threshold: Decimal = Decimal("100")) -> Decimal:
    if amount < 0:
        raise ValueError("Amount must be non-negative")
    if amount > threshold:
        return amount * Decimal("0.10")
    return Decimal("0")
```

```python
# tests/unit/test_pricing.py
from decimal import Decimal

import pytest
from src.services.pricing import calculate_discount


class TestCalculateDiscount:
    def test_applies_discount_above_threshold(self):
        result = calculate_discount(Decimal("150"))
        assert result == Decimal("15.0")

    def test_no_discount_at_or_below_threshold(self):
        assert calculate_discount(Decimal("100")) == Decimal("0")
        assert calculate_discount(Decimal("50")) == Decimal("0")

    def test_handles_zero(self):
        assert calculate_discount(Decimal("0")) == Decimal("0")

    def test_raises_for_negative_amount(self):
        with pytest.raises(ValueError, match="must be non-negative"):
            calculate_discount(Decimal("-10"))

    def test_custom_threshold(self):
        result = calculate_discount(Decimal("60"), threshold=Decimal("50"))
        assert result == Decimal("6.0")
```

### Classes com dependências

```python
# src/services/order.py
class OrderService:
    def __init__(self, repo, notifier):
        self.repo = repo
        self.notifier = notifier

    def place_order(self, user_id: str, items: list[dict]) -> dict:
        if not items:
            raise ValueError("Order must have at least one item")

        total = sum(item["price"] * item["quantity"] for item in items)
        order = self.repo.create(user_id=user_id, items=items, total=total)
        self.notifier.send(user_id, f"Pedido {order['id']} confirmado")
        return order
```

```python
# tests/unit/test_order_service.py
from unittest.mock import MagicMock

import pytest
from src.services.order import OrderService


@pytest.fixture
def mock_repo():
    repo = MagicMock()
    repo.create.return_value = {"id": "order-1", "total": 100}
    return repo


@pytest.fixture
def mock_notifier():
    return MagicMock()


@pytest.fixture
def service(mock_repo, mock_notifier):
    return OrderService(repo=mock_repo, notifier=mock_notifier)


class TestPlaceOrder:
    def test_creates_order_with_correct_total(self, service, mock_repo):
        items = [
            {"name": "Widget", "price": 25, "quantity": 2},
            {"name": "Gadget", "price": 50, "quantity": 1},
        ]
        service.place_order("user-1", items)

        mock_repo.create.assert_called_once_with(
            user_id="user-1", items=items, total=100
        )

    def test_sends_notification_after_order(self, service, mock_notifier):
        service.place_order("user-1", [{"name": "X", "price": 10, "quantity": 1}])
        mock_notifier.send.assert_called_once()

    def test_raises_for_empty_items(self, service):
        with pytest.raises(ValueError, match="at least one item"):
            service.place_order("user-1", [])
```

---

## Fixtures e Factories

Fixtures são o mecanismo central do pytest para setup/teardown.

```python
# tests/conftest.py
import pytest


@pytest.fixture
def sample_user():
    """Fixture simples — retorna dados."""
    return {
        "id": "user-1",
        "name": "Maria Silva",
        "email": "maria@example.com",
        "role": "user",
    }


@pytest.fixture
def admin_user(sample_user):
    """Fixture composta — reutiliza outra fixture."""
    return {**sample_user, "id": "admin-1", "role": "admin"}
```

### Factory Fixture (padrão recomendado para dados dinâmicos)

```python
# tests/factories.py
from dataclasses import dataclass, field
from datetime import datetime


_counter = 0


def _next_id() -> str:
    global _counter
    _counter += 1
    return f"id-{_counter}"


@dataclass
class UserFactory:
    id: str = field(default_factory=_next_id)
    name: str = "User Test"
    email: str = ""
    role: str = "user"
    created_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        if not self.email:
            self.email = f"{self.id}@test.com"

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat(),
        }


# tests/conftest.py
@pytest.fixture
def create_user():
    """Factory fixture — retorna uma função para criar usuários."""
    def _create(**overrides):
        return UserFactory(**overrides).as_dict()
    return _create


# Uso em testes:
# def test_admin_access(create_user):
#     admin = create_user(role="admin")
#     regular = create_user(role="user")
```

### Fixture com yield (setup + teardown)

```python
@pytest.fixture
def temp_file(tmp_path):
    """Cria arquivo temporário e limpa após o teste."""
    file = tmp_path / "test_data.json"
    file.write_text('{"key": "value"}')
    yield file
    # cleanup automático — tmp_path já limpa, mas para recursos custom:
    # file.unlink(missing_ok=True)
```

### Fixture scopes

```python
@pytest.fixture(scope="session")
def db_engine():
    """Uma engine por sessão inteira de testes — rápido."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")  # default
def db_session(db_engine):
    """Uma session por teste — isolamento total."""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()
```

---

## Parametrize

Evite duplicar testes para inputs diferentes. Use `parametrize`.

```python
import pytest
from src.validators import validate_cpf, validate_email


@pytest.mark.parametrize(
    "cpf, expected",
    [
        ("529.982.247-25", True),    # válido com máscara
        ("52998224725", True),        # válido sem máscara
        ("000.000.000-00", False),    # todos iguais
        ("123.456.789-00", False),    # dígitos inválidos
        ("123", False),               # curto demais
        ("", False),                  # vazio
    ],
    ids=["masked_valid", "unmasked_valid", "all_same", "invalid_digits", "too_short", "empty"],
)
def test_validate_cpf(cpf: str, expected: bool):
    assert validate_cpf(cpf) == expected


@pytest.mark.parametrize(
    "email, is_valid",
    [
        ("user@example.com", True),
        ("user+tag@domain.co", True),
        ("missing-at-sign.com", False),
        ("@no-local.com", False),
        ("", False),
    ],
)
def test_validate_email(email: str, is_valid: bool):
    assert validate_email(email) == is_valid
```

### Parametrize com múltiplos parâmetros

```python
@pytest.mark.parametrize("amount, threshold, expected", [
    (150, 100, 15),
    (100, 100, 0),
    (200, 50, 20),
])
def test_discount_with_thresholds(amount, threshold, expected):
    assert calculate_discount(amount, threshold=threshold) == expected
```

---

## FastAPI Tests

Use `httpx.AsyncClient` para testes async ou `TestClient` para sync.

### Setup

```python
# tests/conftest.py
import pytest
from httpx import ASGITransport, AsyncClient
from src.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

### CRUD Tests

```python
# tests/integration/test_user_api.py
import pytest


class TestCreateUser:
    async def test_create_with_valid_data(self, client):
        response = await client.post("/api/users", json={
            "name": "Ana",
            "email": "ana@test.com",
        })

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Ana"
        assert "id" in data

    async def test_returns_422_for_missing_fields(self, client):
        response = await client.post("/api/users", json={"name": "Ana"})
        assert response.status_code == 422

    async def test_returns_409_for_duplicate_email(self, client):
        payload = {"name": "Ana", "email": "ana@test.com"}
        await client.post("/api/users", json=payload)

        response = await client.post("/api/users", json=payload)
        assert response.status_code == 409

    async def test_sanitizes_xss_in_name(self, client):
        response = await client.post("/api/users", json={
            "name": '<script>alert("xss")</script>',
            "email": "xss@test.com",
        })
        assert "<script>" not in response.json().get("name", "")


class TestListUsers:
    async def test_returns_paginated_list(self, client):
        # seed users
        for i in range(15):
            await client.post("/api/users", json={
                "name": f"User {i}",
                "email": f"user{i}@test.com",
            })

        response = await client.get("/api/users?page=1&size=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 10
        assert data["total"] >= 15
```

### Authentication Tests

```python
class TestProtectedRoutes:
    async def test_returns_401_without_token(self, client):
        response = await client.get("/api/profile")
        assert response.status_code == 401

    async def test_returns_401_with_expired_token(self, client, expired_token):
        response = await client.get(
            "/api/profile",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401

    async def test_returns_403_for_insufficient_permissions(self, client, user_token):
        response = await client.delete(
            "/api/admin/users/123",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 403
```

### Dependency Override (padrão central do FastAPI)

```python
from src.main import app
from src.dependencies import get_db


@pytest.fixture
async def client(db_session):
    """Substitui a dependência de DB por uma session de teste."""
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

---

## Flask Tests

```python
# tests/conftest.py
import pytest
from src.app import create_app


@pytest.fixture
def app():
    app = create_app(testing=True)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    """Faz login e retorna headers com token."""
    response = client.post("/api/login", json={
        "email": "admin@test.com",
        "password": "password",
    })
    token = response.json["token"]
    return {"Authorization": f"Bearer {token}"}
```

```python
# tests/integration/test_flask_products.py
class TestProductsAPI:
    def test_create_product(self, client, auth_headers):
        response = client.post(
            "/api/products",
            json={"name": "Widget", "price": 29.99},
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json["name"] == "Widget"

    def test_list_products(self, client, auth_headers):
        response = client.get("/api/products", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json, list)

    def test_unauthenticated_access(self, client):
        response = client.get("/api/products")
        assert response.status_code == 401
```

---

## Django Tests

```python
# tests/conftest.py (com pytest-django)
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="maria",
        email="maria@test.com",
        password="Str0ng!Pass",
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        username="admin",
        email="admin@test.com",
        password="AdminPass!",
    )


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client
```

```python
# tests/integration/test_django_views.py
import pytest
from django.urls import reverse


@pytest.mark.django_db
class TestUserRegistration:
    def test_register_with_valid_data(self, api_client):
        url = reverse("user-register")
        response = api_client.post(url, {
            "username": "newuser",
            "email": "new@test.com",
            "password": "Str0ng!Pass",
        })
        assert response.status_code == 201
        assert User.objects.filter(email="new@test.com").exists()

    def test_register_duplicate_email(self, api_client, user):
        url = reverse("user-register")
        response = api_client.post(url, {
            "username": "other",
            "email": user.email,
            "password": "Str0ng!Pass",
        })
        assert response.status_code == 400

    def test_admin_only_endpoint(self, authenticated_client):
        url = reverse("admin-dashboard")
        response = authenticated_client.get(url)
        assert response.status_code == 403  # regular user, not admin


@pytest.mark.django_db
class TestProductModel:
    def test_str_representation(self):
        from products.models import Product
        product = Product.objects.create(name="Widget", price=29.99)
        assert str(product) == "Widget"

    def test_slug_auto_generated(self):
        from products.models import Product
        product = Product.objects.create(name="My Cool Widget", price=10)
        assert product.slug == "my-cool-widget"
```

---

## Async Patterns

```python
# pytest-asyncio com asyncio_mode = "auto" no pyproject.toml

async def test_fetch_user_returns_data(mock_db):
    user = await fetch_user("user-1")
    assert user.name == "Maria"


async def test_fetch_user_raises_for_missing():
    with pytest.raises(UserNotFoundError):
        await fetch_user("nonexistent")


async def test_concurrent_operations():
    """Testar que operações concorrentes não causam race conditions."""
    import asyncio

    results = await asyncio.gather(
        create_order("user-1", [{"item": "A", "qty": 1}]),
        create_order("user-1", [{"item": "B", "qty": 1}]),
    )
    assert len(results) == 2
    assert results[0]["id"] != results[1]["id"]
```

### Timeout em testes async

```python
@pytest.mark.timeout(5)
async def test_external_api_call_completes():
    """Garante que não fica preso em promise infinita."""
    result = await call_external_api()
    assert result is not None
```

---

## Mocking Patterns

### unittest.mock (stdlib)

```python
from unittest.mock import patch, MagicMock, AsyncMock


class TestEmailService:
    @patch("src.services.email.smtp_client")
    def test_sends_email(self, mock_smtp):
        mock_smtp.send.return_value = {"status": "sent"}

        result = send_welcome_email("user@test.com")

        mock_smtp.send.assert_called_once_with(
            to="user@test.com",
            subject="Bem-vindo!",
        )
        assert result["status"] == "sent"

    @patch("src.services.email.smtp_client")
    def test_handles_smtp_failure(self, mock_smtp):
        mock_smtp.send.side_effect = ConnectionError("SMTP down")

        with pytest.raises(EmailDeliveryError):
            send_welcome_email("user@test.com")
```

### pytest-mock (fixture `mocker`)

```python
def test_payment_processing(mocker):
    mock_gateway = mocker.patch("src.services.payment.gateway")
    mock_gateway.charge.return_value = {"transaction_id": "txn-123", "success": True}

    result = process_payment(amount=1000, token="tok_test")

    mock_gateway.charge.assert_called_once_with(1000, "tok_test")
    assert result["success"] is True


def test_logs_on_failure(mocker):
    mock_logger = mocker.patch("src.services.payment.logger")
    mocker.patch(
        "src.services.payment.gateway.charge",
        side_effect=Exception("Gateway error"),
    )

    with pytest.raises(Exception):
        process_payment(amount=1000, token="tok_test")

    mock_logger.error.assert_called_once()
```

### Mocking async

```python
async def test_async_external_call(mocker):
    mock_fetch = mocker.patch(
        "src.services.external.fetch_data",
        new_callable=AsyncMock,
        return_value={"data": [1, 2, 3]},
    )

    result = await get_processed_data()

    mock_fetch.assert_awaited_once()
    assert result == [1, 2, 3]
```

### Mockar datetime

```python
from unittest.mock import patch
from datetime import datetime


def test_token_is_expired(mocker):
    fake_now = datetime(2025, 6, 15, 12, 0, 0)
    mocker.patch("src.auth.datetime")
    mocker.patch("src.auth.datetime.now", return_value=fake_now)

    token = create_token(expires_in_hours=1)
    # avançar 2 horas
    future = datetime(2025, 6, 15, 14, 0, 0)
    mocker.patch("src.auth.datetime.now", return_value=future)

    assert is_token_expired(token) is True
```

### freezegun (alternativa mais limpa para tempo)

```python
from freezegun import freeze_time


@freeze_time("2025-01-01 10:00:00")
def test_coupon_not_expired():
    coupon = create_coupon(expires_at="2025-12-31")
    assert coupon.is_valid() is True


@freeze_time("2026-01-01 10:00:00")
def test_coupon_expired():
    coupon = create_coupon(expires_at="2025-12-31")
    assert coupon.is_valid() is False
```

---

## Database Testing

### SQLAlchemy com rollback por teste

```python
# tests/conftest.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from src.database import Base


@pytest.fixture(scope="session")
def engine():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(engine) -> Session:
    """Cada teste roda em uma transaction que faz rollback no final."""
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()

    yield session

    session.close()
    transaction.rollback()
    connection.close()
```

### pytest-django

```python
@pytest.mark.django_db
def test_user_creation():
    user = User.objects.create_user(
        username="test", email="t@t.com", password="pass"
    )
    assert User.objects.count() == 1
    assert user.check_password("pass")


@pytest.mark.django_db(transaction=True)
def test_concurrent_unique_constraint():
    """transaction=True necessário para testar constraints reais."""
    from django.db import IntegrityError

    User.objects.create_user(username="taken", email="a@t.com", password="p")
    with pytest.raises(IntegrityError):
        User.objects.create_user(username="taken", email="b@t.com", password="p")
```

---

## Pydantic Validation Tests

Quando usar Pydantic para validação (comum em FastAPI), teste os models diretamente.

```python
import pytest
from pydantic import ValidationError
from src.schemas import CreateUserRequest


class TestCreateUserRequest:
    def test_valid_data(self):
        user = CreateUserRequest(
            name="Maria", email="maria@test.com", password="Str0ng!Pass"
        )
        assert user.name == "Maria"

    def test_rejects_invalid_email(self):
        with pytest.raises(ValidationError) as exc_info:
            CreateUserRequest(name="Maria", email="not-email", password="Str0ng!Pass")
        assert "email" in str(exc_info.value)

    def test_rejects_short_password(self):
        with pytest.raises(ValidationError):
            CreateUserRequest(name="Maria", email="m@t.com", password="123")

    def test_strips_whitespace_from_name(self):
        user = CreateUserRequest(
            name="  Maria  ", email="m@t.com", password="Str0ng!Pass"
        )
        assert user.name == "Maria"

    @pytest.mark.parametrize("bad_name", ["", "  ", None])
    def test_rejects_empty_name(self, bad_name):
        with pytest.raises(ValidationError):
            CreateUserRequest(name=bad_name, email="m@t.com", password="Str0ng!Pass")
```

---

## CLI Testing

### Click

```python
from click.testing import CliRunner
from src.cli import main


class TestCLI:
    def test_default_output(self):
        runner = CliRunner()
        result = runner.invoke(main, ["--name", "Maria"])
        assert result.exit_code == 0
        assert "Maria" in result.output

    def test_missing_required_arg(self):
        runner = CliRunner()
        result = runner.invoke(main, [])
        assert result.exit_code != 0
        assert "Missing" in result.output or "Error" in result.output

    def test_file_input(self, tmp_path):
        data_file = tmp_path / "input.csv"
        data_file.write_text("name,age\nMaria,30\nAna,25")

        runner = CliRunner()
        result = runner.invoke(main, ["--input", str(data_file)])
        assert result.exit_code == 0
```

### Typer

```python
from typer.testing import CliRunner
from src.cli import app

runner = CliRunner()


def test_process_command():
    result = runner.invoke(app, ["process", "--format", "json"])
    assert result.exit_code == 0
    assert "Processado" in result.output
```