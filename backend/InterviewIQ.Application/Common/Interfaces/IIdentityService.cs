using InterviewIQ.Domain.Entities;

namespace InterviewIQ.Application.Common.Interfaces
{
    public interface IIdentityService
    {
        string HashPassword(string password);
        bool VerifyPassword(string password, string hashedPassword);
        string GenerateJwtToken(User user);
    }
}
