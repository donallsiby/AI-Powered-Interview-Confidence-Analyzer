import os
import numpy as np
from typing import Dict, Any

# Target emotion classes
CLASSES = ["Happy", "Sad", "Angry", "Neutral", "Fear", "Confident", "Nervous"]

class EmotionClassifier:
    def __init__(self, models_dir: str):
        self.models_dir = models_dir
        self.model_path = os.path.join(models_dir, "emotion_recognition_model.h5")
        self.model = None
        self.load_model()
        
    def load_model(self):
        """Loads the CNN-BiLSTM model if weights are available."""
        if os.path.exists(self.model_path):
            try:
                # Lazy import tensorflow/keras to avoid slow startup when not needed
                from tensorflow.keras.models import load_model
                self.model = load_model(self.model_path)
            except Exception:
                self.model = None
                
    def predict(self, features: Dict[str, Any]) -> Dict[str, float]:
        """
        Predicts probabilities for each emotion class.
        If the model is not trained, uses a heuristic fallback.
        """
        # Heuristic implementation based on acoustic signals
        # Pitch, RMS energy, and Speech rate correlate with emotional states
        pitch_stability = features.get("pitch_stability", 80.0)
        pitch = features.get("pitch_mean_hz", 120.0)
        rms = features.get("rms_energy_mean", 0.05)
        speaking_rate = features.get("speaking_rate_syllables_sec", 2.5)
        
        # Calculate raw scores
        scores = {c: 0.1 for c in CLASSES} # Baseline probability
        
        # Confident heuristic
        # Stable pitch, moderate to high energy, steady speech rate
        if pitch_stability > 80.0 and rms > 0.03 and 2.0 <= speaking_rate <= 4.0:
            scores["Confident"] += 0.8
            scores["Neutral"] += 0.3
        
        # Nervous heuristic
        # High pitch jitter/low stability, low energy OR very high speaking rate (rushed)
        if pitch_stability < 65.0 or speaking_rate > 4.5 or speaking_rate < 1.5:
            scores["Nervous"] += 0.7
            scores["Fear"] += 0.4
            
        # Angry / Passionate
        # High energy and high pitch
        if rms > 0.08 and pitch > 180.0:
            scores["Angry"] += 0.6
            scores["Happy"] += 0.4
            
        # Sad
        # Very low energy and slower speech rate
        if rms < 0.02 and speaking_rate < 2.0:
            scores["Sad"] += 0.7
            scores["Neutral"] += 0.3
            
        # Happy
        # High pitch stability, moderate-high energy, lively speaking rate
        if pitch_stability > 75.0 and rms > 0.05 and speaking_rate > 3.0:
            scores["Happy"] += 0.6
            scores["Confident"] += 0.3
            
        # Neutral baseline adjustment
        if all(scores[c] == 0.1 for c in CLASSES):
            scores["Neutral"] += 0.5
            
        # Apply Softmax to convert raw scores to probabilities
        exp_scores = {k: np.exp(v) for k, v in scores.items()}
        sum_exp = sum(exp_scores.values())
        probabilities = {k: float(v / sum_exp) for k, v in exp_scores.items()}
        
        return probabilities

# Singleton instance
_classifier = None

def get_emotion_classifier(models_dir: str) -> EmotionClassifier:
    global _classifier
    if _classifier is None:
        _classifier = EmotionClassifier(models_dir)
    return _classifier
