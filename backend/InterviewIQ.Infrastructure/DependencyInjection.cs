using System;
using InterviewIQ.Application.Common.Interfaces;
using InterviewIQ.Infrastructure.Identity;
using InterviewIQ.Infrastructure.Persistence;
using InterviewIQ.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InterviewIQ.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");

            if (!string.IsNullOrEmpty(connectionString))
            {
                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseSqlServer(
                        connectionString,
                        b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));
            }
            else
            {
                // Fallback SQLite database configuration for easy local testing
                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseSqlite(
                        "Data Source=interviewiq.db",
                        b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));
            }

            services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
            services.AddScoped<IIdentityService, IdentityService>();

            // Configure HTTP Client for the FastAPI microservice
            services.AddHttpClient<IMlServiceClient, MlServiceClient>(client =>
            {
                // Set default timeout for audio analysis uploads
                client.Timeout = TimeSpan.FromSeconds(60);
            });

            return services;
        }
    }
}
