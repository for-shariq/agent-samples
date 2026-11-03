using Microsoft.AspNetCore.Mvc;

namespace CopilotSpa.Controllers;

public record ChatRequest(string Message, string? ConversationId);

[ApiController]
[Route("api/[controller]")]
public class ChatController(IConfiguration config, AgentBootstrapper bootstrapper, ILogger<ChatController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Post([FromBody] ChatRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { error = "Message is required." });

        var endpoint = config["Foundry:ProjectEndpoint"];
        var agentName = config["Foundry:AgentName"];
        if (string.IsNullOrEmpty(endpoint) || string.IsNullOrEmpty(agentName))
            return StatusCode(500, new { error = "Foundry:ProjectEndpoint and Foundry:AgentName must be configured." });

        try
        {
            await bootstrapper.EnsureAsync(ct);

            // The SDK call is synchronous; keep it off the request thread.
            var (conversationId, text, activities) = await Task.Run(
                () => HarnessAgentProvisioner.Invoke(endpoint, agentName, request.Message, request.ConversationId), ct);

            return Ok(new { reply = text, conversationId, activities });
        }
        catch (OperationCanceledException)
        {
            return StatusCode(499, new { error = "Request cancelled." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Agent invocation failed");
            return StatusCode(502, new { error = "The agent request failed. Check the server log for details." });
        }
    }
}
