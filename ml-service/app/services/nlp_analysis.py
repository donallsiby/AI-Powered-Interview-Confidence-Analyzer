import re
import nltk
from typing import Dict, Any, List

# Download NLTK resources if not already present
try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except LookupError:
    try:
        nltk.download('vader_lexicon', quiet=True)
    except Exception:
        pass

try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    try:
        nltk.download('punkt', quiet=True)
    except Exception:
        pass

from nltk.sentiment.vader import SentimentIntensityAnalyzer
from nltk.tokenize import word_tokenize, sent_tokenize

# List of typical interview filler words
FILLER_WORDS = [
    r"\bum\b", r"\buh\b", r"\blike\b", r"\byou know\b", 
    r"\bso\b", r"\bactually\b", r"\bbasically\b", 
    r"\bliterally\b", r"\bi mean\b", r"\bright\b"
]

def count_filler_words(text: str) -> Dict[str, Any]:
    text_lower = text.lower()
    total_fillers = 0
    filler_breakdown = {}
    
    for filler_pattern in FILLER_WORDS:
        # Clean regex pattern to read as a word key
        key = filler_pattern.replace(r"\b", "").replace(r"\s+", " ")
        matches = re.findall(filler_pattern, text_lower)
        count = len(matches)
        total_fillers += count
        if count > 0:
            filler_breakdown[key] = count
            
    return {
        "total_filler_count": total_fillers,
        "filler_breakdown": filler_breakdown
    }

def analyze_nlp_metrics(text: str, question: str = "") -> Dict[str, Any]:
    """
    Analyzes vocabulary richness, sentence complexity, filler words,
    sentiment, and relevance to the question.
    """
    if not text.strip():
        return {
            "word_count": 0,
            "vocabulary_richness": 0.0,
            "sentence_complexity": 0.0,
            "filler_count": 0,
            "filler_frequency_pct": 0.0,
            "sentiment_score": 50.0,
            "relevance_score": 0.0,
            "grammar_score": 100.0,
            "communication_score": 0.0
        }

    # Tokenize words and sentences
    try:
        words = word_tokenize(text.lower())
        sentences = sent_tokenize(text)
    except Exception:
        # Fallback if NLTK tokenizers fail
        words = re.findall(r"\w+", text.lower())
        sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]

    word_count = len(words)
    sentence_count = len(sentences)

    # 1. Vocabulary Richness (Type-Token Ratio: unique words / total words)
    unique_words = set(words)
    vocab_richness = (len(unique_words) / word_count * 100.0) if word_count > 0 else 0.0

    # 2. Sentence Complexity (Average words per sentence)
    avg_sentence_len = (word_count / sentence_count) if sentence_count > 0 else 0.0
    # Map average sentence length to a 0-100 complexity scale (optimal length ~15-20 words)
    if avg_sentence_len <= 5:
        complexity_score = 30.0
    elif avg_sentence_len >= 35:
        complexity_score = 50.0  # overly complex / run-on sentences
    else:
        # Peak score around 15-20 words
        complexity_score = 100.0 - abs(18.0 - avg_sentence_len) * 3.0
    complexity_score = max(0.0, min(100.0, complexity_score))

    # 3. Filler Words
    fillers = count_filler_words(text)
    filler_count = fillers["total_filler_count"]
    filler_frequency_pct = (filler_count / word_count * 100.0) if word_count > 0 else 0.0
    
    # 4. Sentiment Analysis
    sentiment_score = 50.0  # neutral default
    try:
        sia = SentimentIntensityAnalyzer()
        polarity = sia.polarity_scores(text)
        # Scale compound score [-1, 1] to [0, 100]
        sentiment_score = float((polarity["compound"] + 1.0) / 2.0 * 100.0)
    except Exception:
        # Basic rule-based fallback if VADER fails
        pos_words = {"good", "great", "excellent", "challenge", "solved", "success", "learned", "achieved", "build", "developed", "love", "enjoy"}
        neg_words = {"bad", "fail", "hard", "problem", "difficult", "worry", "nervous", "error", "hate", "stuck"}
        pos_count = sum(1 for w in words if w in pos_words)
        neg_count = sum(1 for w in words if w in neg_words)
        total_sentiment_words = pos_count + neg_count
        if total_sentiment_words > 0:
            sentiment_score = 50.0 + ((pos_count - neg_count) / total_sentiment_words) * 50.0

    # 5. Question Relevance (using TF-IDF cosine similarity fallback if Transformers not loaded)
    relevance_score = 80.0 # Default fallback
    if question.strip():
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            vectorizer = TfidfVectorizer().fit_transform([question.lower(), text.lower()])
            vectors = vectorizer.toarray()
            cosine_sim = cosine_similarity([vectors[0]], [vectors[1]])[0][0]
            relevance_score = float(cosine_sim * 100.0)
            # Normalize and scale
            relevance_score = min(100.0, relevance_score * 2.0 + 20.0) # Scale up similarity slightly for match
        except Exception:
            # Word overlap fallback
            q_words = set(re.findall(r"\w+", question.lower()))
            overlap = unique_words.intersection(q_words)
            if len(q_words) > 0:
                relevance_score = 30.0 + (len(overlap) / len(q_words)) * 70.0

    # 6. Grammar Score Approximation
    # Simple rule-based grammar check (sentence capitalization, punctuation, common errors)
    grammar_score = 100.0
    if sentence_count > 0:
        bad_sentences = 0
        for s in sentences:
            s_strip = s.strip()
            if len(s_strip) > 0:
                # Starts with capital letter?
                if not s_strip[0].isupper():
                    bad_sentences += 0.5
                # Ends with punctuation?
                if s_strip[-1] not in {'.', '!', '?'}:
                    bad_sentences += 0.5
        grammar_deduction = (bad_sentences / sentence_count) * 20.0
        grammar_score = max(50.0, 100.0 - grammar_deduction)

    # Calculate overall Communication Score
    # Communication decreases with higher filler frequency
    filler_penalty = min(40.0, filler_frequency_pct * 8.0)
    communication_score = (vocab_richness * 0.4) + (complexity_score * 0.3) + (grammar_score * 0.3) - filler_penalty
    communication_score = max(0.0, min(100.0, communication_score))

    return {
        "word_count": word_count,
        "vocabulary_richness": float(vocab_richness),
        "sentence_complexity": float(complexity_score),
        "filler_count": filler_count,
        "filler_frequency_pct": float(filler_frequency_pct),
        "filler_breakdown": fillers["filler_breakdown"],
        "sentiment_score": float(sentiment_score),
        "relevance_score": float(relevance_score),
        "grammar_score": float(grammar_score),
        "communication_score": float(communication_score)
    }
