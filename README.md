# InterviewIQ – AI-Powered Interview Confidence Analyzer

InterviewIQ is a production-grade, AI-powered interview coaching platform designed to evaluate candidate confidence, communication quality, emotional state, and interview readiness. It combines acoustic feature engineering, deep learning emotion recognition, multi-model confidence prediction, natural language processing, and interactive data visualizations.

---

## 🚀 Key Features

* **Real-time Audio Capturing:** Browser-based response recorder with a dynamic waveform visualization.
* **Acoustic Feature Engineering:** Extracts Speech Pace (syllables/sec), Pause Count, Jitter, Shimmer, Pitch stability, and Spectral centroids using Librosa.
* **Tone & Emotion Profile:** Identifies speaker emotions (Happy, Sad, Angry, Neutral, Fear, Confident, Nervous) using deep learning and fallback heuristic algorithms.
* **Linguistic NLP Metrics:** Counts verbal filler words ("um", "uh", "like") and estimates vocabulary richness.
* **Constructive Performance Reports:** Generates targeted feedback and actionable improvement tips based on overall scoring.
* **Interactive Dashboards:** Displays progression charts (confidence levels over time) and recent interview sessions.

---

## 🛠️ Technologies & Frameworks

### 1. Frontend
* **Core:** React 19, TypeScript, Vite
* **State Management:** Redux Toolkit (thunks for session uploading and history)
* **Styling & Animations:** Material UI (MUI v9), Framer Motion
* **Visualizations:** Recharts (responsive line charts and emotion bar graphs)

### 2. Backend
* **Architecture:** ASP.NET Core 9.0 Web API (Clean Architecture with MediatR CQRS pattern)
* **ORM:** Entity Framework Core
* **Database:** SQLite (local database with auto-initialization and default user seeding)
* **Security:** JWT Authentication with Role-Based Authorization

### 3. ML Service (FastAPI)
* **Framework:** FastAPI (Python 3.12)
* **Acoustic Analysis:** Librosa, SoundFile, NumPy, SciPy
* **NLP Processing:** NLTK, Scikit-Learn
* **Serialization Models:** joblib (.pkl models)

---

## 📂 Project Structure

```text
InterviewIQ/
├── frontend/             # React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── components/   # UI components (Interview Room, Audio Recorder)
│   │   ├── store/        # Redux State (authSlice, interviewSlice)
│   │   ├── theme/        # Custom styling palette
│   │   └── App.tsx       # Main SPA entry
│   ├── Dockerfile        # SPA build & Nginx deployment configuration
│   └── nginx.conf        # Nginx route fallback rules
├── backend/              # Clean Architecture .NET solution
│   ├── InterviewIQ.API/            # Controllers & launch settings
│   ├── InterviewIQ.Application/    # Use cases, Commands & Queries (CQRS)
│   ├── InterviewIQ.Domain/         # Core Entities (User, Session, AudioAnalysis)
│   ├── InterviewIQ.Infrastructure/ # EF Core persistence, Identity, ML clients
│   └── Dockerfile                  # Multi-stage SDK build & runtime container
├── ml-service/           # FastAPI Python Microservice
│   ├── app/
│   │   ├── services/     # Feature extraction, NLP, models interface
│   │   └── main.py       # API router and endpoints
│   ├── models/           # Pre-trained models (.pkl files)
│   ├── test_pipeline.py  # End-to-end integration test pipeline script
│   └── Dockerfile        # Python container with libsndfile system dependencies
├── datasets/             # Metadata indexes and data preprocessing
└── docker-compose.yml    # Root multi-container manager
```

---

## 💻 Local Development Setup

To run all services locally:

### 1. Start the ML Service
Ensure you have Python 3.12 installed.
```bash
cd ml-service
pip install -r requirements.txt
python run.py
```
*The FastAPI server will boot at `http://127.0.0.1:8000`.*

### 2. Start the Backend API
Ensure you have the .NET 10 SDK installed.
```bash
cd backend
dotnet restore
dotnet run --project InterviewIQ.API --launch-profile http
```
*The Web API will boot at `http://localhost:5094`. The SQLite database file `interviewiq.db` initializes automatically and seeds a default test user.*

### 3. Start the React Frontend
Ensure you have Node.js v20+ installed.
```bash
cd frontend
npm install
npm run dev
```
*The Vite development server will open at `http://localhost:5173`.*

---

## 🐳 Docker Container Deployment

The application supports single-command Docker deployment, linking the multi-tier components over an isolated network.

### 1. Build and Launch
At the root `InterviewIQ/` directory, run:
```bash
docker compose up -d --build
```

### 2. Exposed Services
* **Frontend UI:** `http://localhost:80` (Served via Nginx)
* **Backend API:** `http://localhost:5094`
* **FastAPI Service:** `http://localhost:8000`

---

## 🧪 E2E Pipeline Verification

You can verify the entire audio uploading, processing, feature extraction, database saving, and cycle-safe serialization process using the built-in python script:

```bash
cd ml-service
python test_pipeline.py
```

This script generates a silent 1-second WAV buffer, uploads it to the Web API, triggers the ML service analysis, saves the session database entries, and prints the clean JSON payload returned from the server.
