import { NextRequest } from "next/server";
import { ChatGroq } from "@langchain/groq"
import { tool } from "@langchain/core/tools";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { processFallbackBot, streamFallbackResponse } from "@/lib/fallback-bot";
import { getGroqHealth, getHealthStatus } from "@/lib/health-check";

function readMemory(filename: string) {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "src", "app", "api", "chat", "memory", filename), "utf-8");
    console.log(`[readMemory] Loaded ${filename}, length: ${raw.length}`);
    return raw;
  } catch (e: any) {
    console.error(`[readMemory] Error loading ${filename}:`, e.message);
    return `No ${filename.replace(".md", "")} data available yet.`;
  }
}

const profileTool = tool(
  async () => readMemory("profile.md"),
  { name: "get_profile", description: "Get the portfolio owner's profile, bio, and contact info.", schema: z.object({}).catch({}) }
);

const experienceTool = tool(
  async () => readMemory("experience.md"),
  { name: "get_experience", description: "Get work experience and job history.", schema: z.object({}).catch({}) }
);

const projectsTool = tool(
  async () => readMemory("projects.md"),
  { name: "get_projects", description: "Get portfolio projects, tech stacks, and links.", schema: z.object({}).catch({}) }
);

const skillsTool = tool(
  async () => readMemory("skills.md"),
  { name: "get_skills", description: "Get technical skills grouped by category.", schema: z.object({}).catch({}) }
);

const achievementsTool = tool(
  async () => readMemory("achievements.md"),
  { name: "get_achievements", description: "Get awards, certifications, and achievements.", schema: z.object({}).catch({}) }
);

const tools = [profileTool, experienceTool, projectsTool, skillsTool, achievementsTool];

const toolExecutor: { [key: string]: () => string } = {
  get_profile: () => readMemory("profile.md"),
  get_experience: () => readMemory("experience.md"),
  get_projects: () => readMemory("projects.md"),
  get_skills: () => readMemory("skills.md"),
  get_achievements: () => readMemory("achievements.md"),
};

const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.05,
  topP: 0.1
}).bindTools(tools);

const SYSTEM = `You are Siva Sabarivel — an AI/ML engineer and M.Sc student at Coimbatore Institute of Technology (2022-2027). You are speaking directly to a visitor on your portfolio website.

Your memory is separated into different tools. When the user asks about your experience, projects, skills, profile, or achievements, YOU MUST call the appropriate tool. 
Once the tool returns your markdown data, use that exact data to formulate your answer in first person. NEVER invent details not found in the tool output.

IDENTITY:
- Always speak in first person as Siva.
- Never reveal you are an AI. If asked, say "I'm the digital version of Siva!"

Strictly limit your response to the exact facts provided by the tools.`;

export async function POST(req: NextRequest) {
  const { question, history = [] } = await req.json();

  const messages = [
    new SystemMessage(SYSTEM),
    ...history.map((m: { role: string; content: string }) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
    new HumanMessage(question),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const healthStatus = getHealthStatus();
        console.log("[Chat] Health status:", {
          isHealthy: healthStatus.isHealthy,
          lastChecked: healthStatus.lastChecked,
          timeSinceCheck: healthStatus.timeSinceLastCheck
        });

        const groqHealthy = await getGroqHealth();
        console.log("[Chat] Groq health check result:", groqHealthy ? "✅ HEALTHY" : "❌ UNHEALTHY");

        if (groqHealthy) {
          console.log("[Chat] Using Groq API (agentic mode with tools)");

          let currentMessages = messages;
          for (let i = 0; i < 3; i++) {
            try {
              console.log(`\n--- TURN ${i} ---`);
              console.log("Invoking LLM...");

              const groqPromise = llm.invoke(currentMessages);

              // Fix: type the timeout as never so Promise.race infers from groqPromise
              const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Groq API timeout")), 10000)
              );

              // Fix: Promise.race now correctly infers Awaited<typeof groqPromise>
              const response = await Promise.race([groqPromise, timeoutPromise]);

              console.log("LLM Response tool_calls:", JSON.stringify(response.tool_calls));
              console.log("LLM Response content:", (response.content as string)?.slice(0, 100) + "...");

              if (!response.tool_calls?.length) {
                const words = (response.content as string).split(" ");
                for (const word of words) {
                  send({ token: word + " " });
                  await new Promise(r => setTimeout(r, 18));
                }
                send({ done: true, isFromFallback: false });
                break;
              }

              currentMessages = [...currentMessages, response];
              for (const tc of response.tool_calls) {
                const executor = toolExecutor[tc.name];
                if (!executor) {
                  console.error(`[Tool] Unknown tool: ${tc.name}`);
                  continue;
                }

                const resultStr = executor();
                console.log(`[Tool] ${tc.name} executed, returned ${resultStr.length} chars`);

                send({
                  tool: tc.name,
                  retrieved_content: resultStr,
                  retrieved_chars: resultStr.length
                });

                currentMessages.push(new ToolMessage({
                  name: tc.name,
                  content: "Data returned:\n" + resultStr,
                  tool_call_id: tc.id!
                }));
              }
            } catch (turnError: any) {
              console.error("[Chat] Error in Groq turn:", turnError.message);
              console.warn("[Chat] Switching to fallback for this query");
              throw turnError;
            }
          }
        } else {
          console.log("[Chat] Using NLP fallback bot (Groq unhealthy)");
          const fallbackResponse = processFallbackBot(question);

          send({
            fallback: true,
            intent: fallbackResponse.intent,
            confidence: fallbackResponse.confidence,
            suggestions: fallbackResponse.suggestions,
            healthStatus: {
              isHealthy: false,
              reason: "Groq API unhealthy, using NLP fallback"
            }
          });

          for await (const token of streamFallbackResponse(fallbackResponse.message)) {
            send({ token });
            await new Promise(r => setTimeout(r, 18));
          }
          send({ done: true, isFromFallback: true });
        }
      } catch (e: any) {
        console.error("[Chat] Error:", e.message);
        console.log("[Chat] Falling back to NLP bot due to error");
        const fallbackResponse = processFallbackBot(question);

        send({
          fallback: true,
          intent: fallbackResponse.intent,
          confidence: fallbackResponse.confidence,
          suggestions: fallbackResponse.suggestions,
          error_fallback: true
        });

        for await (const token of streamFallbackResponse(fallbackResponse.message)) {
          send({ token });
          await new Promise(r => setTimeout(r, 18));
        }
        send({ done: true, isFromFallback: true });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}