const getBaseUrl = () => {
  let envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) {
    return typeof window !== 'undefined' ? '/api' : 'http://localhost:5000/api';
  }
  
  envUrl = envUrl.trim().replace(/\/+$/, '');
  
  if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://') && !envUrl.startsWith('/')) {
    envUrl = `https://${envUrl}`;
  }
  
  if (!envUrl.endsWith('/api') && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    envUrl = `${envUrl}/api`;
  }
  
  return envUrl;
};

const BASE_URL = getBaseUrl();

// Client-side in-memory cache and in-flight request deduplication
const clientCache = new Map();
const inFlightRequests = new Map();

// Helper to clear client cache on mutations
export const clearClientCache = (pattern = null) => {
  if (!pattern) {
    clientCache.clear();
    return;
  }
  const regex = new RegExp(pattern);
  for (const key of clientCache.keys()) {
    if (regex.test(key)) {
      clientCache.delete(key);
    }
  }
};

// Listen for global custom events to clear cache
if (typeof window !== 'undefined') {
  window.addEventListener('app:categories-updated', () => clearClientCache('categories'));
  window.addEventListener('app:repair-categories-updated', () => clearClientCache('categories|repairs'));
  window.addEventListener('app:balance-updated', () => clearClientCache('accounts|drawer|balance|reports|dashboard'));
}

async function apiRequest(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const isDrawerEndpoint = cleanEndpoint.includes('/accounts/drawer');
  const noCache = options.noCache === true || isDrawerEndpoint;
  const cacheTtl = options.cacheTtl || 15000; // 15 seconds client cache for GETs

  // If noCache requested, append _t=timestamp to bust any HTTP/CDN cache (no custom header needed)
  const endpointWithCache = noCache
    ? `${cleanEndpoint}${cleanEndpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`
    : cleanEndpoint;

  const url = BASE_URL.endsWith('/api') && endpointWithCache.startsWith('/api/')
    ? `${BASE_URL.slice(0, -4)}${endpointWithCache}`
    : `${BASE_URL}${endpointWithCache}`;

  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  // Cache key (always scoped by active branch context to prevent cross-branch bleeding)
  const activeBId = typeof window !== 'undefined' ? (localStorage.getItem('activeBranchId') || '1') : '1';
  const cacheKey = `b_${activeBId}:${cleanEndpoint}`;

  // If mutation, invalidate related cache keys
  if (!isGet) {
    if (cleanEndpoint.includes('/products') || cleanEndpoint.includes('/categories')) {
      clearClientCache('products|categories|reports|accounts|drawer');
    } else if (cleanEndpoint.includes('/repairs')) {
      clearClientCache('repairs|reports|accounts|drawer');
    } else if (cleanEndpoint.includes('/invoices') || cleanEndpoint.includes('/pos') || cleanEndpoint.includes('/sale')) {
      clearClientCache('invoices|reports|products|customers|vendors|accounts|drawer');
    } else if (cleanEndpoint.includes('/expenses')) {
      clearClientCache('expenses|reports|accounts|drawer');
    } else if (cleanEndpoint.includes('/accounts')) {
      clearClientCache('accounts|drawer|reports');
    } else if (cleanEndpoint.includes('/customers')) {
      clearClientCache('customers');
    } else if (cleanEndpoint.includes('/vendors')) {
      clearClientCache('vendors');
    } else if (cleanEndpoint.includes('/settings')) {
      clearClientCache('settings|accounts|drawer');
    } else {
      clientCache.clear();
    }
  }

  // Check client in-memory cache for GET
  if (isGet && !noCache) {
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    // Deduplicate in-flight simultaneous GET requests
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Get token and active branch from localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const branchId = localStorage.getItem('activeBranchId');
    if (branchId && !headers['X-Branch-Id']) {
      headers['X-Branch-Id'] = String(branchId);
    }
  }

  // Strip internal-only options so they are NOT sent to fetch (avoids CORS issues)
  const { noCache: _nc, cacheTtl: _ct, ...fetchOptions } = options;

  const config = {
    ...fetchOptions,
    headers,
    credentials: options.credentials || 'include'
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  const executeFetch = async () => {
    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.code = data.code || 'API_ERROR';
        error.data = data;
        throw error;
      }

      // Store in client cache for GET
      if (isGet && !noCache && data && data.success !== false) {
        clientCache.set(cacheKey, {
          data,
          expiry: Date.now() + cacheTtl
        });
      }

      return data;
    } catch (error) {
      throw error;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  };

  if (isGet && !noCache) {
    const promise = executeFetch();
    inFlightRequests.set(cacheKey, promise);
    return promise;
  }

  return executeFetch();
}

export const api = {
  get: (endpoint, headers, options = {}) => apiRequest(endpoint, { method: 'GET', headers, ...options }),
  post: (endpoint, body, headers, options = {}) => apiRequest(endpoint, { method: 'POST', body, headers, ...options }),
  put: (endpoint, body, headers, options = {}) => apiRequest(endpoint, { method: 'PUT', body, headers, ...options }),
  patch: (endpoint, body, headers, options = {}) => apiRequest(endpoint, { method: 'PATCH', body, headers, ...options }),
  delete: (endpoint, headers, options = {}) => apiRequest(endpoint, { method: 'DELETE', headers, ...options }),
  clearCache: clearClientCache
};

export default api;
