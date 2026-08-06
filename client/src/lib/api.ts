export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function makeTokenStore(key: string) {
  return {
    get: () => localStorage.getItem(key),
    set: (token: string) => localStorage.setItem(key, token),
    clear: () => localStorage.removeItem(key),
  };
}

// Admin and member are two independent sessions — separate storage keys so
// logging into one never touches the other, even in the same browser.
export const adminTokenStore = makeTokenStore("library_admin_token");
export const memberTokenStore = makeTokenStore("library_member_token");

function makeApi(tokenStore: { get: () => string | null }) {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = tokenStore.get();
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (res.status === 204) return undefined as T;

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : undefined;

    if (!res.ok) {
      throw new ApiError(res.status, (data && data.error) || res.statusText, data?.details);
    }
    return data as T;
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  };
}

export const adminApi = makeApi(adminTokenStore);
export const memberApi = makeApi(memberTokenStore);

export function qrImageUrl(copyId: string) {
  return `${API_URL}/api/copies/${copyId}/qr.png`;
}
