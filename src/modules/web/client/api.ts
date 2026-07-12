const nativeFetch = window.fetch.bind(window);

const authenticatedFetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = localStorage.getItem("token");
  if (!token) return nativeFetch(input, init);

  const headers = new Headers(init.headers);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return nativeFetch(input, { ...init, headers });
}) as typeof window.fetch;

window.fetch = Object.assign(authenticatedFetch, window.fetch);
