import axios, { AxiosError } from 'axios';

declare global {
  interface Window {
    __MEETINGHUB_API__?: string;
  }
}

/** URL API: runtime config.js → VITE_API_URL при сборке → '' (тот же origin / nginx proxy). */
export function getApiBaseUrl(): string {
  const runtime = typeof window !== 'undefined' ? window.__MEETINGHUB_API__?.trim() : '';
  if (runtime) {
    return runtime.replace(/\/$/, '');
  }
  const built = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (built) {
    return built.replace(/\/$/, '');
  }
  return '';
}

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function persistToken(token: string | null): void {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem('token');
}

export function formatApiError(e: unknown): string {
  const err = e as AxiosError<{ message?: string | string[] }>;
  if (!err.response) {
    const base = getApiBaseUrl();
    if (!base) {
      return 'Нет связи с API. На Railway задайте API_PUBLIC_URL или API_UPSTREAM для фронта.';
    }
    return 'Сервер API недоступен. Проверьте, что MeetingHub-API запущен.';
  }
  const msg = err.response.data?.message;
  if (typeof msg === 'string') {
    return msg;
  }
  if (Array.isArray(msg)) {
    return msg.join(', ');
  }
  return err.response.statusText || 'Ошибка авторизации';
}

export async function unwrap<T>(
  runner: () => Promise<{ data: T }>,
): Promise<{ data?: T; error?: string }> {
  try {
    const response = await runner();
    return { data: response.data };
  } catch (e: unknown) {
    return { error: formatApiError(e) };
  }
}

export { apiClient };
