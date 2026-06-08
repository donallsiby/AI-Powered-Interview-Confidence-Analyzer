# Datasets Directory

This directory is used to collect and preprocess audio datasets for training the Speech Confidence Predictor.

## Dataset Structure

For the initial MVP model, we collect recordings categorized into three confidence levels:

- `confident/` - Clear, steady, fluent responses with low filler words.
- `average/` - Typical responses with some pauses and common filler words.
- `nervous/` - Hesitant, fast/slow paced, high jitter/shimmer, and frequent pauses.

## Audio Prompts for Custom Data Collection

We record speakers answering standard interview questions:
1. "Tell me about yourself."
2. "What are your strengths and weaknesses?"
3. "Why should we hire you?"
4. "Describe a challenging technical project you built."

## Metadata Index

We maintain a central CSV index of all samples for training: `datasets/metadata.csv`.
Columns:
- `file_path`: Path relative to datasets directory.
- `label`: confidence level (confident / average / nervous).
- `question_id`: The interview question being answered.
- `speaker_id`: ID to track speaker diversity.
