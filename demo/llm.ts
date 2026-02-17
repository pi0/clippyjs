import type { MLCEngine } from "@mlc-ai/web-llm";

// https://github.com/mlc-ai/web-llm
// Tool use via structural tags
// Ref: https://github.com/mlc-ai/web-llm/blob/main/examples/structural-tag-tool-use

type ToolInvocation = { name: string; arguments: Record<string, unknown> };

const tools = [
  {
    name: "get_current_time",
    description: "Return the current date and time in a given timezone.",
    schema: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "IANA timezone name, defaults to UTC",
        },
      },
      required: [] as string[],
    },
  },
];

const toolResponseFormat = {
  type: "structural_tag",
  structural_tag: {
    type: "structural_tag",
    format: {
      type: "triggered_tags",
      triggers: ["<tool_call>"],
      tags: tools.map((t) => ({
        begin: `<tool_call>\n{"name": "${t.name}", "arguments": `,
        content: { type: "json_schema", json_schema: t.schema },
        end: "}\n</tool_call>",
      })),
      at_least_one: false,
      stop_after_first: false,
    },
  },
};

let engine: MLCEngine | null = null;
let chatHistory: { role: string; content: string }[] = [];

const chatBtn = document.getElementById("chat-btn") as HTMLButtonElement;
const chatStatus = document.getElementById("chat-status");
const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input") as HTMLInputElement;
const chatSend = document.getElementById("chat-send") as HTMLButtonElement;
const chatMic = document.getElementById("chat-mic") as HTMLButtonElement;

export function isReady() {
  return !!engine;
}

export function setAgent(name: string) {
  const toolList = tools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join("\n");
  chatHistory = [
    {
      role: "system",
      content: [
        `You are ${name}, a helpful desktop assistant from Windows 98. Keep responses very short and fun (1 sentence max).`,
        `You have tools available. To use one, emit a <tool_call> block.`,
        toolList,
      ].join("\n"),
    },
  ];
}

export function enableStartBtn() {
  chatBtn.disabled = false;
}

chatBtn.addEventListener("click", async () => {
  if (engine) {
    chatContainer.style.display = "";
    chatInput.focus();
    return;
  }

  chatBtn.disabled = true;
  chatStatus.textContent = "Loading model...";

  // Available models: https://github.com/mlc-ai/web-llm/blob/main/src/config.ts#L293
  // SmolLM2-135M-Instruct-q0f16-MLC          ~360 MB
  // SmolLM2-360M-Instruct-q4f16_1-MLC         ~376 MB
  // SmolLM2-360M-Instruct-q4f32_1-MLC         ~580 MB
  // TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC      ~697 MB
  // SmolLM2-360M-Instruct-q0f16-MLC           ~872 MB
  // Qwen2.5-0.5B-Instruct-q4f16_1-MLC         ~945 MB
  // Llama-3.2-1B-Instruct-q4f32_1-MLC        ~1.13 GB
  const selectedModel = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

  try {
    const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
    engine = await CreateMLCEngine(selectedModel, {
      initProgressCallback: (progress) => {
        chatStatus.textContent = progress.text;
      },
    });
    chatStatus.textContent = "Ready!";
    chatContainer.style.display = "";
    chatInput.focus();
  } catch (err) {
    console.error("Failed to load model:", err);
    chatStatus.textContent = "Failed: " + (err as Error).message;
    chatBtn.disabled = false;
  }
});

let onReplyStream: ((stream: AsyncIterable<string>) => void) | null = null;

export function onAgentReplyStream(
  cb: (stream: AsyncIterable<string>) => void,
) {
  onReplyStream = cb;
}

async function sendChat() {
  const text = chatInput.value.trim();
  if (!text || !engine) return;

  chatInput.value = "";
  chatSend.disabled = true;
  chatInput.disabled = true;

  appendChatMsg("You", text, "user");
  chatHistory.push({ role: "user", content: text });

  try {
    // First pass (non-streaming) to detect tool calls via structural tags
    const firstReply = await engine.chat.completions.create({
      messages: chatHistory as any,
      stream: false,
      max_tokens: 512,
      response_format: toolResponseFormat as any,
    });

    console.log("First pass reply:", firstReply);

    const content = firstReply.choices[0]?.message?.content || "";
    const calls = parseToolCalls(content);

    if (calls.length > 0) {
      // Execute tools and follow up with a streamed response
      chatHistory.push({ role: "assistant", content });
      const results = calls.map((c) => ({
        tool: c.name,
        result: executeTool(c),
      }));
      chatHistory.push({
        role: "user",
        content: `[Tool results]: ${JSON.stringify(results)}`,
      });
      const msgEl = appendChatMsg("Agent", "", "assistant");
      await streamReply(msgEl);
    } else {
      // No tool calls — display response directly
      appendChatMsg("Agent", content, "assistant");
      chatHistory.push({ role: "assistant", content });
      if (onReplyStream) {
        onReplyStream(
          (async function* () {
            yield content;
          })(),
        );
      }
    }
  } catch (err) {
    appendChatMsg("System", "Error: " + (err as Error).message, "user");
  }

  chatSend.disabled = false;
  chatInput.disabled = false;
  chatInput.focus();
}

chatSend.addEventListener("click", sendChat);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

// Speech-to-text (optional, Chrome/Edge)
const SpeechRecognition =
  (globalThis as any).SpeechRecognition ||
  (globalThis as any).webkitSpeechRecognition;

if (SpeechRecognition) {
  chatMic.style.display = "";
  let active = false; // user wants mic on
  let recognition: InstanceType<typeof SpeechRecognition> | null = null;

  function startRecognition() {
    if (recognition) return;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.addEventListener("result", (e: any) => {
      const last = e.results[e.results.length - 1];
      if (!last?.isFinal) return;
      const transcript = last[0]?.transcript?.trim();
      if (transcript) {
        chatInput.value = transcript;
        sendChat();
      }
    });

    recognition.addEventListener("end", () => {
      recognition = null;
      // Auto-restart if user still wants mic on (e.g. after TTS pause)
      if (active && !speechSynthesis.speaking) startRecognition();
    });

    recognition.addEventListener("error", () => {
      recognition = null;
      if (active) chatMic.classList.add("active");
    });

    recognition.start();
    chatMic.classList.add("active");
  }

  function stopRecognition() {
    recognition?.stop();
    recognition = null;
    chatMic.classList.remove("active");
  }

  chatMic.addEventListener("click", () => {
    active = !active;
    if (active) {
      startRecognition();
    } else {
      stopRecognition();
    }
  });

  // Pause recognition while agent TTS is speaking
  if ("speechSynthesis" in window) {
    const pollTTS = () => {
      if (!active) return;
      if (speechSynthesis.speaking && recognition) {
        recognition.stop();
        recognition = null;
      } else if (!speechSynthesis.speaking && !recognition) {
        startRecognition();
      }
    };
    setInterval(pollTTS, 200);
  }
}

// --- Internal helpers ---

function appendChatMsg(sender: string, text: string, role: string) {
  const div = document.createElement("div");
  div.className = `chat-msg chat-msg-${role}`;
  div.innerHTML = `<b>${sender}:</b> <span class="chat-msg-text"></span>`;
  div.querySelector(".chat-msg-text").textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

async function streamReply(msgEl: HTMLElement) {
  const chunks = await engine!.chat.completions.create({
    messages: chatHistory as any,
    stream: true,
  });

  let reply = "";

  async function* deltaStream() {
    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (!delta) continue;
      reply += delta;
      msgEl.querySelector(".chat-msg-text").textContent = reply;
      chatMessages.scrollTop = chatMessages.scrollHeight;
      yield delta;
    }
  }

  const stream = deltaStream();
  if (onReplyStream) {
    onReplyStream(stream);
  } else {
    for await (const _ of stream) {
      /* drain */
    }
  }

  chatHistory.push({ role: "assistant", content: reply });
}

function parseToolCalls(content: string): ToolInvocation[] {
  const regex = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g;
  const calls: ToolInvocation[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    try {
      const payload = JSON.parse(match[1]);
      if (typeof payload.name === "string" && payload.arguments !== undefined) {
        calls.push({ name: payload.name, arguments: payload.arguments });
      }
    } catch {
      // skip malformed tool calls
    }
  }
  return calls;
}

function executeTool(call: ToolInvocation): Record<string, unknown> {
  if (call.name === "get_current_time") {
    const timezone = String(call.arguments.timezone || "UTC");
    try {
      return {
        timezone,
        time: new Date().toLocaleString("en-US", { timeZone: timezone }),
      };
    } catch {
      return { timezone: "UTC", time: new Date().toISOString() };
    }
  }
  return { error: `Unknown tool: ${call.name}` };
}
