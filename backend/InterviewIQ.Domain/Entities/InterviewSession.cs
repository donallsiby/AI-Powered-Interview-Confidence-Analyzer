using System;
using System.Collections.Generic;

namespace InterviewIQ.Domain.Entities
{
    public class InterviewSession
    {
        public Guid SessionId { get; set; }
        public Guid UserId { get; set; }
        public DateTimeOffset Date { get; set; } = DateTimeOffset.UtcNow;
        public string QuestionSet { get; set; } = string.Empty; // Store question text or JSON array
        public decimal OverallScore { get; set; }

        // Navigation properties
        public User? User { get; set; }
        public ICollection<AudioAnalysis> AudioAnalyses { get; set; } = new List<AudioAnalysis>();
        public Report? Report { get; set; }
    }
}
