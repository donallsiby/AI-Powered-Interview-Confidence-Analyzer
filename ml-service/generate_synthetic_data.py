import os
import pandas as pd
import numpy as np

def generate_synthetic_dataset(output_path: str, count: int = 200):
    """
    Generates a realistic synthetic CSV dataset for training the Random Forest Confidence Regressor.
    Features follow natural statistical distributions corresponding to Confident, Average, and Nervous speakers.
    """
    np.random.seed(42)
    data = []

    # Target classes split: 70 Confident, 70 Average, 60 Nervous
    classes = [("confident", 70), ("average", 70), ("nervous", 60)]

    for label, n_samples in classes:
        for _ in range(n_samples):
            if label == "confident":
                speech_rate = np.random.normal(3.0, 0.4)           # 2.6 - 3.4 syllables/sec (fluent)
                pause_count = int(np.random.poisson(2))             # few pauses
                filler_count = int(np.random.poisson(1))            # very few fillers
                pitch_stability = np.random.normal(88.0, 4.0)       # stable pitch
                sentiment_score = np.random.normal(75.0, 10.0)      # positive sentiment
                grammar_score = np.random.normal(90.0, 5.0)         # good grammar
                vocab_richness = np.random.normal(70.0, 8.0)        # high vocabulary richness
                confident_emotion_score = np.random.uniform(0.7, 0.95) # High confident probability
                
                # Confidence score output [80 - 98]
                confidence_score = 80.0 + (speech_rate * 2) - (filler_count * 1.5) + (pitch_stability * 0.1) + np.random.normal(0, 2)
                confidence_score = min(100.0, max(80.0, confidence_score))

            elif label == "average":
                speech_rate = np.random.normal(2.4, 0.5)           # slightly slower or faster
                pause_count = int(np.random.poisson(4))             # moderate pauses
                filler_count = int(np.random.poisson(4))            # moderate fillers
                pitch_stability = np.random.normal(75.0, 6.0)       # moderate stability
                sentiment_score = np.random.normal(60.0, 12.0)      # moderate sentiment
                grammar_score = np.random.normal(80.0, 8.0)         # moderate grammar
                vocab_richness = np.random.normal(60.0, 10.0)       # moderate vocabulary richness
                confident_emotion_score = np.random.uniform(0.2, 0.6)  # Moderate confident probability
                
                # Confidence score output [60 - 79]
                confidence_score = 65.0 + (speech_rate * 1) - (filler_count * 1.2) - (pause_count * 0.5) + np.random.normal(0, 3)
                confidence_score = min(79.0, max(60.0, confidence_score))

            else:  # nervous
                if np.random.rand() > 0.5:
                    speech_rate = np.random.normal(1.5, 0.3)        # hesitant / slow
                else:
                    speech_rate = np.random.normal(4.5, 0.5)        # rushed / fast
                    
                pause_count = int(np.random.poisson(7))             # frequent pauses
                filler_count = int(np.random.poisson(9))            # high filler words
                pitch_stability = np.random.normal(58.0, 8.0)       # unstable pitch / shaky voice
                sentiment_score = np.random.normal(45.0, 15.0)      # neutral/negative sentiment
                grammar_score = np.random.normal(70.0, 12.0)        # higher errors due to incomplete thoughts
                vocab_richness = np.random.normal(50.0, 12.0)       # simple vocabulary
                confident_emotion_score = np.random.uniform(0.01, 0.15) # Very low confident probability
                
                # Confidence score output [35 - 59]
                confidence_score = 48.0 - (filler_count * 0.8) - (pause_count * 0.6) - abs(2.8 - speech_rate) * 4 + np.random.normal(0, 4)
                confidence_score = min(59.0, max(0.0, confidence_score))

            data.append({
                "label": label,
                "confident_emotion_score": float(round(confident_emotion_score, 4)),
                "pitch_stability": float(round(pitch_stability, 2)),
                "pause_count": int(pause_count),
                "speech_rate": float(round(speech_rate, 2)),
                "sentiment_score": float(round(sentiment_score, 2)),
                "grammar_score": float(round(grammar_score, 2)),
                "vocab_richness": float(round(vocab_richness, 2)),
                "filler_count": int(filler_count),
                "confidence_score": float(round(confidence_score, 2))
            })

    df = pd.DataFrame(data)
    # Shuffle dataset
    df = df.sample(frac=1.0).reset_index(drop=True)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} synthetic rows in {output_path}")

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "datasets")
    csv_file = os.path.join(out_dir, "features.csv")
    generate_synthetic_dataset(csv_file)
