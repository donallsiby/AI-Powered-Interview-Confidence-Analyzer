FROM python:3.12-slim

WORKDIR /app

# Install system-level audio dependencies (required by librosa / soundfile)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose port and start service
EXPOSE 8000
CMD ["python", "run.py"]
