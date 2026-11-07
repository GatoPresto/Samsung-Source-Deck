// Small XMLHttpRequest wrapper (the widget's <access origin="*"> lets it call any host).
/** Resolves {status, json}. Pass {body} for a form-encoded POST, {token} for a Bearer header. */
export function httpJson(method, url, {body, token, timeout = 15000} = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = timeout;
    if (body) xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    if (token) xhr.setRequestHeader("Authorization", "Bearer " + token);
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
