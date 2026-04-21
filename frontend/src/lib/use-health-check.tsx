/**
 * Health Check Hook for React Components
 * Monitors Groq API health and provides status updates
 */

import { useEffect, useState } from "react";

export interface HealthStatus {
  groqAvailable: boolean;
  lastChecked: string;
  timeSinceLastCheck: string;
  consecutiveFailures: number;
  message: string;
}

/**
 * Hook to monitor API health status
 */
export function useHealthStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async (force = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/health${force ? "?force=true" : ""}`
      );
      const data = await response.json();

      setHealth({
        groqAvailable: data.groqAvailable,
        lastChecked: data.lastChecked,
        timeSinceLastCheck: data.timeSinceLastCheck,
        consecutiveFailures: data.consecutiveFailures,
        message: data.message,
      });
    } catch (err: any) {
      setError(err.message);
      setHealth({
        groqAvailable: false,
        lastChecked: new Date().toISOString(),
        timeSinceLastCheck: "unknown",
        consecutiveFailures: 0,
        message: "Failed to check health",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial check
  useEffect(() => {
    checkHealth();
  }, []);

  return { health, loading, error, checkHealth };
}

/**
 * Component to display health status badge
 */
export function HealthBadge() {
  const { health } = useHealthStatus();

  if (!health) return null;

  const bgColor = health.groqAvailable
    ? "bg-green-100 text-green-800"
    : "bg-yellow-100 text-yellow-800";

  const statusIcon = health.groqAvailable ? "✅" : "⚠️";

  return (
    <div className={`px-3 py-1 rounded-full text-sm font-medium ${bgColor}`}>
      {statusIcon} {health.groqAvailable ? "Groq Online" : "Using Fallback"}
    </div>
  );
}

/**
 * Detailed health status component
 */
export function HealthStatus() {
  const { health, loading, checkHealth } = useHealthStatus();

  if (loading || !health) {
    return <div className="text-gray-500">Loading health status...</div>;
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-gray-600">Status:</span>
        <span
          className={`font-medium ${health.groqAvailable ? "text-green-600" : "text-yellow-600"}`}
        >
          {health.groqAvailable ? "✅ Healthy" : "⚠️ Using Fallback"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-600">Last Check:</span>
        <span className="text-gray-500">{health.timeSinceLastCheck}</span>
      </div>

      {health.consecutiveFailures > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Failures:</span>
          <span className="text-yellow-600">{health.consecutiveFailures}</span>
        </div>
      )}

      <button
        onClick={() => checkHealth(true)}
        className="mt-3 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
      >
        Force Check
      </button>
    </div>
  );
}
