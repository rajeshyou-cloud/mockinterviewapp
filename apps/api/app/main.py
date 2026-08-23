from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="Mock Interview System API",
    version="0.1.0",
    description="Technology-neutral API for interview sessions, scoring, and content packs.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScoreRequest(BaseModel):
    answer: str = Field(min_length=1)
    expected_concepts: List[str] = Field(min_length=1)


class ScoreResponse(BaseModel):
    score: int
    matched_concepts: List[str]
    missing_concepts: List[str]
    summary: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "mock-interview-api"}


@app.post("/v1/score", response_model=ScoreResponse)
def score_answer(payload: ScoreRequest) -> ScoreResponse:
    """Baseline explainable scoring.

    This intentionally simple scorer establishes the API contract for Milestone 1.
    A provider-independent semantic/LLM scorer will replace it in a later milestone.
    """
    normalized = payload.answer.lower()
    matched = [
        concept
        for concept in payload.expected_concepts
        if concept.lower() in normalized
    ]
    missing = [
        concept
        for concept in payload.expected_concepts
        if concept not in matched
    ]
    score = round((len(matched) / len(payload.expected_concepts)) * 100)

    if score >= 70:
        summary = "Strong coverage of the expected concepts."
    elif score >= 40:
        summary = "Partial coverage. Add the missing concepts and explain the trade-offs."
    else:
        summary = "The answer needs more technical depth against this baseline rubric."

    return ScoreResponse(
        score=score,
        matched_concepts=matched,
        missing_concepts=missing,
        summary=summary,
    )
