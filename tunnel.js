const ngrok = require("ngrok");

(async () => {
  try {
    const url = await ngrok.connect({
      proto: "http",
      addr: 5173,
      authtoken: process.env.NGROK_TOKEN,
    });
    console.log("\n✅ ngrok tunnel open!");
    console.log("🔗 Public URL:", url);
    console.log("\nOpen this URL on your phone.\nPress Ctrl+C to stop.\n");
  } catch (err) {
    console.error("❌ ngrok error:", err.message);
    console.error(
      '\nMake sure to set your token: NGROK_TOKEN=your_token node tunnel.js\nGet your token at: https://dashboard.ngrok.com/get-started/your-authtoken'
    );
    process.exit(1);
  }
})();
