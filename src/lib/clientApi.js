"use client";

export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch(path, options = {}) {
  const {
    retries = 1,
    retryDelay = 450,
    redirectOnUnauthorized = true,
    ...fetchOptions
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(path, {
        credentials: "same-origin",
        ...fetchOptions,
        headers: {
          ...(fetchOptions.body && !(fetchOptions.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
          ...(fetchOptions.headers || {}),
        },
      });

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : await response.text();

      if (response.status === 401 && redirectOnUnauthorized && typeof window !== "undefined") {
        clearClientSession();
        window.location.assign("/");
      }

      if (!response.ok) {
        throw new ApiError(payload?.error || response.statusText || "Request failed.", {
          status: response.status,
          data: payload,
        });
      }

      return payload;
    } catch (error) {
      lastError = error;
      const canRetry = attempt < retries && error.name !== "AbortError" && (!error.status || error.status >= 500);
      if (!canRetry) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  throw lastError instanceof Error ? lastError : new ApiError("Request failed.");
}

export async function apiJson(path, data, options = {}) {
  return apiFetch(path, {
    ...options,
    method: options.method || "POST",
    body: JSON.stringify(data),
  });
}

export function clearClientSession() {
  try {
    sessionStorage.removeItem("dashboard_data");
    sessionStorage.removeItem("events_data");
    sessionStorage.removeItem("profile_data");
    sessionStorage.removeItem("marketplace_dev_profile");
  } catch { }
}
