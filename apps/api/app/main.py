from pathlib import Path
from typing import List, Literal, Optional
import json

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="Mock Interview System API",
    version="0.2.0",
    description="Technology-neutral API for interview sessions, scoring, and content packs.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REPO_ROOT = Path(__file__).resolve().parents[3]
STARTER_QUESTIONS_PATH = REPO_ROOT / "packages" / "content" / "questions" / "starter.json"

Technology = Literal["snowflake", "informatica"]
Difficulty = Literal["beginner", "intermediate", "advanced"]


class SourceReference(BaseModel):
    title: str
    url: str
    verified: str


class InterviewQuestion(BaseModel):
    id: str
    technology: str
    topic: str
    difficulty: str
    type: str
    question: str
    canonicalAnswer: str
    expectedConcepts: List[str]
    followUps: List[str]
    source: SourceReference
    reviewStatus: str
    version: int


class ScoreRequest(BaseModel):
    answer: str = Field(min_length=1)
    expected_concepts: List[str] = Field(min_length=1)


class ScoreResponse(BaseModel):
    score: int
    matched_concepts: List[str]
    missing_concepts: List[str]
    summary: str


def load_questions() -> List[InterviewQuestion]:
    if not STARTER_QUESTIONS_PATH.exists():
        raise HTTPException(status_code=500, detail="Starter question pack is unavailable")

    with STARTER_QUESTIONS_PATH.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    return [InterviewQuestion.model_validate(item) for item in payload]


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "mock-interview-api"}


@app.get("/v1/questions", response_model=List[InterviewQuestion])
def questions(
    technology: Optional[Technology] = Query(default=None),
    difficulty: Optional[Difficulty] = Query(default=None),
) -> List[InterviewQuestion]:
    """Return reviewed starter questions using technology-neutral filters."""
    result = load_questions()

    if technology:
        result = [question for question in result if question.technology == technology]
    if difficulty:
        result = [question for question in result if question.difficulty == difficulty]

    return result


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
