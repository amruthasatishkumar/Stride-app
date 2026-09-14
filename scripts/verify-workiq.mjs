import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const transport = new StdioClientTransport({
  command,
  args: ["-y", "@microsoft/workiq", "mcp"],
  stderr: "inherit",
});
const client = new Client({
  name: "stride-connectivity-verifier",
  version: "0.1.0",
});

const timeout = setTimeout(() => {
  console.error("WorkIQ verification timed out after 60 seconds.");
  process.exitCode = 1;
  void client.close();
}, 60_000);

try {
  await client.connect(transport);
  const response = await client.listTools();
  const tools = response.tools.map((tool) => tool.name).sort();

  console.log(`WorkIQ connected. ${tools.length} tools available.`);
  console.log(tools.join(", "));

  if (tools.length === 0) {
    throw new Error("WorkIQ connected but returned no tools.");
  }
} finally {
  clearTimeout(timeout);
  await client.close();
}

