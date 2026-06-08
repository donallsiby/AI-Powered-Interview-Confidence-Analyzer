using System;
using System.Threading;
using System.Threading.Tasks;
using InterviewIQ.Application.Common.Interfaces;
using InterviewIQ.Application.Common.Models;
using InterviewIQ.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InterviewIQ.Application.Users.Commands
{
    public record RegisterUserCommand(string Name, string Email, string Password, string Role = "User") : IRequest<AuthResponseDto>;

    public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, AuthResponseDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly IIdentityService _identityService;

        public RegisterUserCommandHandler(IApplicationDbContext context, IIdentityService identityService)
        {
            _context = context;
            _identityService = identityService;
        }

        public async Task<AuthResponseDto> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
        {
            // Check if user already exists
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

            if (existingUser != null)
            {
                throw new Exception("A user with this email address already exists.");
            }

            // Create new user
            var user = new User
            {
                UserId = Guid.NewGuid(),
                Name = request.Name,
                Email = request.Email,
                PasswordHash = _identityService.HashPassword(request.Password),
                Role = string.IsNullOrWhiteSpace(request.Role) ? "User" : request.Role,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);

            // Generate JWT Token
            var token = _identityService.GenerateJwtToken(user);

            return new AuthResponseDto
            {
                UserId = user.UserId,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role,
                Token = token
            };
        }
    }
}
