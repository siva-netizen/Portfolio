/**
 * Fallback NLP Bot - Responds to user queries using intent classification and memory files
 * Triggered when Groq API is rate-limited or unavailable
 */

import { classifyIntent, getSuggestions, Intent } from "./nlp-classifier";
import fs from "fs";
import path from "path";

function readMemory(filename: string): string {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "api", "chat", "memory", filename),
      "utf-8"
    );
    return raw;
  } catch (e: any) {
    return `No ${filename.replace(".md", "")} data available yet.`;
  }
}

function readSummary(filename: string): string {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "api", "chat", "memory", "summaries", filename),
      "utf-8"
    );
    return raw;
  } catch (e: any) {
    return "";
  }
}

// Load full memory for fallback if summaries unavailable
const MEMORY_CACHE: Record<string, string> = {
  profile: readMemory("profile.md"),
  experience: readMemory("experience.md"),
  projects: readMemory("projects.md"),
  skills: readMemory("skills.md"),
  achievements: readMemory("achievements.md"),
};

// Load summaries (abstracts) for concise responses in fallback
const SUMMARY_CACHE: Record<string, string> = {
  profile: readSummary("profile.md") || MEMORY_CACHE.profile,
  experience: readSummary("experience.md") || MEMORY_CACHE.experience,
  projects: readSummary("projects.md") || MEMORY_CACHE.projects,
  skills: readSummary("skills.md") || MEMORY_CACHE.skills,
  achievements: readSummary("achievements.md") || MEMORY_CACHE.achievements,
};

/**
 * Generate response templates based on intent and memory
 * Uses summaries for concise fallback responses
 */
function generateResponse(intent: Intent, userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  switch (intent) {
    case "profile":
      return `I'm Siva Sabarivel, an AI/ML engineer. Here's my profile:\n\n${SUMMARY_CACHE.profile}\n\nWould you like more details about my background?`;

    case "experience":
      return `Here's my work experience:\n\n${SUMMARY_CACHE.experience}\n\nWould you like to know more about any specific role?`;

    case "projects":
      return `Here are my key projects:\n\n${SUMMARY_CACHE.projects}\n\nInterested in learning more about any of these?`;

    case "skills":
      return `My technical expertise:\n\n${SUMMARY_CACHE.skills}\n\nDo you want details on any specific skill area?`;

    case "achievements":
      return `Here are my achievements and certifications:\n\n${SUMMARY_CACHE.achievements}\n\nAny particular achievement you'd like to discuss?`;

    case "contact":
      return `You can reach me through:\n\n- Email: sivasabarivel008@gmail.com\n- GitHub: https://github.com/siva-netizen\n- LinkedIn: https://www.linkedin.com/in/siva-sabarivel-46426026b/\n\nFeel free to connect with me on any of these platforms!`;

    case "general":
    default:
      // Check for specific queries
      if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
        return "Hello! 👋 I'm Siva, an AI/ML engineer. Feel free to ask me about my projects, experience, skills, or anything else you'd like to know!";
      }
      if (lowerMessage.includes("help")) {
        return "I can help you with:\n- My profile and background\n- Work experience\n- Projects I've built\n- Technical skills\n- Achievements and certifications\n- How to contact me\n\nWhat would you like to know?";
      }
      return "That's an interesting question! I'm a portfolio chatbot trained to discuss my work, skills, and projects. Ask me about any of these topics, or feel free to contact me directly!";
  }
}

export interface FallbackBotResponse {
  message: string;
  intent: Intent;
  confidence: number;
  suggestions: string[];
  isFromFallback: true;
}

/**
 * Process user message through fallback NLP bot
 */
export function processFallbackBot(userMessage: string): FallbackBotResponse {
  console.log("[Fallback Bot] Processing message:", userMessage.substring(0, 50));

  const classification = classifyIntent(userMessage);
  const response = generateResponse(classification.intent, userMessage);
  const suggestions = getSuggestions(classification.intent, classification.confidence);

  console.log(
    `[Fallback Bot] Intent: ${classification.intent}, Confidence: ${classification.confidence.toFixed(2)}`
  );

  return {
    message: response,
    intent: classification.intent,
    confidence: classification.confidence,
    suggestions,
    isFromFallback: true,
  };
}

/**
 * Stream fallback response word by word (for consistency with Groq response)
 */
export async function* streamFallbackResponse(message: string) {
  const words = message.split(" ");
  for (const word of words) {
    yield word + " ";
    // Simulate streaming delay
    await new Promise(r => setTimeout(r, 18));
  }
}
