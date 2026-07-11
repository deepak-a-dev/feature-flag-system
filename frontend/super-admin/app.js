const API = "/api/superadmin";  // same origin - relative path
const TOKEN_KEY = "sa_token";   // distinct key per app (3 separate logins)

const loginSection = document.getElementById("login-section");
const consoleSection = document.getElementById("console-section");
const getToken = () => localStorage.getItem(TOKEN_KEY);

function showConsole() {
    loginSection.classList.add("hidden");
    consoleSection.classList.remove("hidden");
    loadOrgs();
}

function showLogin() {
    consoleSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
}

// LOGIN
document.getElementById("login-btn").addEventListener("click", 
    async () => {
        const email = document.getElementById("sa-email").value;
        const password = document.getElementById("sa-password").value;
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
            localStorage.setItem(TOKEN_KEY, data.token); // store JWT for later requsets
            showConsole();
        } catch {
            msg.textContent = "Network error - is the server running?";
            msg.className = "msg error";
        }
});


// CREATE ORG
document.getElementById("create-btn").addEventListener("click", 
    async () => {
        const name = document.getElementById("org-name").value;
        const msg = document.getElementById("create-msg");
        msg.textContent = "";
        const res = await fetch(`${API}/orgs`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
            body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if(!res.ok) {
            msg.textContent = data.error || "Failed";
            msg.className = "msg error";
            return;
        }
        msg.innerHTML = `Created <b>${data.name} <b> - admin code: <code>${data.admin_code}</code>, user code: <code>${data.user_code}</code>`;
        msg.className = "msg success";
        document.getElementById("org-name").value = "";
        loadOrgs();
    }
);


// LIST ORGS
async function loadOrgs() {
  const res = await fetch(`${API}/orgs`, { headers: { "Authorization": `Bearer ${getToken()}` } });
  if (res.status === 401) { showLogin(); return; }   // token expired/invalid -> back to login
  const orgs = await res.json();
  const tbody = document.querySelector("#org-table tbody");
  tbody.innerHTML = "";
  for (const o of orgs) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${o.id}</td><td>${o.name}</td><td><code>${o.admin_code}</code></td><td><code>${o.user_code}</code></td>`;
    tbody.appendChild(tr);
  }
}


document.getElementById("refresh-btn").addEventListener("click", loadOrgs);
document.getElementById("logout-btn").addEventListener("click", 
    () => {
        localStorage.removeItem(TOKEN_KEY);
        showLogin();
    }
);


// On page load: if a token exists, jump straight to the console.
getToken() ? showConsole() : showLogin();


