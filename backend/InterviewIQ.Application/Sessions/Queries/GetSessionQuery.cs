using System;
using System.Threading;
using System.Threading.Tasks;
using InterviewIQ.Application.Common.Interfaces;
using InterviewIQ.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InterviewIQ.Application.Sessions.Queries
{
    public record GetSessionQuery(Guid SessionId) : IRequest<InterviewSession?>;

    public class GetSessionQueryHandler : IRequestHandler<GetSessionQuery, InterviewSession?>
    {
        private readonly IApplicationDbContext _context;

        public GetSessionQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<InterviewSession?> Handle(GetSessionQuery request, CancellationToken cancellationToken)
        {
            return await _context.InterviewSessions
                .Include(s => s.AudioAnalyses)
                .Include(s => s.Report)
                .FirstOrDefaultAsync(s => s.SessionId == request.SessionId, cancellationToken);
        }
    }
}
