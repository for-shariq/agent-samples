using System.Diagnostics;

// Starts the Vite dev server alongside the API when running in Development.
public sealed class ViteDevServer(IWebHostEnvironment env, ILogger<ViteDevServer> logger) : IHostedService
{
    private Process? _process;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var clientDir = Path.Combine(env.ContentRootPath, "ClientApp");
        var shell = OperatingSystem.IsWindows() ? "cmd.exe" : "/bin/sh";
        var flag = OperatingSystem.IsWindows() ? "/c" : "-c";
        var install = Directory.Exists(Path.Combine(clientDir, "node_modules")) ? "" : "npm install && ";

        _process = Process.Start(new ProcessStartInfo(shell, $"{flag} \"{install}npm run dev\"")
        {
            WorkingDirectory = clientDir,
            UseShellExecute = false,
        });
        logger.LogInformation("Vite dev server starting at http://localhost:5173");
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        if (_process is { HasExited: false })
        {
            _process.Kill(entireProcessTree: true);
        }
        return Task.CompletedTask;
    }
}
