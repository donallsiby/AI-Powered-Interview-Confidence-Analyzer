using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using InterviewIQ.Application.Common.Interfaces;
using InterviewIQ.Domain.Entities;
using MediatR;

namespace InterviewIQ.Application.Sessions.Commands
{
    public record CreateSessionCommand(
        Guid UserId, 
        string Question, 
        byte[] AudioBytes, 
        string AudioFileExtension
    ) : IRequest<InterviewSession>;

    public class CreateSessionCommandHandler : IRequestHandler<CreateSessionCommand, InterviewSession>
    {
        private readonly IApplicationDbContext _context;
        private readonly IMlServiceClient _mlServiceClient;

        public CreateSessionCommandHandler(IApplicationDbContext context, IMlServiceClient mlServiceClient)
        {
            _context = context;
            _mlServiceClient = mlServiceClient;
        }

        public async Task<InterviewSession> Handle(CreateSessionCommand request, CancellationToken cancellationToken)
        {
            // 1. Invoke ML Microservice to extract features and predict confidence
            var mlResult = await _mlServiceClient.AnalyzeAudioAsync(
                request.AudioBytes, 
                request.AudioFileExtension, 
                request.Question, 
                cancellationToken
            );

            // 2. Create the Interview Session
            var session = new InterviewSession
            {
                SessionId = Guid.NewGuid(),
                UserId = request.UserId,
                Date = DateTimeOffset.UtcNow,
                QuestionSet = request.Question,
                OverallScore = mlResult.ConfidenceScore
            };

            // 3. Create the Audio Analysis record
            var audioAnalysis = new AudioAnalysis
            {
                AnalysisId = Guid.NewGuid(),
                SessionId = session.SessionId,
                SpeechRate = mlResult.SpeakingRate,
                PauseCount = mlResult.PauseCount,
                // Represent pitch score as pitch stability (mocked/approximated)
                PitchScore = mlResult.EmotionScores.GetValueOrDefault("Confident", 0.5m) * 100,
                FillerCount = mlResult.FillerCount,
                EmotionScore = mlResult.PrimaryEmotion,
                ConfidenceScore = mlResult.ConfidenceScore
            };

            // 4. Generate constructive feedback and recommendations report
            var recommendations = GenerateRecommendations(mlResult, audioAnalysis);
            var feedback = GenerateFeedbackText(mlResult, audioAnalysis);

            var report = new Report
            {
                ReportId = Guid.NewGuid(),
                SessionId = session.SessionId,
                GeneratedAt = DateTimeOffset.UtcNow,
                Feedback = feedback,
                Recommendations = string.Join("\n", recommendations)
            };

            session.AudioAnalyses.Add(audioAnalysis);
            session.Report = report;

            _context.InterviewSessions.Add(session);
            _context.AudioAnalyses.Add(audioAnalysis);
            _context.Reports.Add(report);

            await _context.SaveChangesAsync(cancellationToken);

            return session;
        }

        private string GenerateFeedbackText(Common.Models.AudioAnalysisResultDto mlResult, AudioAnalysis analysis)
        {
            var parts = new List<string>();

            if (mlResult.ConfidenceScore >= 85)
            {
                parts.Add("You delivered a highly confident response. Your voice was stable, and you projected authority.");
            }
            else if (mlResult.ConfidenceScore >= 70)
            {
                parts.Add("You spoke with a solid, moderate level of confidence. Minor adjustments can help you project even better.");
            }
            else
            {
                parts.Add("Your response showed signs of nervousness, likely due to vocal tremors, pauses, or speaking speed deviations.");
            }

            if (analysis.SpeechRate < 2.0m)
            {
                parts.Add("Your pace was somewhat slow, which can make the response feel hesitant.");
            }
            else if (analysis.SpeechRate > 4.2m)
            {
                parts.Add("You spoke very quickly, which might make it difficult for the interviewer to follow details.");
            }

            if (analysis.FillerCount > 5)
            {
                parts.Add($"We detected a significant number of filler words ({analysis.FillerCount} occurrences).");
            }

            if (mlResult.PrimaryEmotion == "Confident")
            {
                parts.Add("Your primary emotional tone was confident and professional.");
            }

            return string.Join(" ", parts);
        }

        private List<string> GenerateRecommendations(Common.Models.AudioAnalysisResultDto mlResult, AudioAnalysis analysis)
        {
            var list = new List<string>();

            if (mlResult.ConfidenceScore >= 85)
            {
                list.Add("Continue maintaining strong posture and pitch stability.");
            }
            else if (mlResult.ConfidenceScore >= 70)
            {
                list.Add("Try practicing structural frameworks (like STAR) to reduce hesitation.");
            }
            else
            {
                list.Add("Practice slow, deep abdominal breathing prior to starting questions.");
                list.Add("Keep active pauses short rather than trailing off.");
            }

            if (analysis.SpeechRate < 2.0m)
            {
                list.Add("Work on increasing your speaking speed slightly to convey energy and engagement.");
            }
            else if (analysis.SpeechRate > 4.2m)
            {
                list.Add("Consciously slow down your pace, allowing natural pauses at the end of thoughts.");
            }

            if (analysis.FillerCount > 5)
            {
                list.Add("Practice pausing silently instead of using verbal fillers like 'um', 'uh', or 'like'.");
            }

            if (list.Count < 3)
            {
                list.Add("Keep responses structured with clear intro, body, and conclusion phases.");
                list.Add("Structure technical answers using specific metrics and outcomes.");
            }

            return list;
        }
    }
}
