using System.Collections.Generic;

namespace InterviewIQ.Application.Common.Models
{
    public class AudioAnalysisResultDto
    {
        public string Transcript { get; set; } = string.Empty;
        public decimal ConfidenceScore { get; set; }
        public string PrimaryEmotion { get; set; } = string.Empty;
        public Dictionary<string, decimal> EmotionScores { get; set; } = new();
        
        // Acoustic & NLP features
        public decimal SpeakingRate { get; set; }
        public int PauseCount { get; set; }
        public int FillerCount { get; set; }
    }
}
