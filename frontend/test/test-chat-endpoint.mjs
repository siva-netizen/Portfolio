#!/usr/bin/env node

/**
 * Test script for the chat endpoint
 * Tests:
 * 1. Profile retrieval
 * 2. Skills retrieval
 * 3. Projects retrieval
 * 4. Experience retrieval
 * 5. Achievements retrieval
 */

const baseURL = "http://localhost:3000";

const testQuestions = [
  "Who are you?", // Should trigger get_profile
  "What skills do you have?", // Should trigger get_skills
  "Tell me about your projects", // Should trigger get_projects
  "What's your work experience?", // Should trigger get_experience
  "What achievements do you have?", // Should trigger get_achievements
];

async function testChatEndpoint(question) {
  console.log("\n" + "=".repeat(60));
  console.log(`\nQuestion: ${question}`);
  console.log("=".repeat(60));

  try {
    const response = await fetch(`${baseURL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        history: [],
      }),
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }

    console.log("✅ Connected to endpoint\n");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let toolsCalled = [];
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
              console.log(`📊 Tool Called: ${data.tool}`);
              if (data.retrieved_content) {
                console.log(
                  `   Retrieved Content (first 200 chars):\n   ${data.retrieved_content.slice(0, 200).replace(/\n/g, "\n   ")}...`
                );
              }
              toolsCalled.push(data.tool);
            } else if (data.token) {
              responseTokens.push(data.token);
              process.stdout.write(data.token);
            } else if (data.done) {
              console.log("\n\n✅ Response complete");
            } else if (data.error) {
              console.error(`\n❌ Error: ${data.error}`);
            }
          } catch (e) {
            console.error("Parse error:", e.message);
          }
        }
      }
    }

    console.log("\n📝 Summary:");
    console.log(`   Tools called: ${toolsCalled.length > 0 ? toolsCalled.join(", ") : "None"}`);
    console.log(`   Response tokens: ${responseTokens.length}`);
    console.log(`   Total response length: ${responseTokens.join("").length} chars`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function runTests() {
  console.log("🚀 Starting Chat Endpoint Tests");
  console.log(`Base URL: ${baseURL}`);
  console.log(`Total questions to test: ${testQuestions.length}\n`);

  for (const question of testQuestions) {
    await testChatEndpoint(question);
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ All tests completed!");
  console.log("=".repeat(60) + "\n");
}

runTests().catch(console.error);
