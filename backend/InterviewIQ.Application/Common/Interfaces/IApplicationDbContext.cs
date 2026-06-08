using System.Threading;
using System.Threading.Tasks;
using InterviewIQ.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InterviewIQ.Application.Common.Interfaces
{
    public interface IApplicationDbContext
    {
        DbSet<User> Users { get; }
        DbSet<InterviewSession> InterviewSessions { get; }
        DbSet<AudioAnalysis> AudioAnalyses { get; }
        DbSet<Report> Reports { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
