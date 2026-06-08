using System;

namespace InterviewIQ.Domain.Entities
{
    public class Report
    {
        public Guid ReportId { get; set; }
        public Guid SessionId { get; set; }
        public DateTimeOffset GeneratedAt { get; set; } = DateTimeOffset.UtcNow;
        public string Feedback { get; set; } = string.Empty;
        public string Recommendations { get; set; } = string.Empty; // Stored as newline-separated or JSON list

        // Navigation properties
        public InterviewSession? InterviewSession { get; set; }
    }
}
