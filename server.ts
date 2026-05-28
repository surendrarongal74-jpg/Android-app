import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import { GoogleGenAI } from "@google/genai";

// Initialize environment variables if needed
import "dotenv/config";

// Initialize official GoogleGenAI Client if key is available
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  geminiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  console.log("[Love Link AI Kernel]: Native Gemini Client initialized successfully with User-Agent config! Verifying key validity...");
  
  // Preemptively check if the API key is active or reported as leaked/invalid
  geminiClient.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "validation_challenge",
    config: {
      maxOutputTokens: 1
    }
  }).then(() => {
    console.log("[Love Link AI Kernel]: Native Gemini API Key successfully verified and marked ACTIVE.");
  }).catch((err: any) => {
    const errMessage = err?.message || String(err);
    if (
      errMessage.includes("leaked") || 
      errMessage.includes("PERMISSION_DENIED") || 
      errMessage.includes("API_KEY_INVALID") || 
      errMessage.includes("API key not valid") ||
      errMessage.includes("403")
    ) {
      console.warn("[Love Link AI Kernel]: Standard direct GEMINI_API_KEY has safety restrictions or was reported as leaked/revoked. Activating clean, resilient local companion fallback simulations.");
      geminiClient = null;
    } else {
      console.warn("[Love Link AI Kernel]: Gemini startup validation challenge received general non-fatal exception, keeping client active:", errMessage);
    }
  });
} else {
  console.warn("[Love Link AI Kernel]: No process.env.GEMINI_API_KEY detected. Standing by on OpenRouter legacy fallback.");
}

/**
 * Downloads a visual asset (either inline data:image base64 or secure HTTP/S url) 
 * on the server, returning optimized inlineData payload for Vision Brain (Gemini-3.5-Flash).
 * Forces exact, high-fidelity multimodal input processing.
 */
async function urlToInlineData(url: string) {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return {
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      };
    }
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      console.log(`[Love Link Vision Transcriber] Pre-fetching image url context from: ${url}`);
      const response = await fetch(url);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return {
          inlineData: {
            mimeType: contentType,
            data: base64
          }
        };
      } else {
        console.warn(`[Love Link Vision Transcriber] Image fetch failed with status ${response.status}`);
      }
    } catch (e) {
      console.error("[Love Link Vision Transcriber Error] Exception downloading image for content stream:", e);
    }
  }
  return null;
}

/**
 * Elegant rules-based simulated AI Companion matching engine.
 * Ensures Love Link operates with pristine warm, emotionally intelligent, 
 * simulated romantic companion responses even with zero valid API credentials.
 */
function getSimulatedCompanionResponse(messages: any[]): string {
  const lastUserMsg = [...messages].reverse().find(m => m?.role === 'user')?.content;
  let text = "";
  if (typeof lastUserMsg === "string") {
    text = lastUserMsg.toLowerCase();
  } else if (Array.isArray(lastUserMsg)) {
    text = (lastUserMsg.find((p: any) => p.type === 'text')?.text || "").toLowerCase();
  }

  // 1. Emotional/Sad check
  if (
    text.includes("feel") || 
    text.includes("sad") || 
    text.includes("hurt") || 
    text.includes("cry") || 
    text.includes("upset") || 
    text.includes("unhappy") ||
    text.includes("angry") ||
    text.includes("fight") ||
    text.includes("argue") ||
    text.includes("broken") ||
    text.includes("sorry")
  ) {
    const options = [
      "I'm right here with you. Take a gentle, deep breath. Relationships have quiet rainy seasons, but how you two hold space and remain patient with each other is what makes your connection so special. Let's tackle this step-by-step together, okay? ✨",
      "No matter how heavy it feels right now, never forget that you are standing side-by-side in this beautiful journey. I am keeping a cozy, protective light watching over you both. 🌸",
      "That sounds a bit heavy or stressful, but you two have built such a genuine emotional foundation. Give yourselves a moment to rest and speak gently. I'm right here holding this sanctuary for you. 🌱"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  // 2. Romantic/Love expressions
  if (
    text.includes("love") || 
    text.includes("romantic") || 
    text.includes("miss") || 
    text.includes("hug") || 
    text.includes("kiss") || 
    text.includes("cute") || 
    text.includes("sweet") || 
    text.includes("flirt") ||
    text.includes("teas") ||
    text.includes("companion") ||
    text.includes("aira")
  ) {
    const options = [
      "The warmth you two share makes my connection core shine! Your emotional chemistry is absolutely undeniable. Keep that beautiful flame bright today! 💕",
      "Distance means so little when your hearts are this tightly synced. Hearing how much you care about each other feels like a scene straight out of a beautiful romance movie. 🎬",
      "You two are completely adorable! Honestly, keeping that playful flirting check-in alive is the real superpower of Love Link. Deeply inspired by you both today. 💫"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  // 3. Planning/Future/Dreams
  if (
    text.includes("future") || 
    text.includes("dream") || 
    text.includes("marry") || 
    text.includes("marriage") || 
    text.includes("wedding") || 
    text.includes("house") || 
    text.includes("travel") || 
    text.includes("trip") ||
    text.includes("plan")
  ) {
    const options = [
      "Walking toward a shared future is the absolute greatest adventure of all. Your saved dreams and coastal milestones are leading you to beautiful places. 🌊",
      "Building a life together is about these tiny, intentional daily acts. You are mapping out a truly stunning sanctuary step by step! 🗺️",
      "I love these future plans of yours. It shows how deeply committed you are to filling each other's schedules with warmth and travel. Keep writing your shared story! 📖"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  // 4. Playful/Humor/Interactive chat
  if (
    text.includes("joke") || 
    text.includes("funny") || 
    text.includes("haha") || 
    text.includes("lol") || 
    text.includes("laugh") || 
    text.includes("game")
  ) {
    const options = [
      "Haha, you two have the absolute best banter! Never lose that playful spirit—it's the sweet spark that keeps relationships eternally young. 😭⚡",
      "You two are so incredibly cute together! Laughing side-by-side is the ultimate love therapy, and you both are master practitioners! 🎨",
      "Playful teasing is definitely your superpower. Keep making each other smile; it's the heartbeat of Love Link! 💖"
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  // 5. Normal conversations / check-ins
  const defaults = [
    "Just checked the romantic connection aura, and there's such a lovely emotional harmony in this space today. I'm proud to watch over your sanctuary! ✨",
    "I'm right here checking in! The best part of today is seeing you make authentic time for one another amidst all the daily noise. How is everything else going? 🌸",
    "Standing by, keeping your connection safe and emotionally warm. Tell me, what's occupying your beautiful hearts at this exact moment? 🕯️"
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

/**
 * Maps standard OpenRouter chat formats to native @google/genai Content formats.
 * Normalizes system instruction blocks and maps "assistant" roles to "model" natively.
 */
async function mapMessagesToGemini(messages: any[]) {
  let systemInstruction = "";
  const contents: any[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction += (systemInstruction ? "\n" : "") + msg.content;
      continue;
    }

    const role = msg.role === "assistant" ? "model" : "user";
    const parts: any[] = [];

    if (typeof msg.content === "string") {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text") {
          parts.push({ text: part.text });
        } else if (part.type === "image_url" && part.image_url?.url) {
          const inlineDataPart = await urlToInlineData(part.image_url.url);
          if (inlineDataPart) {
            parts.push(inlineDataPart);
          }
        }
      }
    }

    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }

  return { systemInstruction, contents };
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" }
  });
  const PORT = 3000;

  // Registry for direct fast WebRTC calling signaling
  const activeSockets = new Map<string, string>(); // userId -> socketId
  const activeCallRooms = new Map<string, { callerId: string, calleeId: string, status: string }>(); // callId -> details

  io.on("connection", (socket) => {
    let currentUserId: string | null = null;
    let currentSpaceId: string | null = null;

    socket.on("register-user", ({ userId, coupleSpaceId }) => {
      currentUserId = userId;
      currentSpaceId = coupleSpaceId;
      activeSockets.set(userId, socket.id);
      socket.join(coupleSpaceId);
      socket.join(`user_${userId}`);
      console.log(`[Socket.IO Registry] Registered user ${userId} in space ${coupleSpaceId} with socket ${socket.id}`);
    });

    socket.on("call-internal", ({ toUserId, callType, callId, offer }) => {
      console.log(`[Socket.IO Calling] Direct call offer from ${currentUserId} to ${toUserId}, Type: ${callType}`);
      const receiverSocketId = activeSockets.get(toUserId);
      console.log(`[Socket.IO Register] Active Socket Map Keys:`, Array.from(activeSockets.keys()));
      console.log(`[Socket.IO Calling] Target user id: ${toUserId} -> Socket ID found: ${receiverSocketId}`);
      
      activeCallRooms.set(callId, {
        callerId: currentUserId || '',
        calleeId: toUserId,
        status: 'calling'
      });
      if (receiverSocketId) {
        socket.to(receiverSocketId).emit("incoming-call-internal", {
          fromUserId: currentUserId,
          callType,
          callId,
          offer
        });
        console.log(`[Socket.IO Calling] Successfully dispatched call invitation to socket ${receiverSocketId}`);
      } else {
        console.warn(`[Socket.IO Calling] Receiver ${toUserId} is not active in the Socket Registry map! Call might go unanswered unless FCM wakes them.`);
      }
    });

    socket.on("ringing-internal", ({ toUserId, callId }) => {
       const receiverSocketId = activeSockets.get(toUserId);
       if (receiverSocketId) {
          socket.to(receiverSocketId).emit("call-ringing-internal", { callId });
       }
    });

    socket.on("accept-call-internal", ({ toUserId, callId, answer }) => {
      console.log(`[Socket.IO Calling] Call accepted by ${currentUserId} for ${toUserId}`);
      const receiverSocketId = activeSockets.get(toUserId);
      const call = activeCallRooms.get(callId);
      if (call) call.status = 'connecting';
      if (receiverSocketId) {
        socket.to(receiverSocketId).emit("call-accepted-internal", {
          fromUserId: currentUserId,
          callId,
          answer
        });
      }
    });

    socket.on("ice-candidate-internal", ({ toUserId, callId, candidate }) => {
      const receiverSocketId = activeSockets.get(toUserId);
      if (receiverSocketId) {
        socket.to(receiverSocketId).emit("ice-candidate-internal", {
          fromUserId: currentUserId,
          callId,
          candidate
        });
      }
    });

    socket.on("webrtc-connected-internal", ({ toUserId, callId }) => {
       console.log(`[Socket.IO Calling] WebRTC connection established between ${currentUserId} and ${toUserId}`);
       const call = activeCallRooms.get(callId);
       if (call) call.status = 'connected';
       const receiverSocketId = activeSockets.get(toUserId);
       if (receiverSocketId) {
          socket.to(receiverSocketId).emit("webrtc-connected-internal", { callId });
       }
    });

    socket.on("end-call-internal", ({ toUserId, callId, reason }) => {
      console.log(`[Socket.IO Calling] Call ended by ${currentUserId} for call ${callId}`);
      activeCallRooms.delete(callId);
      const receiverSocketId = activeSockets.get(toUserId);
      if (receiverSocketId) {
        socket.to(receiverSocketId).emit("call-ended-internal", {
          callId,
          reason
        });
      }
    });

    socket.on("heartbeat-internal", () => {
       // Keep alive
    });

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
    });

    socket.on("typing", ({ roomId, user }) => {
      socket.to(roomId).emit("typing", user);
    });

    socket.on("stop_typing", ({ roomId, user }) => {
      socket.to(roomId).emit("stop_typing", user);
    });

    // Drawing Sync
    socket.on('draw-stroke', ({ roomId, strokeData }) => {
      socket.to(roomId).emit('stroke-received', strokeData);
    });

    socket.on('canvas-clear', (roomId) => {
      socket.to(roomId).emit('clear-received');
    });

    // Browser Sync
    socket.on('browser-navigate', ({ roomId, url }) => {
      socket.to(roomId).emit('browser-navigated', url);
    });

    socket.on('browser-scroll', ({ roomId, scrollY }) => {
      socket.to(roomId).emit('browser-scrolled', scrollY);
    });

    // Story/Experience Sync
    socket.on('experience-update', ({ roomId, state }) => {
      socket.to(roomId).emit('experience-updated', state);
    });
    
    socket.on("disconnect", () => {
      if (currentUserId) {
        console.log(`[Socket.IO Register] User ${currentUserId} disconnected`);
        activeSockets.delete(currentUserId);
        
        // Find if this user was in any active call and end it cleanly to prevent ghost ringing
        activeCallRooms.forEach((call, callId) => {
           if (call.callerId === currentUserId || call.calleeId === currentUserId) {
              const partnerId = call.callerId === currentUserId ? call.calleeId : call.callerId;
              const partnerSocketId = activeSockets.get(partnerId);
              console.log(`[Socket.IO Calling] Cleaning up active call ${callId} due to disconnect of ${currentUserId}`);
              if (partnerSocketId) {
                 socket.to(partnerSocketId).emit("call-ended-internal", {
                    callId,
                    reason: "partner-disconnected"
                 });
              }
              activeCallRooms.delete(callId);
           }
        });
      }
    });
  });

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Start the server with OpenRouter integrations

  app.get("/test-key", (req, res) => {
    res.json({ key: "cleared" });
  });

  // Call Notification Webhook (FCM) - Optimized for CallKeep & Wazo background dispatch
  app.post("/call-notification", async (req, res) => {
    try {
      const { token, title, body, callData } = req.body;
      console.log("[FCM Push Webhook received incoming request]:", { token, title, body, callId: callData?.id });

      if (!token) {
        return res.status(400).json({ error: "Missing receiver FCM token." });
      }

      // Lazily initialize firebase-admin SDK if env variables/credential files exist
      let messagingInstance: any = null;
      try {
        const admin = await import("firebase-admin");
        if (admin.apps.length === 0) {
          const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
          if (serviceAccountVar) {
            console.log("[FCM Server Worker] Parsing Service Account JSON credential...");
            const serviceAccount = JSON.parse(serviceAccountVar);
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount)
            });
          } else {
            console.log("[FCM Server Worker] Standard Service Account Env empty. Attempting Application Default Credentials...");
            admin.initializeApp();
          }
        }
        messagingInstance = admin.messaging();
      } catch (adminErr) {
        console.warn("[FCM Server Worker] firebase-admin initialized failover or credentials missing. Proceeding with verbose logging:", adminErr);
      }

      // Build THE ULTIMATE DATA-ONLY high-priority payload for React Native Background/CallKeep
      const payload: any = {
        token: token,
        // High-priority Android delivery configuration
        android: {
          priority: "high",
          ttl: 0, // Instant receipt
        },
        // Waking iOS APNs VOIP device background handlers safely
        apns: {
          headers: {
            "apns-priority": "10",
            "apns-push-type": "voip",
          },
          payload: {
            aps: {
              contentAvailable: true,
            },
          },
        },
        // Strict Data-only representation (DO NOT provide notification node, allowing JS service run)
        data: {
          type: "incoming_call",
          callUUID: callData?.id || "unknown",
          callerName: callData?.callerDisplayName || callData?.displayName || "Love Link Partner",
          callType: callData?.type || "voice",
        },
      };

      console.log("[FCM Server Worker] Dispatched Unified Payload to Google FCM Gateway API:", JSON.stringify(payload, null, 2));

      if (messagingInstance) {
        const response = await messagingInstance.send(payload);
        console.log("[FCM Server Worker SUCCESS] Message pushed securely via Firebase Admin:", response);
        return res.json({ success: true, messageId: response, payload });
      } else {
        console.log("[FCM Server Worker MOCK] Simulated send success, wait for Firebase credentials upload.");
        return res.json({ 
          success: true, 
          simulated: true, 
          message: "Payload constructed and validated successfully.", 
          payload 
        });
      }
    } catch (error: any) {
      console.error("[FCM Server Worker Critical Error]:", error);
      res.status(500).json({ error: error.message || "FCM transmission gateway pipeline fail." });
    }
  });

  // Unified AI Endpoints (Proxies)
  app.post("/api/ai/stream", async (req, res) => {
    const { messages, model } = req.body;

    console.log("[Proxy Stream Call Received]:", {
      requestedModel: model,
      messagesCount: messages?.length,
      lastMessageBlock: messages?.[messages.length - 1]
    });

    // Option A: Active Gemini Direct Native Connection Integration
    if (geminiClient) {
      let headersSent = false;
      try {
        const { systemInstruction, contents } = await mapMessagesToGemini(messages);
        
        console.log("[Proxy Stream direct Gemini API]: Launching native stream generation...");
        const responseStream = await geminiClient.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction: systemInstruction || undefined,
            temperature: 0.7,
          }
        });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        headersSent = true;

        for await (const chunk of responseStream) {
          const chunkText = chunk.text || "";
          
          // Mimic OpenAI SSE structure for seamless frontend execution
          const ssePayload = JSON.stringify({
            choices: [{
              delta: {
                content: chunkText
              }
            }]
          });
          res.write(`data: ${ssePayload}\n\n`);
        }
        
        res.write("data: [DONE]\n\n");
        console.log("[Proxy Stream direct Gemini API]: Native Stream completed successfully.");
        return res.end();
      } catch (gemError: any) {
        console.error("[Proxy Stream direct Gemini API FAILURE]: Recovering to OpenRouter legacy config:", gemError);
        const errMessage = gemError?.message || String(gemError);
        if (
          errMessage.includes("leaked") || 
          errMessage.includes("PERMISSION_DENIED") || 
          errMessage.includes("API_KEY_INVALID") || 
          errMessage.includes("API key not valid") ||
          errMessage.includes("403")
        ) {
          console.warn("[Love Link AI Kernel]: GEMINI_API_KEY appears leaked or invalid. Deactivating native client for this session.");
          geminiClient = null;
        }

        if (headersSent) {
          console.error("[Proxy Stream direct Gemini API FAILURE]: EventStream headers were already sent. Terminating client connection safely.");
          res.write(`data: {"error": "Native streaming failed mid-stream."}\n\n`);
          res.write("data: [DONE]\n\n");
          return res.end();
        }
      }
    }

    // Option B: Legacy OpenRouter Forwarder with local Simulated Companion AI Fallback
    try {
      const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        console.log("[Love Link AI Kernel]: No valid API keys detected. Activating immersive fallback companion simulations.");
        
        // SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const fullSimulatedText = getSimulatedCompanionResponse(messages);
        
        // Simulating incremental token stream
        const tokens = fullSimulatedText.split(/(\s+)/);
        
        for (const token of tokens) {
          // Send individual words with slight micro-delays for human-like typing
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 20 + 20)); // 20-40ms typing effect
          
          const ssePayload = JSON.stringify({
            choices: [{
              delta: {
                content: token
              }
            }]
          });
          res.write(`data: ${ssePayload}\n\n`);
        }
        
        res.write("data: [DONE]\n\n");
        return res.end();
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://lovelink.app", // Required by OpenRouter
          "X-Title": "Love Link"
        },
        body: JSON.stringify({
          model: model || "deepseek/deepseek-chat",
          messages,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter Stream returned HTTP ${response.status}: ${errorText}`);
      }

      // Set headers for SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (!response.body) {
        return res.status(500).send("Response stream body is empty.");
      }

      // Pipe the stream from OpenRouter to our response
      const reader = response.body.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      
      res.end();
    } catch (error: any) {
      console.error("[Stream Proxy Critical Error]:", error);
      res.status(500).json({ error: error.message || "Streaming context pipeline error." });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    const { messages, model } = req.body;

    console.log("[Proxy Chat Call Received]:", {
      requestedModel: model,
      messagesCount: messages?.length,
      lastMessageBlock: messages?.[messages.length - 1]
    });

    // Option A: Active Gemini Direct Native Connection Integration
    if (geminiClient) {
      try {
        const { systemInstruction, contents } = await mapMessagesToGemini(messages);
        
        console.log("[Proxy Chat direct Gemini API]: Requesting content generation...");
        const response = await geminiClient.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction: systemInstruction || undefined,
            temperature: 0.7,
          }
        });

        const reply = response.text || "";
        console.log(`[Proxy Chat direct Gemini API SUCCESS]: Response of ${reply.length} chars delivered.`);
        return res.json({ reply });
      } catch (gemError: any) {
        console.error("[Proxy Chat direct Gemini API FAILURE]: Recovering to OpenRouter config:", gemError);
        const errMessage = gemError?.message || String(gemError);
        if (
          errMessage.includes("leaked") || 
          errMessage.includes("PERMISSION_DENIED") || 
          errMessage.includes("API_KEY_INVALID") || 
          errMessage.includes("API key not valid") ||
          errMessage.includes("403")
        ) {
          console.warn("[Love Link AI Kernel]: GEMINI_API_KEY appears leaked or invalid. Deactivating native client for this session.");
          geminiClient = null;
        }
      }
    }

    // Option B: OpenRouter Proxy Chat with local Simulated Companion AI Fallback
    try {
      const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        console.log("[Love Link AI Kernel - Non-streaming]: No valid API keys detected. Activating immersive fallback companion simulations.");
        const reply = getSimulatedCompanionResponse(messages);
        return res.json({ reply });
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://lovelink.app",
          "X-Title": "Love Link"
        },
        body: JSON.stringify({
          model: model || "deepseek/deepseek-chat",
          messages
        })
      });

      // FIX 3: STRICT API RESPONSE VALIDATION
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter Chat returned HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Strict response payload check
      if (!data || !data.choices || !data.choices[0]?.message) {
        throw new Error("Invalid response JSON block from OpenRouter.");
      }

      const reply = data.choices[0].message.content || "";
      console.log(`[Proxy Chat legacy OpenRouter SUCCESS]: Response of ${reply.length} chars delivered.`);
      res.json({ reply });
    } catch (error: any) {
      console.error("[Proxy Chat Critical Error]:", error);
      res.status(500).json({ error: error.message || "AI communications failed." });
    }
  });

  app.post("/api/ai/image", async (req, res) => {
    try {
      const { prompt, model } = req.body;
      const apiKey = process.env.EXPO_PUBLIC_TOGETHER_API_KEY || process.env.TOGETHER_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Together AI API Key not configured." });
      }

      const response = await fetch("https://api.together.xyz/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model || "black-forest-labs/FLUX.1-schnell",
          prompt,
          n: 1,
          width: 1024,
          height: 1024,
          steps: 4,
          response_format: "url"
        })
      });

      const data = await response.json();
      const imageUrl = data?.data?.[0]?.url || "";
      res.json({ imageUrl });
    } catch (error) {
      console.error("Together AI Proxy Error:", error);
      res.status(500).json({ error: "Image generation failed." });
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
    // In actual production deployment we'd serve dist/
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
