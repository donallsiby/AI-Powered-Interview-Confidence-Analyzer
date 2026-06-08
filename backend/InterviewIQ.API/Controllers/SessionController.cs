using System;
using System.IO;
using System.Threading.Tasks;
using InterviewIQ.Application.Sessions.Commands;
using InterviewIQ.Application.Sessions.Queries;
using InterviewIQ.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InterviewIQ.API.Controllers
{
    [ApiController]
    [Route("api/sessions")]
    public class SessionController : ControllerBase
    {
        private readonly IMediator _mediator;

        public SessionController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<InterviewSession>> UploadAudio(
            [FromForm] Guid userId,
            [FromForm] string question,
            IFormFile file
        )
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Audio file is required." });
            }

            try
            {
                // Read file into memory
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                var audioBytes = ms.ToArray();
                var fileExtension = Path.GetExtension(file.FileName);

                // Publish command
                var command = new CreateSessionCommand(userId, question, audioBytes, fileExtension);
                var session = await _mediator.Send(command);

                return CreatedAtAction(nameof(GetSession), new { id = session.SessionId }, session);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Audio upload failed: {ex.Message}" });
            }
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<InterviewSession>> GetSession(Guid id)
        {
            try
            {
                var query = new GetSessionQuery(id);
                var session = await _mediator.Send(query);

                if (session == null)
                {
                    return NotFound(new { message = "Interview session not found." });
                }

                return Ok(session);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Retrieving session failed: {ex.Message}" });
            }
        }
    }
}
