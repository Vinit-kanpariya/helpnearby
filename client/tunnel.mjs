import net from "net";
import localtunnel from "localtunnel";

async function waitForPort(port) {
  process.stdout.write("[tunnel] waiting for port " + port + "...\n");
  while (true) {
    try {
      await new Promise((resolve, reject) => {
        const s = net.connect(port, "127.0.0.1");
        s.once("connect", () => { s.destroy(); resolve(); });
        s.once("error", reject);
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

await waitForPort(5173);
process.stdout.write("[tunnel] port ready, connecting localtunnel...\n");

try {
  const tunnel = await localtunnel({ port: 5173 });
  process.stdout.write("\n  Public URL: " + tunnel.url + "\n\n");
  tunnel.on("error", (e) => process.stderr.write("tunnel error: " + e.message + "\n"));
} catch (e) {
  process.stderr.write("[tunnel] FAILED: " + e.message + "\n");
}
