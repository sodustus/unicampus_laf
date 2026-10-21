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

export async function fetchCategories() {
  const res = await fetch(`${BASE_URL}/categories`);
  if (!res.ok) throw new Error('Failed to load categories');
  return await res.json();
}

export async function fetchReports(filters = {}, token = null) {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.category_id) params.append('category_id', filters.category_id);
  if (filters.location) params.append('location', filters.location);
  if (filters.status) params.append('status', filters.status);
  if (filters.q) params.append('q', filters.q);
  if (filters.sort) params.append('sort', filters.sort);

  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/reports?${params.toString()}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch reports');
  return await res.json();
}

export async function fetchReportDetail(reportId, token = null) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/reports/${reportId}`, { headers });
  if (!res.ok) throw new Error('Failed to load report details');
  return await res.json();
}

export async function createReport(reportData, token) {
  const res = await fetch(`${BASE_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(reportData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to submit report');
  return data;
}

export async function markReportRecovered(reportId, token) {
  const res = await fetch(`${BASE_URL}/reports/${reportId}/recover`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to mark report recovered');
  return data;
}

export async function deleteReport(reportId, token) {
  const res = await fetch(`${BASE_URL}/reports/${reportId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to delete report');
  return data;
}
