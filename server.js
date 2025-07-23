import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = 3000;

const API_KEY = "sk-RDjpy3tDOusiadmVRKXtbg"; // Replace with your real API key
const API_BASE = "https://api.litviva.com/v1";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

/** Helper: safe fetch wrapper for JSON APIs */
async function litviva(path, body) {
  const resp = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const ct = resp.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await resp.text();
    throw new Error(`Unexpected content-type for ${path}: ${ct} :: ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  if (!resp.ok) {
    const msg = data?.error?.message || `Upstream ${path} error ${resp.status}`;
    throw new Error(msg);
  }
  return data;
}

/* ------------ Routes ------------ */

// Chat
app.post("/api/chat", async (req, res) => {
  try {
    const data = await litviva("chat/completions", req.body);
    res.json(data);
  } catch (err) {
    console.error("Chat proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Image
app.post("/api/image", async (req, res) => {
  try {
    const data = await litviva("images/generations", req.body);

    // Normalize: ensure data[0].url exists even if only base64 returned
    let out = data;
    const item = data?.data?.[0];
    if (item && !item.url) {
      const b64 =
        item.b64_json ||
        item.image_base64 ||
        item.base64 ||
        null;
      if (b64) {
        const mime = "image/png"; // fallback MIME type
        const dataUrl = `data:${mime};base64,${b64}`;
        out = { data: [{ url: dataUrl }] };
      }
    }
    res.json(out);
  } catch (err) {
    console.error("Image proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Audio (binary)
app.post("/api/audio", async (req, res) => {
  try {
    const { model = "hackathon/text2speech", input, voice = "sophia" } = req.body;

    console.log("Audio request:", { model, voice, inputSnippet: input?.substring(0, 30) });

    if (!input) {
      return res.status(400).json({ error: "Missing input text" });
    }

    const body = { model, input, voice, response_format: "mp3" };

    const response = await fetch(`${API_BASE}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type") || "";
    console.log("Upstream status:", response.status, "Content-Type:", contentType);

    if (!response.ok || !contentType.includes("audio")) {
      const errText = await response.text();
      console.error("Upstream audio error or unexpected content:", errText);
      return res.status(500).json({
        error: !response.ok ? "Audio generation failed" : "Expected audio data",
        details: errText
      });
    }

    res.setHeader("Content-Type", contentType);
    response.body.pipe(res);

  } catch (err) {
    console.error("Audio proxy error:", err);
    res.status(500).json({ error: "Audio generation failed", details: err.message });
  }
});

// GET /api/audio - info endpoint
app.get("/api/audio", (req, res) => {
  res.status(200).send(`
    <html>
      <body>
        <h1>Audio Generation Endpoint</h1>
        <p>This endpoint only accepts POST requests for audio generation.</p>
        <p>Please use your application's interface instead of accessing this directly.</p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});
