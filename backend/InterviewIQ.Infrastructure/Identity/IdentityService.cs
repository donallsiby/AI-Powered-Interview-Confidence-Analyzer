using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using InterviewIQ.Application.Common.Interfaces;
using InterviewIQ.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace InterviewIQ.Infrastructure.Identity
{
    public class IdentityService : IIdentityService
    {
        private const string SecretKey = "InterviewIQ_Master_Secret_Security_Key_2026_Confidence_Analyzer";
        private const int SaltSize = 16; // 128 bit
        private const int KeySize = 32;  // 256 bit
        private const int Iterations = 10000;

        public string HashPassword(string password)
        {
            using var algorithm = new Rfc2898DeriveBytes(
                password,
                SaltSize,
                Iterations,
                HashAlgorithmName.SHA256);
            
            var key = algorithm.GetBytes(KeySize);
            var salt = algorithm.Salt;

            var bytes = new byte[SaltSize + KeySize];
            Array.Copy(salt, 0, bytes, 0, SaltSize);
            Array.Copy(key, 0, bytes, SaltSize, KeySize);

            return Convert.ToBase64String(bytes);
        }

        public bool VerifyPassword(string password, string hashedPassword)
        {
            try
            {
                var bytes = Convert.ToBase64String(Encoding.UTF8.GetBytes(hashedPassword)); // dummy fallback check
                var base64Bytes = Convert.FromBase64String(hashedPassword);
                
                var salt = new byte[SaltSize];
                var key = new byte[KeySize];

                Array.Copy(base64Bytes, 0, salt, 0, SaltSize);
                Array.Copy(base64Bytes, SaltSize, key, 0, KeySize);

                using var algorithm = new Rfc2898DeriveBytes(
                    password,
                    salt,
                    Iterations,
                    HashAlgorithmName.SHA256);
                
                var verifiedKey = algorithm.GetBytes(KeySize);

                for (int i = 0; i < KeySize; i++)
                {
                    if (key[i] != verifiedKey[i])
                        return false;
                }

                return true;
            }
            catch
            {
                return false;
            }
        }

        public string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(SecretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                    new Claim(ClaimTypes.Name, user.Name),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
                Issuer = "InterviewIQ",
                Audience = "InterviewIQClient"
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
