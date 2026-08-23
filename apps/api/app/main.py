from pathlib import Path
from typing import List, Literal, Optional
import hashlib
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
QUESTION_PACK_PATHS = [
    REPO_ROOT / "apps" / "web" / "data" / "beginner.json",
    REPO_ROOT / "apps" / "web" / "data" / "starter.json",
    REPO_ROOT / "apps" / "web" / "data" / "expanded.json",
    REPO_ROOT / "apps" / "web" / "data" / "generated.json",
]

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
    questions: List[InterviewQuestion] = []
    for path in QUESTION_PACK_PATHS:
        if not path.exists():
            raise HTTPException(status_code=500, detail=f"Question pack is unavailable: {path.name}")
        with path.open("r", encoding="utf-8") as handle:
            questions.extend(InterviewQuestion.model_validate(item) for item in json.load(handle))
    return questions


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "mock-interview-api"}


@app.get("/v1/questions", response_model=List[InterviewQuestion])
def questions(
    technology: Optional[Technology] = Query(default=None),
    difficulty: Optional[Difficulty] = Query(default=None),
    seed: Optional[str] = Query(default=None, max_length=128),
    limit: Optional[int] = Query(default=None, ge=1, le=20),
) -> List[InterviewQuestion]:
    """Return reviewed questions using technology-neutral filters and stable session sampling."""
    result = load_questions()

    if technology:
        result = [question for question in result if question.technology == technology]
    if difficulty:
        result = [question for question in result if question.difficulty == difficulty]
    if seed:
        result.sort(key=lambda question: hashlib.sha256(f"{seed}:{question.id}".encode()).hexdigest())
    if limit:
        result = result[:limit]

    return result


@app.post("/v1/score", response_model=ScoreResponse)
def score_answer(payload: ScoreRequest) -> ScoreResponse:
    """Baseline explainable scoring.

    This standalone service preserves the explainable fallback contract. The
    production Next.js scoring route can add semantic evaluation without
    changing this response shape.
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
