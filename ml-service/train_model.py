import os
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

def train_confidence_model(csv_path: str, models_dir: str):
    """
    Loads features from CSV, splits them into train and test datasets,
    trains a RandomForestRegressor, prints validation metrics, and serializes the model.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}. Please run generate_synthetic_data.py first.")

    # Load dataset
    df = pd.read_csv(csv_path)
    print(f"Loaded dataset from {csv_path} with {len(df)} rows.")

    # Features list matching the model inference input:
    # [Confident_score, Pitch_stability, Pause_count, Speech_rate, Sentiment_score, Grammar_score, Vocab_score, Filler_count]
    feature_cols = [
        "confident_emotion_score",
        "pitch_stability",
        "pause_count",
        "speech_rate",
        "sentiment_score",
        "grammar_score",
        "vocab_richness",
        "filler_count"
    ]
    target_col = "confidence_score"

    X = df[feature_cols]
    y = df[target_col]

    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"Training set size: {len(X_train)}, Testing set size: {len(X_test)}")

    # Initialize and train Random Forest Regressor
    model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
    model.fit(X_train, y_train)

    # Predictions
    y_pred = model.predict(X_test)

    # Compute Evaluation Metrics
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print("\n--- Model Evaluation ---")
    print(f"Root Mean Squared Error (RMSE) : {rmse:.4f}")
    print(f"Mean Absolute Error (MAE)      : {mae:.4f}")
    print(f"R² Score (Coefficient of Det.) : {r2:.4f}")
    print("------------------------\n")

    # Serialize model to models directory
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "confidence_model.pkl")
    joblib.dump(model, model_path)
    print(f"Successfully saved trained model to {model_path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_file = os.path.join(base_dir, "..", "datasets", "features.csv")
    models_path = os.path.join(base_dir, "..", "models")
    train_confidence_model(csv_file, models_path)
