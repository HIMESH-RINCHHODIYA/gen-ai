import base64
import binascii
import json
import os
import re
from datetime import date
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, model_validator


class ImageEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=180)
    data_url: str = Field(min_length=30, max_length=7_000_000)

    @model_validator(mode="after")
    def validate_image(self):
        match = re.fullmatch(r"data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)", self.data_url)
        if not match:
            raise ValueError("Image must be a base64-encoded JPEG, PNG, or WebP data URL")
        try:
            base64.b64decode(match.group(2), validate=True)
        except (binascii.Error, ValueError) as error:
            raise ValueError("Image data is not valid base64") from error
        return self


class ValuationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    address: str = Field(min_length=5, max_length=200)
    property_type: Literal["single_family", "condo", "townhouse", "multifamily"]
    bedrooms: int = Field(ge=0, le=30)
    bathrooms: float = Field(ge=0, le=30)
    area_sqft: int = Field(ge=100, le=100_000)
    year_built: int = Field(ge=1700, le=date.today().year)
    condition: Literal["excellent", "good", "fair", "needs_work"]
    asking_price: int | None = Field(default=None, gt=0, le=1_000_000_000)
    image: ImageEvidence | None = None


class ComparableSale(BaseModel):
    model_config = ConfigDict(extra="forbid")

    address: str
    sale_price: int = Field(gt=0)
    area_sqft: int = Field(gt=0)
    distance_miles: float = Field(ge=0)


class ValuationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    address: str
    estimated_value: int = Field(gt=0)
    low_estimate: int = Field(gt=0)
    high_estimate: int = Field(gt=0)
    confidence: int = Field(ge=0, le=100)
    rationale: list[str] = Field(min_length=1, max_length=5)
    comparables: list[ComparableSale] = Field(min_length=1, max_length=3)
    analysis_source: Literal["multimodal_ai", "demo_estimate"]


app = FastAPI(title="Groundwork Property Intelligence API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def demo_valuation(request: ValuationRequest) -> ValuationResponse:
    market_rate = 680 if "san francisco" in request.address.lower() or "sf" in request.address.lower() else 385
    type_factor = {"single_family": 1.0, "condo": 0.88, "townhouse": 0.96, "multifamily": 1.14}[request.property_type]
    condition_factor = {"excellent": 1.08, "good": 1.0, "fair": 0.91, "needs_work": 0.8}[request.condition]
    age_factor = 1.0 if date.today().year - request.year_built < 50 else 0.97
    bedroom_adjustment = max(0.9, min(1.08, 1 + (request.bedrooms - 3) * 0.015))
    estimated = round(request.area_sqft * market_rate * type_factor * condition_factor * age_factor * bedroom_adjustment / 1000) * 1000

    if request.asking_price:
        estimated = round((estimated * 0.8 + request.asking_price * 0.2) / 1000) * 1000

    comps = [
        ComparableSale(address="12 blocks nearby", sale_price=round(estimated * 0.96), area_sqft=round(request.area_sqft * 0.94), distance_miles=0.3),
        ComparableSale(address="Recent neighborhood sale", sale_price=round(estimated * 1.03), area_sqft=round(request.area_sqft * 1.05), distance_miles=0.6),
        ComparableSale(address="Similar local property", sale_price=round(estimated * 0.99), area_sqft=round(request.area_sqft * 0.98), distance_miles=0.8),
    ]
    rationale = [
        f"Estimated using an illustrative local rate of ${market_rate:,} per sq ft.",
        f"Property condition recorded as {request.condition.replace('_', ' ')}.",
        "Comparable sales shown are illustrative examples, not verified MLS transactions.",
    ]
    if request.image:
        rationale.insert(1, "Image received; visual inspection requires a configured multimodal AI provider.")
    if request.asking_price:
        rationale.append("Asking price was included as a limited input to the estimate.")

    return ValuationResponse(
        address=request.address.strip(),
        estimated_value=estimated,
        low_estimate=round(estimated * 0.92),
        high_estimate=round(estimated * 1.08),
        confidence=54 if request.image else 48,
        rationale=rationale[:5],
        comparables=comps,
        analysis_source="demo_estimate",
    )


async def ai_valuation(request: ValuationRequest) -> ValuationResponse:
    image_instruction = "Assess the attached property image as supporting visual evidence. Do not infer hidden structural conditions." if request.image else "No property image was provided."
    content = [
        {
            "type": "text",
            "text": (
                "Return only a JSON object with keys estimated_value, low_estimate, high_estimate, confidence, rationale, comparables. "
                "comparables must contain 3 objects with address, sale_price, area_sqft, distance_miles. "
                "This is a preliminary estimate, not an appraisal. Do not invent verified sales: label all comparables as illustrative. "
                f"Property details: {request.model_dump(exclude={'image'})}. {image_instruction}"
            ),
        }
    ]
    if request.image:
        content.append({"type": "image_url", "image_url": {"url": request.image.data_url, "detail": "low"}})

    api_key = os.environ["OPENAI_API_KEY"]
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": content}],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
            },
        )
    response.raise_for_status()
    result = json.loads(response.json()["choices"][0]["message"]["content"])
    result["address"] = request.address.strip()
    result["analysis_source"] = "multimodal_ai"
    return ValuationResponse.model_validate(result)


@app.get("/api/health")
async def health():
    return {"status": "ok", "analysis_mode": "multimodal_ai" if os.getenv("OPENAI_API_KEY") else "demo_estimate"}


@app.post("/api/valuations", response_model=ValuationResponse)
async def create_valuation(request: ValuationRequest):
    if not os.getenv("OPENAI_API_KEY"):
        return demo_valuation(request)
    try:
        return await ai_valuation(request)
    except (httpx.HTTPError, KeyError, ValueError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=502, detail="The AI valuation provider could not complete this request.") from error