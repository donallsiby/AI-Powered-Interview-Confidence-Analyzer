# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj files and restore dependencies
COPY ["InterviewIQ.API/InterviewIQ.API.csproj", "InterviewIQ.API/"]
COPY ["InterviewIQ.Application/InterviewIQ.Application.csproj", "InterviewIQ.Application/"]
COPY ["InterviewIQ.Domain/InterviewIQ.Domain.csproj", "InterviewIQ.Domain/"]
COPY ["InterviewIQ.Infrastructure/InterviewIQ.Infrastructure.csproj", "InterviewIQ.Infrastructure/"]
RUN dotnet restore "InterviewIQ.API/InterviewIQ.API.csproj"

# Copy full source and build
COPY . .
WORKDIR "/src/InterviewIQ.API"
RUN dotnet publish "InterviewIQ.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "InterviewIQ.API.dll"]
