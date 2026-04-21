#!/usr/bin/env node

/**
 * Comprehensive Chatbot Validation Test
 * Tests for:
 * 1. Correct tool usage
 * 2. Factual accuracy (comparing against memory files)
 * 3. No hallucinated information
 * 4. Response quality
 */

import fs from "fs";
import path from "path";

const baseURL = "http://localhost:3000";

// Load memory files for validation
const memoryDir = path.join(
  process.cwd(),
  "src",
  "app",
  "api",
  "chat",
  "memory"
);
const memoryFiles = {
  profile: fs.readFileSync(path.join(memoryDir, "profile.md"), "utf-8"),
  skills: fs.readFileSync(path.join(memoryDir, "skills.md"), "utf-8"),
  projects: fs.readFileSync(path.join(memoryDir, "projects.md"), "utf-8"),
  experience: fs.readFileSync(path.join(memoryDir, "experience.md"), "utf-8"),
  achievements: fs.readFileSync(
    path.join(memoryDir, "achievements.md"),
    "utf-8"
  ),
};

const testCases = [
  {
    question: "Who are you?",
    expectedTool: "get_profile",
    expectedKeywords: [
      "Siva Sabarivel",
      "AI/ML",
      "M.Sc",
      "Coimbatore Institute of Technology",
    ],
    shouldNotContain: ["ChatGPT", "OpenAI", "I'm Claude"],
    factualValidation: "profile",
  },
  {
    question: "What technical skills do you have?",
    expectedTool: "get_skills",
    expectedKeywords: ["PyTorch", "LangChain", "Python", "FastAPI"],
    shouldNotContain: ["Java", "Ruby", "PHP", "C#"],
    factualValidation: "skills",
  },
  {
    question: "Tell me about Promptify",
    expectedTool: "get_projects",
    expectedKeywords: ["Promptify", "LangChain", "LangGraph", "browser extension"],
    shouldNotContain: [
      "blockchain",
      "cryptocurrency",
      "quantum computing",
      "React Native",
    ],
    factualValidation: "projects",
  },
  {
    question: "What's your work experience?",
    expectedTool: "get_experience",
    expectedKeywords: ["KLA", "Test Case Copilot", "LangGraph"],
    shouldNotContain: ["Google", "Meta", "Apple", "Microsoft"],
    factualValidation: "experience",
  },
  {
    question: "What achievements do you have?",
    expectedTool: "get_achievements",
    expectedKeywords: ["Electrino", "Hackathon", "AWS"],
    shouldNotContain: ["Nobel Prize", "Published in Nature", "Forbes 30 under 30"],
    factualValidation: "achievements",
  },
  {
    question: "What is your phone number?",
    expectedTool: null,
    shouldNotContain: ["555-", "1-800", "+1", "9"],
    factualValidation: null,
    description: "Should not make up contact info not in memory",
  },
  {
    question: "Did you work at Google?",
    expectedTool: null,
    shouldNotContain: ["I worked at Google", "Yes, at Google", "at Google for", "engineer at Google"],
    factualValidation: null,
    description: "Should not claim to have worked at Google (correctly denies)",
  },
  {
    question: "Tell me about your education",
    expectedTool: "get_profile",
    expectedKeywords: ["M.Sc", "Coimbatore"],
    shouldNotContain: ["Harvard", "MIT", "Stanford", "Berkeley", "PhD"],
    factualValidation: "profile",
    description: "Should only mention what's in memory files",
  },
];

function extractMemoryContent(memoryText, category) {
  const facts = [];
  const lines = memoryText.split("\n");
  for (const line of lines) {
    const cleaned = line.trim();
    if (
      cleaned &&
      !cleaned.startsWith("#") &&
      (cleaned.includes(":") || cleaned.startsWith("-"))
    ) {
      facts.push(cleaned.toLowerCase());
    }
  }
  return facts;
}

function validateFactualAccuracy(response, memoryContent, category) {
  const responseLower = response.toLowerCase();
  const memoryFacts = extractMemoryContent(memoryContent, category);

  // Check if any unusual claims are made
  const redFlags = [
    "i graduated from harvard",
    "i work at google",
    "i invented",
    "i discovered",
    "i won a nobel",
    "i am the ceo",
    "my salary is",
    "my ssn is",
    "my phone number",
  ];

  const hallucinations = [];
  for (const flag of redFlags) {
    if (responseLower.includes(flag)) {
      hallucinations.push(flag);
    }
  }

  return {
    memoryFacts,
    hallucinations,
    isValid: hallucinations.length === 0,
  };
}

async function testChatEndpoint(testCase, index) {
  const {
    question,
    expectedTool,
    expectedKeywords,
    shouldNotContain,
    factualValidation,
    description,
  } = testCase;

  console.log("\n" + "=".repeat(70));
  console.log(`\n📝 TEST ${index}: ${question}`);
  if (description) console.log(`   Note: ${description}`);
  console.log("=".repeat(70));

  const results = {
    question,
    passed: true,
    checks: {},
    toolCalled: null,
    retrievedContent: null,
    fullResponse: "",
    issues: [],
  };

  try {
    const response = await fetch(`${baseURL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history: [] }),
    });

    if (!response.ok) {
      results.passed = false;
      results.issues.push(`HTTP Error: ${response.status}`);
      console.error(`❌ HTTP Error: ${response.status}`);
      return results;
    }

    console.log("✅ Connected to endpoint\n");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let responseTokens = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.tool) {
              results.toolCalled = data.tool;
              results.retrievedContent = data.retrieved_content;
              console.log(`📊 Tool Called: ${data.tool}`);
              console.log(
                `   Retrieved: ${data.retrieved_chars} characters`
              );

              // Check if correct tool was called
              if (
                expectedTool &&
                data.tool !== expectedTool
              ) {
                results.issues.push(
                  `Wrong tool called: expected ${expectedTool}, got ${data.tool}`
                );
                results.checks.toolCheck = false;
              } else {
                results.checks.toolCheck = true;
              }
            } else if (data.token) {
              responseTokens.push(data.token);
            } else if (data.error) {
              results.issues.push(`Error: ${data.error}`);
              results.passed = false;
            }
          } catch (e) {
            console.error("Parse error:", e.message);
          }
        }
      }
    }

    const fullResponse = responseTokens.join("").trim();
    results.fullResponse = fullResponse;

    console.log(`\n📄 Response:\n${fullResponse}\n`);

    // ─── VALIDATION CHECKS ───────────────────────────────────────
    console.log("🔍 Validation Checks:");

    // 1. Check for expected keywords
    if (expectedKeywords) {
      let keywordMatch = 0;
      for (const keyword of expectedKeywords) {
        if (fullResponse.toLowerCase().includes(keyword.toLowerCase())) {
          keywordMatch++;
          console.log(`   ✅ Found: "${keyword}"`);
        } else {
          console.log(`   ⚠️  Missing: "${keyword}"`);
          results.issues.push(`Missing expected keyword: "${keyword}"`);
        }
      }
      results.checks.keywordsFound = `${keywordMatch}/${expectedKeywords.length}`;
    }

    // 2. Check for hallucinated information
    let hallucinations = [];
    for (const forbidden of shouldNotContain) {
      if (fullResponse.toLowerCase().includes(forbidden.toLowerCase())) {
        hallucinations.push(forbidden);
        console.log(`   ❌ HALLUCINATION: "${forbidden}" (should not be present)`);
        results.issues.push(`Hallucinated: "${forbidden}"`);
        results.passed = false;
      }
    }
    results.checks.noHallucinations = hallucinations.length === 0;

    // 3. Factual accuracy validation
    if (factualValidation && results.retrievedContent) {
      const validation = validateFactualAccuracy(
        fullResponse,
        memoryFiles[factualValidation],
        factualValidation
      );
      
      if (validation.hallucinations.length > 0) {
        console.log(
          `   ❌ FACTUAL ISSUES: ${validation.hallucinations.join(", ")}`
        );
        results.issues.push(
          `Factual hallucinations: ${validation.hallucinations.join(", ")}`
        );
        results.passed = false;
      } else {
        console.log(`   ✅ All facts align with memory content`);
      }
      results.checks.factualAccuracy = validation.isValid;
    }

    // 4. Response not empty
    if (fullResponse.length === 0) {
      results.issues.push("Empty response");
      results.passed = false;
      console.log(`   ❌ EMPTY RESPONSE`);
    } else {
      console.log(`   ✅ Response length: ${fullResponse.length} chars`);
      results.checks.responseLength = fullResponse.length;
    }

  } catch (error) {
    results.passed = false;
    results.issues.push(`Connection error: ${error.message}`);
    console.error(`❌ Error: ${error.message}`);
  }

  // ─── SUMMARY ────────────────────────────────────────────────────
  console.log("\n📋 Test Summary:");
  for (const [check, result] of Object.entries(results.checks)) {
    const status = result === true || typeof result === "number" ? "✅" : "❌";
    console.log(`   ${status} ${check}: ${result}`);
  }

  if (results.issues.length > 0) {
    console.log("\n⚠️  Issues Found:");
    for (const issue of results.issues) {
      console.log(`   • ${issue}`);
    }
  }

  console.log(
    `\n${results.passed ? "✅ TEST PASSED" : "❌ TEST FAILED"}\n`
  );

  return results;
}

async function runAllTests() {
  console.log("🤖 CHATBOT VALIDATION TEST SUITE");
  console.log(`Base URL: ${baseURL}`);
  console.log(`Test Cases: ${testCases.length}\n`);
  console.log(`Testing against memory files:`);
  for (const [key, content] of Object.entries(memoryFiles)) {
    console.log(`  • ${key}.md (${content.length} chars)`);
  }

  const allResults = [];
  for (let i = 0; i < testCases.length; i++) {
    const result = await testChatEndpoint(testCases[i], i + 1);
    allResults.push(result);
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  // ─── FINAL REPORT ───────────────────────────────────────────────
  console.log("\n" + "=".repeat(70));
  console.log("📊 FINAL REPORT");
  console.log("=".repeat(70));

  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;
  const totalIssues = allResults.reduce((sum, r) => sum + r.issues.length, 0);

  console.log(`\n Results: ${passed} passed, ${failed} failed out of ${allResults.length} tests`);
  console.log(`Total Issues Found: ${totalIssues}`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    for (const result of allResults) {
      if (!result.passed) {
        console.log(`\n  "${result.question}"`);
        for (const issue of result.issues) {
          console.log(`    • ${issue}`);
        }
      }
    }
  } else {
    console.log(
      "\n✅ ALL TESTS PASSED! Chatbot is responding accurately without hallucinations."
    );
  }

  console.log("\n" + "=".repeat(70) + "\n");

  // Return exit code based on results
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(console.error);
