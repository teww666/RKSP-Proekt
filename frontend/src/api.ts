import axios, { AxiosError } from 'axios';

/** Пустая строка = тот же origin (docker-compose nginx proxy). На Railway задайте VITE_API_URL при сборке. */
const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

const apiClient = axios.create({
  baseURL: apiBaseUrl,
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

export async function unwrap<T>(
  runner: () => Promise<{ data: T }>,
): Promise<{ data?: T; error?: string }> {
  try {
    const response = await runner();
    return { data: response.data };
  } catch (e: unknown) {
    const err = e as AxiosError<{ message?: string | string[] }>;
    let message =
      typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : Array.isArray(err.response?.data?.message)
          ? err.response!.data!.message!.join(', ')
          : err.response?.statusText ?? 'Неизвестная ошибка';

    const statusMessage = `${err.response?.status ?? ''}`.trim();

    message = `[${statusMessage || 'нет кода'}] ${message}`;
    return { error: message };
  }
}

export { apiClient };
