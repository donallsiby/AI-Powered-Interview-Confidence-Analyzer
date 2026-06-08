using System;
using System.Threading;
using System.Threading.Tasks;
using InterviewIQ.Application.Common.Interfaces;
using InterviewIQ.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InterviewIQ.Application.Users.Commands
{
    public record LoginUserCommand(string Email, string Password) : IRequest<AuthResponseDto>;

    public class LoginUserCommandHandler : IRequestHandler<LoginUserCommand, AuthResponseDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly IIdentityService _identityService;

        public LoginUserCommandHandler(IApplicationDbContext context, IIdentityService identityService)
        {
            _context = context;
            _identityService = identityService;
        }

        public async Task<AuthResponseDto> Handle(LoginUserCommand request, CancellationToken cancellationToken)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

            if (user == null || !_identityService.VerifyPassword(request.Password, user.PasswordHash))
            {
                throw new Exception("Invalid email or password.");
            }

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
