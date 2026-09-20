import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Ensure correct JavaScript/TypeScript MIME types on Linux systems
  app.use((req, res, next) => {
    if (/\.(js|mjs|ts|tsx)(\?.*)?$/i.test(req.url)) {
      res.setHeader("Content-Type", "text/javascript; charset=utf-8");
    }
    next();
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  /**
   * Server-Side Robust TTS Proxy:
   * Solves all browser CORS, iframe sandboxing, Opera adblocker & 403 hotlinking issues.
   * Delivers pure, reliable Google Translate Dutch TTS audio stream directly from the same origin (/api/tts).
   */
  app.get("/api/tts", async (req, res) => {
    try {
      const text = typeof req.query.text === 'string' ? req.query.text.trim() : '';

      if (!text) {
        return res.status(400).json({ error: "Text parameter is required" });
      }

      // Google Translate Natural Dutch Audio Stream - 100% Free, Reliable, No API Key Required
      const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=nl&client=tw-ob&q=${encodeURIComponent(text)}`;
      const googleResponse = await fetch(googleUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://translate.google.com/"
        }
      });

      if (googleResponse.ok) {
        const buffer = await googleResponse.arrayBuffer();
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", buffer.byteLength);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(Buffer.from(buffer));
      }

      return res.status(502).json({ error: "Google TTS upstream service unreachable" });
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
