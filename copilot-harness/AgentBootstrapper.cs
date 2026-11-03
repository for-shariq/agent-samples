// Ensures the Foundry agent exists (creating it once if missing) before the first invoke.
public sealed class AgentBootstrapper(IConfiguration config, ILogger<AgentBootstrapper> logger)
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private bool _ready;

    public async Task EnsureAsync(CancellationToken ct)
    {
        if (_ready) return;

        await _gate.WaitAsync(ct);
        try
        {
            if (_ready) return;

            var endpoint = Required("Foundry:ProjectEndpoint");
            var agentName = Required("Foundry:AgentName");
            var model = Required("Foundry:Model");
            var instructions = config["Foundry:Instructions"] ?? "You are a helpful assistant.";

            var skillName = config["Foundry:Skill:Name"];
            var skill = string.IsNullOrEmpty(skillName)
                ? null
                : new SkillSpec(skillName, config["Foundry:Skill:Version"] is { Length: > 0 } v ? v : null);

            var toolboxName = config["Foundry:Toolbox:Name"];
            var toolbox = string.IsNullOrEmpty(toolboxName)
                ? null
                : new ToolboxSpec(
                    toolboxName,
                    config["Foundry:Toolbox:Version"] is { Length: > 0 } tv ? tv : null,
                    Required("Foundry:Toolbox:ConnectionName"));

            var searchConnection = config["Foundry:Search:ConnectionName"];
            var search = string.IsNullOrEmpty(searchConnection)
                ? null
                : new SearchSpec(searchConnection, Required("Foundry:Search:IndexName"));

            // The SDK call is synchronous; keep it off the request thread.
            await Task.Run(() => HarnessAgentProvisioner.EnsureAgent(endpoint, agentName, model, instructions, skill, toolbox, search), ct);

            logger.LogInformation("Agent '{Agent}' is ready", agentName);
            _ready = true;
        }
        finally
        {
            _gate.Release();
        }
    }

    private string Required(string key) =>
        config[key] is { Length: > 0 } value ? value : throw new InvalidOperationException($"{key} is not configured.");
}
