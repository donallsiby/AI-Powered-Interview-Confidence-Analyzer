using System;

namespace InterviewIQ.Domain.Entities
{
    public class AudioAnalysis
    {
        public Guid AnalysisId { get; set; }
        public Guid SessionId { get; set; }
        
        // Acoustic Metrics
        public decimal SpeechRate { get; set; }
        public int PauseCount { get; set; }
        public decimal PitchScore { get; set; } // Representing pitch stability or variation
        
        // NLP Metrics
        public int FillerCount { get; set; }
        
        // ML Prediction Output
        public string EmotionScore { get; set; } = string.Empty; // Storing primary emotion or full JSON probabilities
        public decimal ConfidenceScore { get; set; }

        // Navigation properties
        public InterviewSession? InterviewSession { get; set; }
    }
}
