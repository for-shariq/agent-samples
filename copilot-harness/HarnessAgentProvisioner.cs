using System.ClientModel;
using Azure.Core;
using Azure.AI.Extensions.OpenAI;
using Azure.AI.Projects;
using Azure.AI.Projects.Agents;
using Azure.Identity;
using OpenAI.Conversations;
using OpenAI.Responses;

#pragma warning disable OPENAI001, AAIP001, AAIP002

public record SkillSpec(string Name, string? Version);
public record ToolboxSpec(string Name, string? Version, string ConnectionName);
public record SearchSpec(string ConnectionName, string IndexName);

// Kind: "web_search" | "file_search" | "function" | "other".
public record ToolActivity(string Kind, string Name, string? Status, string? Arguments);

public static class HarnessAgentProvisioner
{
    public static TokenCredential Credential { get; set; } = new DefaultAzureCredential();

    // Creates the agent only when it doesn't exist yet, so invoking never silently produces new versions.
    public static void EnsureAgent(
        string projectEndpoint,
        string agentName,
        string model,
        string instructions,
        SkillSpec? skill,
        ToolboxSpec? toolbox,
        SearchSpec? search = null)
    {
        var client = new AgentAdministrationClient(new Uri(projectEndpoint), Credential);
        try
        {
            client.GetAgent(agentName);
        }
        catch (ClientResultException ex) when (ex.Status == 404)
        {
            CreateVersion(projectEndpoint, agentName, model, instructions, skill, toolbox, search);
        }
    }

    // Creates a new version of a Copilot-harness prompt agent, optionally with a skill, a toolbox and an Azure AI Search index attached.
    public static ProjectsAgentVersion CreateVersion(
        string projectEndpoint,
        string agentName,
        string model,
        string instructions,
        SkillSpec? skill = null,
        ToolboxSpec? toolbox = null,
        SearchSpec? search = null)
    {
        var client = new AgentAdministrationClient(new Uri(projectEndpoint), Credential);

        var definition = new DeclarativeAgentDefinition(model)
        {
            Instructions = instructions,
            Harness = new MicrosoftCopilotHarness(),
        };

        /*if (toolbox is not null)
        {
            // Foundry exposes every toolbox as an MCP endpoint under the project; a version pins it, otherwise the default version is served.
            var baseUrl = projectEndpoint.TrimEnd('/');
            var toolboxUrl = toolbox.Version is null
                ? $"{baseUrl}/toolboxes/{toolbox.Name}/mcp?api-version=v1"
                : $"{baseUrl}/toolboxes/{toolbox.Name}/versions/{toolbox.Version}/mcp?api-version=v1";

            definition.Tools.Add(new McpTool(toolbox.Name, new Uri(toolboxUrl))
            {
                ToolCallApprovalPolicy = new McpToolCallApprovalPolicy(DefaultMcpToolCallApprovalPolicy.AlwaysRequireApproval),
                ProjectConnectionId = toolbox.ConnectionName,
            });
        }*/


        if (search is not null)
        {
            // The tool references the connection by id, so resolve it from the connection name.
            var projectClient = new AIProjectClient(new Uri(projectEndpoint), Credential);
            var connection = projectClient.Connections.GetConnection(connectionName: search.ConnectionName);

            var index = new AzureAISearchToolIndex
            {
                ProjectConnectionId = connection.Value.Id,
                IndexName = search.IndexName,
                QueryType = AzureAISearchQueryKind.Simple,
            };
            definition.Tools.Add(new AzureAISearchTool(new AzureAISearchToolOptions(indexes: [index])));
        }

        if (skill is not null){
            definition.Skills.Add(new SkillReference(skill.Name) { Version = skill.Version });
            definition.Skills.Add(new SkillReference("clarify"));
        }

        return client.CreateAgentVersion(agentName, new ProjectsAgentVersionCreationOptions(definition), foundryFeatures: "MicrosoftCopilot=V1Preview");
    }

    // The harness requires a conversation; pass conversationId to continue one, or null to start a new one.
    public static (string ConversationId, string Text, List<ToolActivity> Activities) Invoke(
        string projectEndpoint,
        string agentName,
        string input,
        string? conversationId = null)
    {
        var openAIClient = new ProjectOpenAIClient(
            projectEndpoint: new Uri(projectEndpoint),
            tokenProvider: Credential,
            options: new ProjectOpenAIClientOptions { AgentName = agentName });

        conversationId ??= openAIClient.GetProjectConversationsClient().CreateProjectConversation().Value.Id;

        ProjectResponsesClient responsesClient = openAIClient.GetProjectResponsesClientForAgentEndpoint(agentName, conversationId);
        ResponseResult response = responsesClient.CreateResponse(input);
        var reply = response.GetOutputText();
        Console.WriteLine(reply);

        var activities = new List<ToolActivity>();
        foreach (var item in response.OutputItems)
        {
            switch (item)
            {
                case WebSearchCallResponseItem webSearch:
                    activities.Add(new ToolActivity("web_search", "Web search", webSearch.Status.ToString(), null));
                    break;
                case FunctionCallResponseItem functionCall:
                    activities.Add(new ToolActivity("function", functionCall.FunctionName, null, functionCall.FunctionArguments?.ToString()));
                    break;
                case FileSearchCallResponseItem fileSearch:
                    activities.Add(new ToolActivity("file_search", "File search", fileSearch.Status.ToString(), null));
                    break;
            }
        }

        return (conversationId, reply, activities);
    }
}
