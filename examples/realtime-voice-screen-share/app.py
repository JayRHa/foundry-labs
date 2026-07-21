"""Local token service and static host for the Realtime Screen Lab."""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import httpx
from azure.identity.aio import DefaultAzureCredential
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "web"
DOCS_ROOT = ROOT / "docs"
load_dotenv(ROOT / ".env")

AZURE_RESOURCE = os.getenv("AZURE_OPENAI_RESOURCE", "").strip()
AZURE_DEPLOYMENT = os.getenv("AZURE_OPENAI_REALTIME_DEPLOYMENT", "").strip()
AZURE_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "").strip()
VOICE = os.getenv("REALTIME_VOICE", "marin").strip() or "marin"
ALLOWED_ORIGINS = {
    value.strip().rstrip("/")
    for value in os.getenv(
        "APP_ALLOWED_ORIGINS",
        "http://127.0.0.1:8000,http://localhost:8000",
    ).split(",")
    if value.strip()
}

LOGGER = logging.getLogger("realtime-screen-lab")
credential = DefaultAzureCredential(exclude_interactive_browser_credential=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await credential.close()

app = FastAPI(
    title="Realtime Voice and Screen Share Lab",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
app.mount("/assets", StaticFiles(directory=WEB_ROOT), name="assets")
app.mount("/docs", StaticFiles(directory=DOCS_ROOT), name="example-docs")


def realtime_endpoint(resource: str) -> str:
    """Return the Azure OpenAI GA endpoint for a resource name."""
    normalized = resource.strip().lower()
    if not normalized or any(char not in "abcdefghijklmnopqrstuvwxyz0123456789-" for char in normalized):
        raise ValueError("AZURE_OPENAI_RESOURCE must contain only letters, numbers, and hyphens.")
    return f"https://{normalized}.openai.azure.com"


def session_config(deployment: str, voice: str) -> dict[str, Any]:
    """Build the server-owned Realtime session configuration."""
    return {
        "session": {
            "type": "realtime",
            "model": deployment,
            "instructions": (
                "You are Screen Guide, a concise technical voice assistant. "
                "Help the user understand the screen they explicitly share. "
                "Never claim to see a screen unless an image is present in the conversation. "
                "Describe only visible evidence, say when text is unreadable, and ask before making assumptions. "
                "Do not request secrets, passwords, tokens, personal data, or a broader screen share. "
                "Always answer in the language of the user's latest spoken question. "
                "When the user speaks German, answer in German; if the language changes, switch immediately. "
                "Use short spoken answers unless the user asks for detail."
            ),
            "reasoning": {"effort": "low"},
            "audio": {
                "input": {
                    "turn_detection": {
                        "type": "semantic_vad",
                        "eagerness": "auto",
                        "create_response": True,
                        "interrupt_response": True,
                    }
                },
                "output": {"voice": voice},
            },
        }
    }


def validate_origin(request: Request) -> None:
    """Keep the unauthenticated demo token endpoint bound to approved origins."""
    origin = request.headers.get("origin", "").rstrip("/")
    if origin and origin not in ALLOWED_ORIGINS:
        raise HTTPException(status_code=403, detail="Origin is not allowed.")


async def create_ephemeral_token() -> dict[str, Any]:
    """Create a short-lived client secret with Microsoft Entra ID."""
    if not AZURE_RESOURCE or not AZURE_DEPLOYMENT:
        raise HTTPException(
            status_code=503,
            detail="Set AZURE_OPENAI_RESOURCE and AZURE_OPENAI_REALTIME_DEPLOYMENT.",
        )

    try:
        base_url = realtime_endpoint(AZURE_RESOURCE)
        if AZURE_API_KEY:
            authorization_headers = {"api-key": AZURE_API_KEY}
        else:
            access_token = await credential.get_token("https://ai.azure.com/.default")
            authorization_headers = {"Authorization": f"Bearer {access_token.token}"}
        async with httpx.AsyncClient(timeout=30) as client:
            azure_response = await client.post(
                f"{base_url}/openai/v1/realtime/client_secrets",
                headers={
                    **authorization_headers,
                    "Content-Type": "application/json",
                },
                json=session_config(AZURE_DEPLOYMENT, VOICE),
            )
    except (httpx.HTTPError, ValueError) as exc:
        LOGGER.warning("Realtime token request could not be completed: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Azure Realtime token request failed.") from exc

    request_id = azure_response.headers.get("apim-request-id", "not-provided")
    if azure_response.status_code != 200:
        LOGGER.warning(
            "Azure Realtime token request failed status=%s request_id=%s",
            azure_response.status_code,
            request_id,
        )
        raise HTTPException(
            status_code=502,
            detail=f"Azure Realtime rejected the session. Request ID: {request_id}",
        )

    payload = azure_response.json()
    client_secret = payload.get("client_secret") if isinstance(payload, dict) else None
    token = payload.get("value") if isinstance(payload, dict) else None
    expires_at = payload.get("expires_at") if isinstance(payload, dict) else None
    if isinstance(client_secret, dict):
        token = token or client_secret.get("value")
        expires_at = expires_at or client_secret.get("expires_at")
    if not isinstance(token, str) or not token:
        LOGGER.warning("Azure response did not contain a client secret request_id=%s", request_id)
        raise HTTPException(status_code=502, detail="Azure did not return a client secret.")

    return {
        "token": token,
        "expires_at": expires_at,
        "endpoint": base_url,
        "deployment": AZURE_DEPLOYMENT,
        "voice": VOICE,
    }


@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    return FileResponse(WEB_ROOT / "index.html")


@app.get("/api/health")
async def health(response: Response) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store"
    return {
        "status": "ready" if AZURE_RESOURCE and AZURE_DEPLOYMENT else "configuration_required",
        "deployment": AZURE_DEPLOYMENT or None,
        "voice": VOICE,
        "preview_model": "2.1" in AZURE_DEPLOYMENT,
    }


@app.post("/api/realtime/token")
async def token(request: Request, response: Response) -> dict[str, Any]:
    validate_origin(request)
    response.headers["Cache-Control"] = "no-store, private"
    return await create_ephemeral_token()
