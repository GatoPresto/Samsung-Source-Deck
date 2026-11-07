// Small XMLHttpRequest wrapper (the widget's <access origin="*"> lets it call any host).
/** Resolves {status, json}. Pass {body} for a form-encoded POST, {token} for a Bearer header. */
export function httpJson(method, url, {body, token, headers, timeout = 15000} = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = timeout;
    if (body) xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    if (token) xhr.setRequestHeader("Authorization", "Bearer " + token);
    for (const [name, value] of Object.entries(headers || {})) xhr.setRequestHeader(name, value);
    xhr.onload = () => {
      let json = null;
      try { json = JSON.parse(xhr.responseText); } catch {}
      resolve({status: xhr.status, json});
    };
    xhr.onerror = () => reject(new Error("network error"));
    xhr.ontimeout = () => reject(new Error("timeout"));
    xhr.send(body ? Object.entries(body).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&") : null);
  });
}

/** Download a file as a Blob (images). Rejects on network errors and non-2xx answers. */
export function httpBlob(url, {headers, timeout = 60000} = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.timeout = timeout;
    for (const [name, value] of Object.entries(headers || {})) xhr.setRequestHeader(name, value);
    xhr.onload = () => (xhr.status === 200 || xhr.status === 0) && xhr.response ? resolve(xhr.response) : reject(new Error("HTTP " + xhr.status));
    xhr.onerror = () => reject(new Error("network error"));
    xhr.ontimeout = () => reject(new Error("timeout"));
    xhr.send();
  });
}
