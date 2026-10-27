# Groundwork Property Intelligence

A personal real-estate valuation workspace built with React and FastAPI. The valuation flow accepts structured property details and an optional property image, then returns a validated JSON estimate with a range, confidence, rationale, and comparable examples.

## Run locally

Install frontend dependencies and start Vite:

```bash
npm install
npm run dev
```

In a second terminal, install and start the API:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Vite proxies `/api` requests to `http://localhost:8000`. The API uses a clearly labeled illustrative estimate when `OPENAI_API_KEY` is unset. To enable multimodal analysis, set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in the environment before starting the API.

## API contract

- `GET /api/health` reports API status and the configured analysis mode.
- `POST /api/valuations` accepts a strict JSON property request and returns a strict JSON valuation response. Unknown fields are rejected. Optional image data is limited to JPEG, PNG, or WebP data URLs.

The demo estimate and its comparable examples are not based on verified transaction data and must not be used as an appraisal, lending decision, or offer price. A production deployment should connect verified property and sales data, use an appropriately configured vision model, and add authentication, persistence, and provider-specific evaluation.