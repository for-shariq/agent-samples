using Azure.AI.Projects;
using Azure.AI.Projects.Agents;
using Azure.Core;
using Azure.Identity;
#pragma warning disable AAIP001 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var tenantId = builder.Configuration["Foundry:TenantId"] is { Length: > 0 } tenant ? tenant : null;

// Locally use exactly the `az login` account; when hosted (no CLI) fall back to managed identity via the default chain.
TokenCredential credential = builder.Environment.IsDevelopment()
    ? new AzureCliCredential(new AzureCliCredentialOptions { TenantId = tenantId })
    : new DefaultAzureCredential(new DefaultAzureCredentialOptions { TenantId = tenantId });
HarnessAgentProvisioner.Credential = credential;

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddHostedService<ViteDevServer>();
}

builder.Services.AddSingleton(sp =>
{
    var endpoint = sp.GetRequiredService<IConfiguration>()["Foundry:ProjectEndpoint"]
        ?? throw new InvalidOperationException("Foundry:ProjectEndpoint is not configured.");
    return new AIProjectClient(new Uri(endpoint), credential);
});

builder.Services.AddSingleton(sp =>
{
    var endpoint = sp.GetRequiredService<IConfiguration>()["Foundry:ProjectEndpoint"]
        ?? throw new InvalidOperationException("Foundry:ProjectEndpoint is not configured.");
    return new AgentAdministrationClient(endpoint: new Uri(endpoint), tokenProvider: credential);
});

builder.Services.AddSingleton<AgentBootstrapper>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

// Anything that is not an API route or a static file is served by the React app.
app.MapFallbackToFile("index.html");

app.Run();
#pragma warning restore AAIP001 // Type is for evaluation purposes only and is subject to change or removal in future updates. Suppress this diagnostic to proceed.
