import os
import joblib
from typing import Dict, Any

class ConfidencePredictor:
    def __init__(self, models_dir: str):
        self.models_dir = models_dir
        self.model_path = os.path.join(models_dir, "confidence_model.pkl")
        self.model = None
        self.load_model()
        
    def load_model(self):
        """Loads the trained confidence model from disk if available."""
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
            except Exception:
                self.model = None
                
    def predict(self, audio_features: Dict[str, Any], nlp_features: Dict[str, Any], emotion_scores: Dict[str, float]) -> float:
        """
        Predicts confidence score in the range [0, 100].
        If no model is trained, computes a robust heuristic score.
        """
        if self.model is not None:
            try:
                # Features list matching the model training input:
                # [Confident_score, Pitch_stability, Pause_count, Speech_rate, Sentiment_score, Grammar_score, Vocab_score, Filler_count]
                x = [[
                    emotion_scores.get("Confident", 0.5),
                    audio_features.get("pitch_stability", 80.0),
                    audio_features.get("pause_count", 2),
                    audio_features.get("speaking_rate_syllables_sec", 2.5),
                    nlp_features.get("sentiment_score", 50.0),
                    nlp_features.get("grammar_score", 80.0),
                    nlp_features.get("vocabulary_richness", 60.0),
                    nlp_features.get("filler_count", 1)
                ]]
                score = float(self.model.predict(x)[0])
                return max(0.0, min(100.0, score))
            except Exception:
                pass
                
        # Heuristic scoring if no model is loaded yet
        # Initialize confidence score at baseline 70.0
        score = 70.0
        
        # 1. Pitch Stability (15% impact)
        pitch_stability = audio_features.get("pitch_stability", 80.0)
        # stability above 80 adds up to +5, below 70 subtracts up to -15
        if pitch_stability > 80.0:
            score += (pitch_stability - 80.0) * 0.25
        else:
            score -= (80.0 - pitch_stability) * 0.5
            
        # 2. Speaking Rate (15% impact) - optimal is 2.2 to 3.8 syllables per sec
        rate = audio_features.get("speaking_rate_syllables_sec", 2.5)
        if rate < 1.8:
            score -= (1.8 - rate) * 10.0 # Speaking too slowly reduces confidence
        elif rate > 4.2:
            score -= (rate - 4.2) * 8.0  # Speaking too fast/rushed reduces confidence
        else:
            score += 5.0 # Optimal speaking rate bonus
            
        # 3. Pauses (10% impact) - penalize high pause count relative to duration
        duration = audio_features.get("duration_seconds", 10.0)
        pause_count = audio_features.get("pause_count", 0)
        pauses_per_minute = (pause_count / duration) * 60.0 if duration > 0 else 0.0
        # More than 8 pauses per minute starts to look hesitant
        if pauses_per_minute > 8.0:
            score -= min(15.0, (pauses_per_minute - 8.0) * 1.5)
            
        # 4. Sentiment (10% impact)
        sentiment = nlp_features.get("sentiment_score", 50.0)
        # Positive sentiment boosts confidence, negative reduces it slightly
        score += (sentiment - 50.0) * 0.15
        
        # 5. Language Quality: Grammar & Vocab (20% impact)
        grammar = nlp_features.get("grammar_score", 80.0)
        vocab = nlp_features.get("vocabulary_richness", 60.0)
        score += (grammar - 80.0) * 0.2
        score += (vocab - 60.0) * 0.15
        
        # 6. Filler Words (15% impact)
        filler_pct = nlp_features.get("filler_frequency_pct", 0.0)
        # More than 2% filler words penalizes score
        if filler_pct > 2.0:
            score -= min(20.0, (filler_pct - 2.0) * 4.0)
            
        # 7. Emotion Scores (15% impact)
        confident_prob = emotion_scores.get("Confident", 0.1)
        nervous_prob = emotion_scores.get("Nervous", 0.1)
        score += confident_prob * 15.0
        score -= nervous_prob * 15.0
        
        return max(0.0, min(100.0, score))

# Singleton instance
_predictor = None

def get_confidence_predictor(models_dir: str) -> ConfidencePredictor:
    global _predictor
    if _predictor is None:
        _predictor = ConfidencePredictor(models_dir)
    return _predictor
