// API client for UniCampus Lost & Found System

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function fetchHealth() {
  const startTime = performance.now();
  try {
    const res = await fetch(`${BASE_URL}/health`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const elapsed = Math.round(performance.now() - startTime);
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      success: true,
      latency: elapsed,
      data,
    };
  } catch (err) {
    const elapsed = Math.round(performance.now() - startTime);
    return {
      success: false,
      latency: elapsed,
      error: err.message || 'Failed to reach API server',
    };
  }
}
