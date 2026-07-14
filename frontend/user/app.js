const API = "/api/user";
const TOKEN_KEY = "user_token";     // third distinct key

const signupSection = document.getElementById("signup-section");
const loginSection = document.getElementById("login-section");
const checkSection = document.getElementById("check-section");
const getToken = () => localStorage.getItem(TOKEN_KEY);

// Decode JWT payload for DISPLAY only - server still verifies the signature.
function decodeToken(token) {
  try {
    let b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return JSON.parse(atob(b64));
  } catch { return {}; }
}

function show(section) {
  for (const s of [signupSection, loginSection, checkSection]) s.classList.add("hidden");
  section.classList.remove("hidden");
  if (section === checkSection) {
    const claims = decodeToken(getToken() || "");
    document.getElementById("org-banner").textContent =
      claims.orgName ? `Checking features for: ${claims.orgName}` : "";
  }
}

document.getElementById("to-login").addEventListener("click", () => show(loginSection));
document.getElementById("to-signup").addEventListener("click", () => show(signupSection));

// SIGNUP (no auto-login)
document.getElementById("signup-btn").addEventListener("click", async () => {
  const email = document.getElementById("su-email").value;
  const password = document.getElementById("su-password").value;
  const signupCode = document.getElementById("su-code").value;
  const msg = document.getElementById("signup-msg");
  msg.textContent = "";
  try {
    const res = await fetch(`${API}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, signupCode }),
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error || "Signup failed"; msg.className = "msg error"; return; }
    msg.textContent = "Signup successful! Please log in.";
    msg.className = "msg success";
  } catch {
    msg.textContent = "Network error - is the server running?"; msg.className = "msg error";
  }
});

// LOGIN
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("li-email").value;
  const password = document.getElementById("li-password").value;
  const msg = document.getElementById("login-msg");
  msg.textContent = "";
  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error || "Login failed"; msg.className = "msg error"; return; }
    localStorage.setItem(TOKEN_KEY, data.token);
    show(checkSection);
  } catch {
    msg.textContent = "Network error - is the server running?"; msg.className = "msg error";
  }
});

// CHECK A FEATURE
document.getElementById("check-btn").addEventListener("click", async () => {
  const key = document.getElementById("feature-key").value;
  const result = document.getElementById("check-result");
  result.textContent = "";
  const res = await fetch(`${API}/features/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
    body: JSON.stringify({ key }),
  });
  if (res.status === 401) { show(loginSection); return; }
  const data = await res.json();
  if (!res.ok) { result.textContent = data.error || "Failed"; result.className = "error"; return; }
 if (!data.found) {
    result.textContent = `"${data.key}" does not exist for your organization`;
    result.className = "notfound";                
  } else if (data.enabled) {
    result.textContent = ` "${data.key}" is ENABLED for your organization`;
    result.className = "enabled";
  } else {
    result.textContent = ` "${data.key}" is DISABLED for your organization`;
    result.className = "disabled";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  show(loginSection);
});

// On load: ask the server if the token is still valid before showing the check screen.
async function init() {
  const token = getToken();
  if (!token) { show(loginSection); return; }
  const res = await fetch(`${API}/me`, { headers: { "Authorization": `Bearer ${token}` } });
  if (res.ok) {
    show(checkSection);
  } else {
    localStorage.removeItem(TOKEN_KEY);   // server rejected it -> drop it, go to login
    show(loginSection);
  }
}
init();