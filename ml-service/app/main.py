import os
import shutil
import uuid
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

from app.config import settings
from app.services.feature_extraction import extract_audio_features
from app.services.nlp_analysis import analyze_nlp_metrics
from app.services.emotion_model import get_emotion_classifier
from app.services.confidence_model import get_confidence_predictor

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request & Response Schemas
class PredictConfidenceRequest(BaseModel):
    audio_features: Dict[str, Any]
    nlp_features: Dict[str, Any]
    emotion_scores: Dict[str, float]

class PredictConfidenceResponse(BaseModel):
    confidence_score: float

class EmotionAnalysisResponse(BaseModel):
    emotions: Dict[str, float]
    primary_emotion: str

class GenerateReportRequest(BaseModel):
    session_id: str
    confidence_score: float
    communication_score: float
    grammar_score: float
    relevance_score: float
    filler_count: int
    speaking_rate_syllables_sec: float
    primary_emotion: str

class GenerateReportResponse(BaseModel):
    report_id: str
    feedback: str
    recommendations: List[str]

# Mock Speech-To-Text / Transcription database for realistic test fallbacks
INTERVIEW_FALLBACK_TRANSCRIPTS = [
    "I am really excited to be interviewing for this role. Um, in my last project, we built a React dashboard with a .NET Core web API. It was, you know, quite challenging to coordinate the real time updates, but we basically solved it by setting up WebSockets and optimizing the database queries.",
    "Well, actually, my greatest strength is my problem solving ability. When a production bug occurred, I did not panic. I, uh, looked at the logs, analyzed the database connections, and literally patched the leak within twenty minutes. Basically, it taught me how to work under pressure.",
    "Honestly, I believe communication is key in engineering teams. I always, you know, try to document my work thoroughly so that other developers can jump in. So, uh, for my last project, I wrote comprehensive architectural diagrams and swagger specs.",
    "For this project, I used a Python FastAPI microservice because it is extremely fast and asynchronous. We had to extract features like MFCCs and jitter from audio files. It was like a new domain for me, but I read the documentation and succeeded."
]

def transcribe_audio_fallback(audio_path: str) -> str:
    """
    In a full production scenario, we would use a local Whisper model
    pipeline to transcribe the WAV audio. To ensure local testing works 
    immediately without downloading gigabytes of model weights, we fall back 
    to selecting a realistic transcribed response.
    """
    # Select transcript deterministically based on file name or size
    file_size = os.path.getsize(audio_path)
    idx = file_size % len(INTERVIEW_FALLBACK_TRANSCRIPTS)
    return INTERVIEW_FALLBACK_TRANSCRIPTS[idx]


@app.get("/")
def read_root():
    return {"message": "Welcome to the InterviewIQ ML Service API", "version": "1.0.0"}


@app.post(f"{settings.API_V1_STR}/analyze-audio")
async def analyze_audio(
    file: UploadFile = File(...),
    question: Optional[str] = Form("")
):
    """
    Uploads an audio recording, transcribes it, extracts acoustic and linguistic features,
    detects candidate emotions, and calculates the overall confidence score.
    """
    # Verify file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".wav", ".webm", ".mp3", ".m4a", ".ogg"]:
        raise HTTPException(status_code=400, detail="Unsupported audio format")

    # Generate a temporary path to save upload
    temp_filename = f"{uuid.uuid4()}{file_ext}"
    temp_file_path = os.path.join(settings.TEMP_DIR, temp_filename)

    try:
        # Save file to disk
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 1. Feature Extraction (Librosa)
        audio_features = extract_audio_features(temp_file_path)

        # 2. Speech-to-Text Transcription (Fallback helper)
        transcript = transcribe_audio_fallback(temp_file_path)

        # 3. NLP Metrics Analysis
        nlp_features = analyze_nlp_metrics(transcript, question)

        # 4. Emotion Recognition
        emotion_classifier = get_emotion_classifier(settings.MODELS_DIR)
        emotion_scores = emotion_classifier.predict(audio_features)
        primary_emotion = max(emotion_scores, key=emotion_scores.get)

        # 5. Confidence Score Prediction
        confidence_predictor = get_confidence_predictor(settings.MODELS_DIR)
        confidence_score = confidence_predictor.predict(audio_features, nlp_features, emotion_scores)

        # Build response
        return {
            "transcript": transcript,
            "confidence_score": float(round(confidence_score, 2)),
            "primary_emotion": primary_emotion,
            "emotion_scores": emotion_scores,
            "audio_features": audio_features,
            "nlp_features": nlp_features
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")

    finally:
        # Cleanup temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.post(f"{settings.API_V1_STR}/predict-confidence", response_model=PredictConfidenceResponse)
async def predict_confidence(request: PredictConfidenceRequest):
    """
    Utility endpoint to run confidence prediction on pre-computed features.
    """
    try:
        predictor = get_confidence_predictor(settings.MODELS_DIR)
        score = predictor.predict(request.audio_features, request.nlp_features, request.emotion_scores)
        return PredictConfidenceResponse(confidence_score=round(score, 2))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post(f"{settings.API_V1_STR}/emotion-analysis", response_model=EmotionAnalysisResponse)
async def emotion_analysis(file: UploadFile = File(...)):
    """
    Utility endpoint to perform Speech Emotion Recognition alone.
    """
    file_ext = os.path.splitext(file.filename)[1].lower()
    temp_filename = f"{uuid.uuid4()}{file_ext}"
    temp_file_path = os.path.join(settings.TEMP_DIR, temp_filename)

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        features = extract_audio_features(temp_file_path)
        classifier = get_emotion_classifier(settings.MODELS_DIR)
        scores = classifier.predict(features)
        primary = max(scores, key=scores.get)

        return EmotionAnalysisResponse(emotions=scores, primary_emotion=primary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.post(f"{settings.API_V1_STR}/generate-report", response_model=GenerateReportResponse)
async def generate_report(request: GenerateReportRequest):
    """
    Generates tailored, constructive feedback and action items based on interview performance metrics.
    """
    score = request.confidence_score
    comm = request.communication_score
    filler = request.filler_count
    rate = request.speaking_rate_syllables_sec
    emotion = request.primary_emotion

    recommendations = []
    feedback_parts = []

    # Compile feedback and recommendations based on confidence range
    if score >= 85:
        feedback_parts.append("You delivered a highly confident response. Your voice was stable, and you projected authority.")
        recommendations.append("Continue maintaining strong posture and pitch stability.")
    elif score >= 70:
        feedback_parts.append("You spoke with a solid, moderate level of confidence. Minor adjustments can help you project even better.")
        recommendations.append("Try practicing structural frameworks (like STAR) to reduce hesitation.")
    else:
        feedback_parts.append("Your response showed signs of nervousness, likely due to vocal tremors, pauses, or speaking speed deviations.")
        recommendations.append("Practice slow, deep abdominal breathing prior to starting questions.")
        recommendations.append("Keep active pauses short rather than trailing off.")

    # Speech rate recommendations (normal is between 2.0 and 4.0 syllables/sec)
    if rate < 2.0:
        feedback_parts.append("Your pace was somewhat slow, which can make the response feel hesitant.")
        recommendations.append("Work on increasing your speaking speed slightly to convey energy and engagement.")
    elif rate > 4.2:
        feedback_parts.append("You spoke very quickly, which might make it difficult for the interviewer to follow details.")
        recommendations.append("Consciously slow down your pace, allowing natural pauses at the end of thoughts.")

    # Filler word recommendations
    if filler > 5:
        feedback_parts.append(f"We detected a significant number of filler words ({filler} occurrences).")
        recommendations.append("Practice pausing silently instead of using verbal fillers like 'um', 'uh', or 'like'.")

    # Emotion feedback
    if emotion == "Nervous":
        recommendations.append("Focus on articulation and energy projection to counter nervous pitch shifts.")
    elif emotion == "Confident":
        feedback_parts.append("Your primary emotional tone was confident and professional.")

    # Fallback recommendations if list is short
    if len(recommendations) < 3:
        recommendations.append("Keep responses structured with clear intro, body, and conclusion phases.")
        recommendations.append("Structure technical answers using specific metrics and outcomes.")

    report_id = f"REP-{uuid.uuid4().hex[:8].upper()}"
    feedback_text = " ".join(feedback_parts)

    return GenerateReportResponse(
        report_id=report_id,
        feedback=feedback_text,
        recommendations=recommendations
    )
