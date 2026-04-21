/**
 * NLP Intent Classifier - Lightweight intent classification using keyword matching
 * Used as fallback when Groq API is rate-limited or unavailable
 */

export type Intent = 
  | "profile"
  | "experience" 
  | "projects"
  | "skills"
  | "achievements"
  | "contact"
  | "general";

export interface ClassificationResult {
  intent: Intent;
  confidence: number;
  keywords: string[];
}

const INTENT_PATTERNS: Record<Intent, { keywords: string[]; synonyms: string[] }> = {
  profile: {
    keywords: ["who", "are", "you", "about", "yourself", "bio", "background", "introduce", "tell", "describe"],
    synonyms: ["name", "person", "founder", "creator", "developer", "identity"]
  },
  experience: {
    keywords: ["work", "experience", "job", "company", "employed", "worked", "role", "position", "kla", "intern", "engineer", "developer", "company", "workplace"],
    synonyms: ["career", "employment", "history", "background", "worked", "hire", "hire"]
  },
  projects: {
    keywords: ["project", "projects", "built", "build", "create", "created", "portfolio", "work", "promptify", "echo", "application", "app", "made", "develop"],
    synonyms: ["portfolio", "creations", "works", "github", "code", "building"]
  },
  skills: {
    keywords: ["skill", "skills", "technology", "tech", "languages", "frameworks", "tools", "stack", "python", "langchain", "pytorch", "know", "expertise", "familiar"],
    synonyms: ["expertise", "proficiency", "capable", "know", "familiar", "knowledge", "expert", "proficient"]
  },
  achievements: {
    keywords: ["award", "awards", "achievement", "achievements", "certification", "certifications", "accomplish", "accomplishment", "won", "recognition", "certified", "award"],
    synonyms: ["certificate", "badge", "honor", "success", "winner", "achieve"]
  },
  contact: {
    keywords: ["contact", "email", "phone", "reach", "message", "connect", "linkedin", "github", "social", "reach", "communication", "email", "get in touch"],
    synonyms: ["get in touch", "connection", "communicate", "touch base", "reach out", "contact info"]
  },
  general: {
    keywords: ["hello", "hi", "hey", "help", "how", "what", "where", "when", "thanks", "thank"],
    synonyms: ["greetings", "question", "assist", "greeting", "help"]
  }
};

/**
 * Extract keywords from text (case-insensitive, handle punctuation)
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 2);
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Classify user intent based on keywords and patterns
 */
export function classifyIntent(userMessage: string): ClassificationResult {
  const userKeywords = new Set(extractKeywords(userMessage));
  const scores: Record<Intent, number> = {
    profile: 0,
    experience: 0,
    projects: 0,
    skills: 0,
    achievements: 0,
    contact: 0,
    general: 0,
  };

  // Score each intent
  (Object.keys(INTENT_PATTERNS) as Intent[]).forEach(intent => {
    const pattern = INTENT_PATTERNS[intent];
    const allKeywords = new Set([...pattern.keywords, ...pattern.synonyms]);
    
    // Calculate similarity score with weighted matching
    let matchCount = 0;
    let totalMatches = 0;
    
    userKeywords.forEach(keyword => {
      if (allKeywords.has(keyword)) {
        matchCount += 3; // Exact match gets triple weight
        totalMatches++;
      } else {
        // Check for partial matches (substring)
        for (const patternKey of allKeywords) {
          if (patternKey.includes(keyword) || keyword.includes(patternKey)) {
            matchCount += 1;
            totalMatches++;
            break; // Count only once per keyword
          }
        }
      }
    });
    
    // Score based on match ratio
    const matchRatio = userKeywords.size > 0 ? matchCount / (userKeywords.size * 2) : 0;
    scores[intent] = Math.min(matchRatio, 1); // Cap at 1.0
  });

  // Find top intent
  let topIntent: Intent = "general";
  let topScore = 0;

  (Object.keys(scores) as Intent[]).forEach(intent => {
    if (scores[intent] > topScore) {
      topScore = scores[intent];
      topIntent = intent;
    }
  });

  // If no good match found, default to general
  if (topScore < 0.2) {
    topIntent = "general";
    topScore = 0.5; // Default confidence for unclear intent
  }

  return {
    intent: topIntent,
    confidence: topScore,
    keywords: Array.from(userKeywords),
  };
}

/**
 * Get follow-up suggestions based on intent and confidence
 */
export function getSuggestions(intent: Intent, confidence: number): string[] {
  if (confidence < 0.3) {
    return [
      "Tell me about your profile",
      "What projects have you built?",
      "What are your technical skills?",
      "What's your work experience?"
    ];
  }

  const suggestions: Record<Intent, string[]> = {
    profile: ["Tell me about your experience", "What projects have you built?"],
    experience: ["What skills do you have?", "Tell me about your projects"],
    projects: ["What technologies do you use?", "Tell me more about your experience"],
    skills: ["How have you used these skills?", "Tell me about your projects"],
    achievements: ["How did you achieve these?", "What challenges did you overcome?"],
    contact: ["Visit my portfolio", "Check my social profiles"],
    general: ["Tell me about your projects", "What's your background?"]
  };

  return suggestions[intent] || suggestions.general;
}
