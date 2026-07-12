const API = "/api/admin";
const TOKEN_KEY = "admin_token"; // separate from sa_token - three independant logins

const signupSection = document.getElementById("signup-section");
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const getToken = () => localStorage.getItem(TOKEN_KEY);

// Read the JWT payload in the browser. NOTE: this is for DISPLAY only -
// never trust client-decoded claims for security; the server verifies the signature.
function decodeToken(token) {
  try {
    let b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";        // pad to a multiple of 4
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

// Show one section, hide the others. Load flags when entering the dashboard
function show(section) {
  for (const s of [signupSection, loginSection, dashboardSection]) s.classList.add("hidden");
  section.classList.remove("hidden");
  if (section === dashboardSection) {
    const claims = decodeToken(getToken() || "");
    document.getElementById("org-banner").textContent =
      claims.orgName ? `Managing organization: ${claims.orgName}` : "";
    loadFlags();
  }
}


// Switch between singup <-> login views
document.getElementById("to-login").addEventListener("click", () => show(loginSection));
document.getElementById("to-signup").addEventListener("click", () => show(signupSection));      


// SIGNUP (no auto-login)
document.getElementById("signup-btn").addEventListener("click",
    async () => {
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
            if(!res.ok) {
                msg.textContent = data.error || "Signup failed";
                msg.className = "msg error";
                return;
            }
            msg.textContent = "Signup successful! Please log in.";
            msg.className = "msg success";
        } catch {
            msg.textContent = "Network error - is the server running?";
            msg.className = "msg error";
        }
    }
);


// LOGIN
document.getElementById("login-btn").addEventListener("click", 
    async () => {
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
            if(!res.ok) {
                msg.textContent = data.error || "Login failed";
                msg.className = "msg error";
                return;
            }
            localStorage.setItem(TOKEN_KEY, data.token);
            show(dashboardSection);
        } catch {
            msg.textContent = "Network error - is the server running?";
            msg.className = "msg error";
        }
    }
);


// CREATE FLAG
document.getElementById("create-flag-btn").addEventListener("click", 
    async () => {
        const key = document.getElementById("flag-key").value;
        const enabled = document.getElementById("flag-enabled").checked;
        const msg = document.getElementById("create-flag-msg");
        msg.textContent = "";
        const res = await fetch(`${API}/flags`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
            body: JSON.stringify({ key, enabled }),
        });
        const data = await res.json();
        if(!res.ok) {
            msg.textContent = data.error || "Failed";
            msg.className = "msg error"; 
            return;
        }
        msg.textContent = `Created "${data.key}"`;
        msg.className = "msg success";
        document.getElementById("flag-key").value = "";
        document.getElementById("flag-enabled").checked = false;
        loadFlags();
    }
);


// LIST FLAGS (only this admin's org - scoped server-side by token's orgId)
async function loadFlags() {
  const res = await fetch(`${API}/flags`, { headers: { "Authorization": `Bearer ${getToken()}` } });
  if (res.status === 401) { show(loginSection); return; }
  const flags = await res.json();
  const tbody = document.querySelector("#flag-table tbody");
  tbody.innerHTML = "";
  for (const f of flags) {
    const tr = document.createElement("tr");

    const keyTd = document.createElement("td");
    keyTd.textContent = f.key;                       // textContent = XSS-safe

    const statusTd = document.createElement("td");
    statusTd.innerHTML = f.enabled ? '<span class="on">ON</span>' : '<span class="off">OFF</span>';

    const actionsTd = document.createElement("td");
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "row-btn";
    toggleBtn.textContent = f.enabled ? "Disable" : "Enable";
    toggleBtn.addEventListener("click", () => toggleFlag(f.key, !f.enabled));
    const delBtn = document.createElement("button");
    delBtn.className = "row-btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteFlag(f.key));
    actionsTd.append(toggleBtn, delBtn);

    tr.append(keyTd, statusTd, actionsTd);
    tbody.appendChild(tr);
  }
}

// TOGGLE (enable/disable)
async function toggleFlag(key, enabled) {
  const res = await fetch(`${API}/flags/${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
    body: JSON.stringify({ enabled }),
  });
  if (res.status === 401) { show(loginSection); return; }
  loadFlags();
}

// DELETE
async function deleteFlag(key) {
  if (!confirm(`Delete flag "${key}"?`)) return;
  const res = await fetch(`${API}/flags/${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${getToken()}` },
  });
  if (res.status === 401) { show(loginSection); return; }
  loadFlags();
}

document.getElementById("refresh-btn").addEventListener("click", loadFlags);
document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  show(loginSection);
});

// On load: have a token -> dashboard; otherwise -> login
getToken() ? show(dashboardSection) : show(loginSection);