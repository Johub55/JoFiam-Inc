import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  /**
   * Server-Side Robust TTS Proxy:
   * Solves all browser CORS, iframe sandboxing, Opera adblocker & 403 hotlinking issues.
   * Delivers pure audio/mpeg stream directly from the same origin (/api/tts).
   */
  app.get("/api/tts", async (req, res) => {
    try {
      const text = typeof req.query.text === 'string' ? req.query.text.trim() : '';
      const voice = (typeof req.query.voice === 'string' ? req.query.voice : 'Ruben') || 'Ruben';
      const codec = typeof req.query.codec === 'string' ? req.query.codec : 'MP3';

      if (!text) {
        return res.status(400).json({ error: "Text parameter is required" });
      }

      // Als codec=WAV is gevraagd of als we expliciet VoiceRSS in WAV-formaat willen
      if (codec.toUpperCase() === 'WAV' || voice === 'voicerss_wav') {
        try {
          const voiceRssUrl = `https://api.voicerss.org/?key=e7a79e49129e46a7be71e21b777a3d3c&hl=nl-nl&src=${encodeURIComponent(text)}&c=WAV&f=44khz_16bit_stereo`;
          const rssResponse = await fetch(voiceRssUrl);
          if (rssResponse.ok) {
            res.setHeader("Content-Type", "audio/wav");
            res.setHeader("Cache-Control", "public, max-age=86400");
            const buffer = await rssResponse.arrayBuffer();
            return res.send(Buffer.from(buffer));
          }
        } catch (e) {
          console.warn("VoiceRSS WAV fetch failed on server:", e);
        }
      }

      // 1. If voice is google or default, route appropriately
      if (voice !== 'google' && voice !== 'voicerss_wav') {
        try {
          const streamUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`;
          const upstreamResponse = await fetch(streamUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });

          if (upstreamResponse.ok) {
            const contentType = upstreamResponse.headers.get("content-type") || "audio/mpeg";
            res.setHeader("Content-Type", contentType);
            res.setHeader("Cache-Control", "public, max-age=86400");
            const buffer = await upstreamResponse.arrayBuffer();
            return res.send(Buffer.from(buffer));
          }
        } catch (e) {
          console.warn("StreamElements TTS fetch failed on server, trying Google TTS fallback:", e);
        }
      }

      // 2. Fallback to Google Natural Dutch Audio Stream
      try {
        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=nl&client=tw-ob&q=${encodeURIComponent(text)}`;
        const googleResponse = await fetch(googleUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://translate.google.com/"
          }
        });

        if (googleResponse.ok) {
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Cache-Control", "public, max-age=86400");
          const buffer = await googleResponse.arrayBuffer();
          return res.send(Buffer.from(buffer));
        }
      } catch (e) {
        console.warn("Google TTS fallback failed:", e);
      }

      // 3. Fallback to VoiceRSS
      try {
        const voiceRssUrl = `https://api.voicerss.org/?key=e7a79e49129e46a7be71e21b777a3d3c&hl=nl-nl&src=${encodeURIComponent(text)}`;
        const rssResponse = await fetch(voiceRssUrl);
        if (rssResponse.ok) {
          res.setHeader("Content-Type", "audio/mpeg");
          const buffer = await rssResponse.arrayBuffer();
          return res.send(Buffer.from(buffer));
        }
      } catch (e) {
        console.warn("VoiceRSS fallback failed:", e);
      }

      return res.status(502).json({ error: "All TTS upstream services were unreachable" });
    } catch (err: any) {
      console.error("TTS Server Error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  /**
   * Server-Side Custom TTS Proxy:
   * Proxies custom third-party TTS audio requests through the backend.
   * Completely bypasses CORS restrictions and Opera adblockers on Linux/Windows.
   */
  app.get("/api/custom-tts", async (req, res) => {
    try {
      const customUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
      if (!customUrl) {
        return res.status(400).json({ error: "URL parameter is required" });
      }

      const upstreamResponse = await fetch(customUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (upstreamResponse.ok) {
        const contentType = upstreamResponse.headers.get("content-type") || "audio/mpeg";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        const buffer = await upstreamResponse.arrayBuffer();
        return res.send(Buffer.from(buffer));
      }

      console.warn(`Custom TTS upstream returned error code ${upstreamResponse.status} for URL: ${customUrl}`);
      return res.status(upstreamResponse.status).send(`Upstream server returned error ${upstreamResponse.status}`);
    } catch (err: any) {
      console.error("Custom TTS Server Error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
