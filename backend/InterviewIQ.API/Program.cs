using System.Text;
using InterviewIQ.Application;
using InterviewIQ.Infrastructure;
using InterviewIQ.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Register Clean Architecture Layers
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Add JWT Authentication
const string secretKey = "InterviewIQ_Master_Secret_Security_Key_2026_Confidence_Analyzer";
var key = Encoding.ASCII.GetBytes(secretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = "InterviewIQ",
        ValidateAudience = true,
        ValidAudience = "InterviewIQClient",
        ValidateLifetime = true
    };
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173", "https://donallsiby.github.io")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Auto-initialize SQLite / SQL Server Schema on boot for easy developer workflow
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        // Ensure database exists and schema is applied
        context.Database.EnsureCreated();
        Console.WriteLine("Database initialized successfully!");

        // Seed the mock user to support local development testing pipelines seamlessly
        var mockUserId = Guid.Parse("88a38a7c-658a-4934-8cbf-4bfb621ffb8a");
        var hasMockUser = context.Users.Any(u => u.UserId == mockUserId);
        if (!hasMockUser)
        {
            var mockUser = new InterviewIQ.Domain.Entities.User
            {
                UserId = mockUserId,
                Name = "Mock User",
                Email = "mockuser@example.com",
                PasswordHash = "SeededMockPasswordHash123",
                Role = "User",
                CreatedAt = DateTimeOffset.UtcNow
            };
            context.Users.Add(mockUser);
            context.SaveChanges();
            Console.WriteLine("Mock user seeded successfully!");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"An error occurred while initializing the database: {ex.Message}");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("CorsPolicy");

// In production, HttpsRedirection is used
// app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
