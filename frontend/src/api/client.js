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

export async function submitClaim(reportId, proofDetails, token) {
  const res = await fetch(`${BASE_URL}/reports/${reportId}/claims`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ proof_details: proofDetails }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to submit claim');
  return data;
}

export async function fetchMyClaims(token) {
  const res = await fetch(`${BASE_URL}/claims/mine`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch your claims');
  return await res.json();
}

export async function fetchAllClaims(statusFilter = '', token) {
  const url = statusFilter ? `${BASE_URL}/claims?status=${statusFilter}` : `${BASE_URL}/claims`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch claims list');
  return await res.json();
}

export async function updateClaimStatus(claimId, status, rejectionReason = null, token) {
  const payload = { status };
  if (rejectionReason) payload.rejection_reason = rejectionReason;

  const res = await fetch(`${BASE_URL}/claims/${claimId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to update claim status');
  return data;
}

export async function respondToClaimInfo(claimId, additionalInfo, token) {
  const res = await fetch(`${BASE_URL}/claims/${claimId}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ additional_info: additionalInfo }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to submit additional proof');
  return data;
}

export async function completeClaimHandover(claimId, token) {
  const res = await fetch(`${BASE_URL}/claims/${claimId}/complete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to complete handover');
  return data;
}
