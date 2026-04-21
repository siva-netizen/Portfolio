/**
 * Health Check System for Groq API Availability
 * Periodically tests Groq availability and caches result
 * Routes requests to Groq or NLP fallback based on health status
 */

import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";

interface HealthCheckState {
  isHealthy: boolean;
  lastChecked: number;
  consecutiveFailures: number;
  checkedAt: Date;
}

let healthState: HealthCheckState = {
  isHealthy: true, // Start optimistic
  lastChecked: Date.now(),
  consecutiveFailures: 0,
  checkedAt: new Date(),
};

// Configuration
const HEALTH_CHECK_INTERVAL = 30000; // Check every 30 seconds
const REQUEST_THRESHOLD = 5; // Check after every 5 requests
const CONSECUTIVE_FAILURES_THRESHOLD = 2; // Mark unhealthy after 2 consecutive failures

let requestsSinceLastCheck = 0;

/**
 * Simple health check - try a minimal Groq call
 */
async function performHealthCheck(): Promise<boolean> {
  try {
    console.log("[Health Check] Testing Groq API availability...");
    
    const healthCheckLLM = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      apiKey: process.env.GROQ_API_KEY,
      temperature: 0.05,
      maxTokens: 10, // Very short response expected
    });

    // Set a strict timeout (5 seconds)
    const healthCheckPromise = healthCheckLLM.invoke([
      new HumanMessage("hi"),
    ]);
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Health check timeout")), 5000)
    );

    await Promise.race([healthCheckPromise, timeoutPromise]);
    
    console.log("[Health Check] ✅ Groq is available");
    healthState.isHealthy = true;
    healthState.consecutiveFailures = 0;
    healthState.lastChecked = Date.now();
    healthState.checkedAt = new Date();
    
    return true;
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    
    // Check for rate limit or network errors
    const isRateLimited = errorMsg.includes("429") || errorMsg.includes("rate");
    const isNetworkError = errorMsg.includes("timeout") || errorMsg.includes("ECONNREFUSED");
    
    console.warn(`[Health Check] ❌ Groq unavailable: ${errorMsg}`);
    
    healthState.consecutiveFailures++;
    
    // Mark unhealthy after threshold failures
    if (healthState.consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD) {
      healthState.isHealthy = false;
      console.warn(
        `[Health Check] ⚠️  Marked as unhealthy (${healthState.consecutiveFailures} failures)`
      );
    }
    
    healthState.lastChecked = Date.now();
    healthState.checkedAt = new Date();
    
    return false;
  }
}

/**
 * Get current health status, performing check if needed
 */
export async function getGroqHealth(): Promise<boolean> {
  const now = Date.now();
  const timeSinceLastCheck = now - healthState.lastChecked;

  // Check if we need to perform a health check
  const shouldCheck =
    timeSinceLastCheck > HEALTH_CHECK_INTERVAL || // Time-based check
    requestsSinceLastCheck >= REQUEST_THRESHOLD; // Request-based check

  if (shouldCheck) {
    requestsSinceLastCheck = 0;
    await performHealthCheck();
  } else {
    requestsSinceLastCheck++;
  }

  return healthState.isHealthy;
}

/**
 * Force an immediate health check
 */
export async function forceHealthCheck(): Promise<boolean> {
  requestsSinceLastCheck = 0;
  return await performHealthCheck();
}

/**
 * Get health status info
 */
export function getHealthStatus() {
  return {
    isHealthy: healthState.isHealthy,
    consecutiveFailures: healthState.consecutiveFailures,
    lastChecked: healthState.checkedAt,
    timeSinceLastCheck: Date.now() - healthState.lastChecked,
  };
}

/**
 * Reset health state (useful for testing)
 */
export function resetHealthCheck() {
  healthState = {
    isHealthy: true,
    lastChecked: Date.now(),
    consecutiveFailures: 0,
    checkedAt: new Date(),
  };
  requestsSinceLastCheck = 0;
  console.log("[Health Check] Reset health state");
}
