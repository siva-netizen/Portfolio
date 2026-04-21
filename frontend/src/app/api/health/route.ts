/**
 * Health Check Endpoint
 * Provides information about Groq API availability and system health
 */

import { NextRequest } from "next/server";
import { getHealthStatus, forceHealthCheck } from "@/lib/health-check";

export async function GET(req: NextRequest) {
  try {
    // Force a fresh health check if requested
    const searchParams = req.nextUrl.searchParams;
    const force = searchParams.get("force") === "true";

    let health = getHealthStatus();

    if (force) {
      console.log("[Health Endpoint] Forcing fresh health check...");
      const isHealthy = await forceHealthCheck();
      health = getHealthStatus();
    }

    return new Response(
      JSON.stringify({
        status: health.isHealthy ? "healthy" : "unhealthy",
        groqAvailable: health.isHealthy,
        consecutiveFailures: health.consecutiveFailures,
        lastChecked: health.lastChecked,
        timeSinceLastCheck: Math.round(health.timeSinceLastCheck / 1000) + "s",
        timestamp: new Date().toISOString(),
        message: health.isHealthy
          ? "✅ Groq API is healthy - using full agentic chatbot"
          : "⚠️ Groq API is unhealthy - using NLP fallback bot",
      }),
      {
        status: health.isHealthy ? 200 : 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
