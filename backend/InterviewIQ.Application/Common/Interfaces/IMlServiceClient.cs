using System.Threading;
using System.Threading.Tasks;
using InterviewIQ.Application.Common.Models;

namespace InterviewIQ.Application.Common.Interfaces
{
    public interface IMlServiceClient
    {
        Task<AudioAnalysisResultDto> AnalyzeAudioAsync(byte[] audioBytes, string fileExtension, string question, CancellationToken cancellationToken = default);
    }
}
