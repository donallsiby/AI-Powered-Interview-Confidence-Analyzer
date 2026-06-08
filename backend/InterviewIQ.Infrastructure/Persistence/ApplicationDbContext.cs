using System.Threading;
using System.Threading.Tasks;
using InterviewIQ.Application.Common.Interfaces;
using InterviewIQ.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InterviewIQ.Infrastructure.Persistence
{
    public class ApplicationDbContext : DbContext, IApplicationDbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<InterviewSession> InterviewSessions => Set<InterviewSession>();
        public DbSet<AudioAnalysis> AudioAnalyses => Set<AudioAnalysis>();
        public DbSet<Report> Reports => Set<Report>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(u => u.UserId);
                entity.HasIndex(u => u.Email).IsUnique();
                entity.Property(u => u.Name).IsRequired().HasMaxLength(150);
                entity.Property(u => u.Email).IsRequired().HasMaxLength(150);
                entity.Property(u => u.PasswordHash).IsRequired();
                entity.Property(u => u.Role).IsRequired().HasMaxLength(50);
            });

            // InterviewSession configuration
            modelBuilder.Entity<InterviewSession>(entity =>
            {
                entity.HasKey(s => s.SessionId);
                entity.Property(s => s.OverallScore).HasPrecision(5, 2);

                entity.HasOne(s => s.User)
                    .WithMany(u => u.InterviewSessions)
                    .HasForeignKey(s => s.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // AudioAnalysis configuration
            modelBuilder.Entity<AudioAnalysis>(entity =>
            {
                entity.HasKey(a => a.AnalysisId);
                entity.Property(a => a.SpeechRate).HasPrecision(5, 2);
                entity.Property(a => a.PitchScore).HasPrecision(5, 2);
                entity.Property(a => a.ConfidenceScore).HasPrecision(5, 2);

                entity.HasOne(a => a.InterviewSession)
                    .WithMany(s => s.AudioAnalyses)
                    .HasForeignKey(a => a.SessionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Report configuration
            modelBuilder.Entity<Report>(entity =>
            {
                entity.HasKey(r => r.ReportId);
                
                entity.HasOne(r => r.InterviewSession)
                    .WithOne(s => s.Report)
                    .HasForeignKey<Report>(r => r.SessionId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}
