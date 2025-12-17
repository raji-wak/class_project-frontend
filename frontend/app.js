// Base URL for your backend
const API_BASE = "http://localhost:5000/api";

// Token helpers
function saveToken(token) {
  localStorage.setItem("token", token);
}

function getToken() {
  return localStorage.getItem("token");
}

function clearToken() {
  localStorage.removeItem("token");
}

// Redirect to login if no token (for protected pages)
function requireAuth() {
  if (!getToken()) {
    window.location = "index.html";
  }
}

// Logout
function logout() {
  clearToken();
  window.location = "index.html";
}

// Generic helper for authenticated GET
async function authGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) {
    throw new Error(`GET ${path} failed with status ${res.status}`);
  }

  return res.json();
}

// Generic helper for authenticated POST/PUT/DELETE with JSON body
async function authSend(path, method, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed: ${res.status} - ${text}`);
  }

  return res.json().catch(() => null); // in case of empty body
}

// ========== AUTH FUNCTIONS ==========

// Login function used by index.html
async function login() {
  const username = document.getElementById("username")?.value;
  const password = document.getElementById("password")?.value;

  if (!username || !password) {
    alert("Please enter both username and password.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok && data.token) {
      saveToken(data.token);
      window.location = "dashboard.html";
    } else {
      alert(data.message || "Login failed. Check your credentials.");
    }
  } catch (err) {
    console.error(err);
    alert("Unable to connect to server.");
  }
}

// Register function used by register.html
async function register() {
  const email = document.getElementById("regEmail")?.value;
  const username = document.getElementById("regUsername")?.value;
  const password = document.getElementById("regPassword")?.value;

  if (!email || !username || !password) {
    alert("Please fill in all fields.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Registration successful! Please check your email to verify your account.");
      window.location = "verify.html";
    } else {
      alert(data.message || "Registration failed.");
    }
  } catch (err) {
    console.error(err);
    alert("Unable to connect to server.");
  }
}

// Verify email function
async function verifyEmail() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    alert("No verification token found.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/verify-email?token=${token}`);
    const data = await res.json();

    if (res.ok) {
      alert("Email verified successfully! You can now log in.");
      window.location = "index.html";
    } else {
      alert(data.message || "Verification failed.");
    }
  } catch (err) {
    console.error(err);
    alert("Unable to connect to server.");
  }
}

// ========== CASES FUNCTIONS ==========

// Load all cases (used by cases.html)
async function loadCases() {
  requireAuth();
  
  try {
    const cases = await authGet("/cases");
    const casesList = document.getElementById("cases-list");
    
    if (!casesList) return;
    
    casesList.innerHTML = "";
    
    if (cases.length === 0) {
      casesList.innerHTML = '<li style="opacity: 0.6; font-style: italic;">No cases found. Open a new case to get started.</li>';
      return;
    }
    
    cases.forEach((caseItem) => {
      const li = document.createElement("li");
      
      // Create status badge
      const statusColor = {
        'Open': '#dc2626',
        'Under Investigation': '#f59e0b',
        'Closed': '#10b981'
      }[caseItem.status] || '#6b7280';
      
      li.innerHTML = `
        <a href="case.html?id=${caseItem._id}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 1.2rem;">${caseItem.title}</strong>
              <p style="margin: 0.25rem 0 0 0; opacity: 0.7; font-size: 0.9rem;">
                ${caseItem.description || 'No description'}
              </p>
            </div>
            <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 3px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase;">
              ${caseItem.status}
            </span>
          </div>
        </a>
      `;
      
      casesList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    alert("Failed to load cases.");
  }
}

// Load single case details (used by case.html)
async function loadCase() {
  requireAuth();
  
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get("id");
  
  if (!caseId) {
    alert("No case ID provided.");
    window.location = "cases.html";
    return;
  }
  
  try {
    const caseData = await authGet(`/cases/${caseId}`);
    
    // Populate case details
    document.getElementById("case-title").textContent = caseData.title;
    document.getElementById("case-description").textContent = caseData.description || "No description";
    document.getElementById("case-status").textContent = caseData.status;
    
    // Set status color
    const statusColors = {
      'Open': '#dc2626',
      'Under Investigation': '#f59e0b',
      'Closed': '#10b981'
    };
    document.getElementById("case-status").style.color = statusColors[caseData.status] || '#6b7280';
    
    // Load suspects
    const suspectsList = document.getElementById("suspects-list");
    suspectsList.innerHTML = "";
    
    if (caseData.suspects && caseData.suspects.length > 0) {
      caseData.suspects.forEach((suspect) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <a href="suspect.html?id=${suspect._id}">
            <strong>${suspect.name}</strong>
            <span style="opacity: 0.7; font-size: 0.9rem;"> - ${suspect.alibi || 'No alibi'}</span>
          </a>
        `;
        suspectsList.appendChild(li);
      });
    } else {
      suspectsList.innerHTML = '<li style="opacity: 0.6; font-style: italic;">No suspects linked to this case.</li>';
    }
    
    // Load evidence
    const evidenceList = document.getElementById("evidence-list");
    evidenceList.innerHTML = "";
    
    if (caseData.evidence && caseData.evidence.length > 0) {
      caseData.evidence.forEach((evidence) => {
        const li = document.createElement("li");
        li.innerHTML = `
          ${evidence.description}
          <span style="opacity: 0.6; font-size: 0.85rem; margin-left: 1rem;">
            ${new Date(evidence.date).toLocaleDateString()}
          </span>
          <button class="btn-danger" style="margin-left: 1rem; padding: 2px 8px; font-size: 0.75rem;" 
                  onclick="deleteEvidence('${caseId}', '${evidence._id}')">Delete</button>
        `;
        evidenceList.appendChild(li);
      });
    } else {
      evidenceList.innerHTML = '<li style="opacity: 0.6; font-style: italic;">No evidence recorded.</li>';
    }
    
    // Load witness statements
    const witnessList = document.getElementById("witness-list");
    witnessList.innerHTML = "";
    
    if (caseData.witnessStatements && caseData.witnessStatements.length > 0) {
      caseData.witnessStatements.forEach((witness) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <strong>${witness.name}</strong>: ${witness.statement}
          <span style="opacity: 0.6; font-size: 0.85rem; margin-left: 1rem;">
            ${new Date(witness.date).toLocaleDateString()}
          </span>
          <button class="btn-danger" style="margin-left: 1rem; padding: 2px 8px; font-size: 0.75rem;" 
                  onclick="deleteWitness('${caseId}', '${witness._id}')">Delete</button>
        `;
        witnessList.appendChild(li);
      });
    } else {
      witnessList.innerHTML = '<li style="opacity: 0.6; font-style: italic;">No witness statements recorded.</li>';
    }
    
    // Store caseId for other functions
    window.currentCaseId = caseId;
    
  } catch (err) {
    console.error(err);
    alert("Failed to load case details.");
  }
}

// Add a new case (used by add-case.html)
async function addCase() {
  const title = document.getElementById("title")?.value;
  const description = document.getElementById("description")?.value;
  const status = document.getElementById("status")?.value;
  
  if (!title) {
    alert("Please enter a case title.");
    return;
  }
  
  try {
    await authSend("/cases", "POST", { title, description, status });
    alert("Case created successfully!");
    window.location = "cases.html";
  } catch (err) {
    console.error(err);
    alert("Failed to create case.");
  }
}

// Update case status
async function updateCaseStatus() {
  const newStatus = document.getElementById("edit-status")?.value;
  
  if (!window.currentCaseId || !newStatus) {
    alert("Invalid status update.");
    return;
  }
  
  try {
    await authSend(`/cases/${window.currentCaseId}`, "PUT", { status: newStatus });
    alert("Case status updated!");
    location.reload();
  } catch (err) {
    console.error(err);
    alert("Failed to update case status.");
  }
}

// Delete case
async function deleteCase() {
  if (!window.currentCaseId) {
    alert("No case selected.");
    return;
  }
  
  if (!confirm("Are you sure you want to delete this case? This action cannot be undone.")) {
    return;
  }
  
  try {
    await authSend(`/cases/${window.currentCaseId}`, "DELETE");
    alert("Case deleted successfully.");
    window.location = "cases.html";
  } catch (err) {
    console.error(err);
    alert("Failed to delete case.");
  }
}

// Add evidence to case
async function addEvidence() {
  const description = document.getElementById("evidence-description")?.value;
  
  if (!window.currentCaseId || !description) {
    alert("Please enter evidence description.");
    return;
  }
  
  try {
    await authSend(`/cases/${window.currentCaseId}/evidence`, "POST", { description });
    alert("Evidence added!");
    location.reload();
  } catch (err) {
    console.error(err);
    alert("Failed to add evidence.");
  }
}

// Delete evidence
async function deleteEvidence(caseId, evidenceId) {
  if (!confirm("Delete this evidence?")) return;
  
  try {
    await authSend(`/cases/${caseId}/evidence/${evidenceId}`, "DELETE");
    location.reload();
  } catch (err) {
    console.error(err);
    alert("Failed to delete evidence.");
  }
}

// Add witness statement
async function addWitness() {
  const name = document.getElementById("witness-name")?.value;
  const statement = document.getElementById("witness-statement")?.value;
  
  if (!window.currentCaseId || !name || !statement) {
    alert("Please fill in all witness fields.");
    return;
  }
  
  try {
    await authSend(`/cases/${window.currentCaseId}/witness`, "POST", { name, statement });
    alert("Witness statement added!");
    location.reload();
  } catch (err) {
    console.error(err);
    alert("Failed to add witness statement.");
  }
}

// Delete witness statement
async function deleteWitness(caseId, witnessId) {
  if (!confirm("Delete this witness statement?")) return;
  
  try {
    await authSend(`/cases/${caseId}/witness/${witnessId}`, "DELETE");
    location.reload();
  } catch (err) {
    console.error(err);
    alert("Failed to delete witness statement.");
  }
}

// ========== SUSPECTS FUNCTIONS ==========

// Load all suspects (used by suspects.html)
async function loadSuspects() {
  requireAuth();
  
  try {
    const suspects = await authGet("/suspects");
    const suspectsList = document.getElementById("suspects-list");
    
    if (!suspectsList) return;
    
    suspectsList.innerHTML = "";
    
    if (suspects.length === 0) {
      suspectsList.innerHTML = '<li style="opacity: 0.6; font-style: italic;">No suspects registered. Add a new suspect to begin.</li>';
      return;
    }
    
    suspects.forEach((suspect) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <a href="suspect.html?id=${suspect._id}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 1.2rem;">${suspect.name}</strong>
              <p style="margin: 0.25rem 0 0 0; opacity: 0.7; font-size: 0.9rem;">
                ${suspect.description || 'No description'}
              </p>
            </div>
            <span style="opacity: 0.6; font-size: 0.85rem;">
              ${suspect.alibi || 'No alibi recorded'}
            </span>
          </div>
        </a>
      `;
      suspectsList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    alert("Failed to load suspects.");
  }
}

// Load single suspect details (used by suspect.html)
async function loadSuspect() {
  requireAuth();
  
  const urlParams = new URLSearchParams(window.location.search);
  const suspectId = urlParams.get("id");
  
  if (!suspectId) {
    alert("No suspect ID provided.");
    window.location = "suspects.html";
    return;
  }
  
  try {
    const suspect = await authGet(`/suspects/${suspectId}`);
    
    // Populate suspect details
    document.getElementById("suspect-name").textContent = suspect.name;
    document.getElementById("suspect-description").textContent = suspect.description || "No description";
    document.getElementById("suspect-alibi").textContent = suspect.alibi || "No alibi recorded";
    document.getElementById("suspect-location").textContent = suspect.lastKnownLocation || "Unknown";
    
    // Store suspectId for delete function
    window.currentSuspectId = suspectId;
    
  } catch (err) {
    console.error(err);
    alert("Failed to load suspect details.");
  }
}

// Add a new suspect (used by add-suspect.html)
async function addSuspect() {
  const name = document.getElementById("name")?.value;
  const description = document.getElementById("description")?.value;
  const alibi = document.getElementById("alibi")?.value;
  const lastKnownLocation = document.getElementById("lastKnownLocation")?.value;
  
  if (!name) {
    alert("Please enter a suspect name.");
    return;
  }
  
  try {
    await authSend("/suspects", "POST", { 
      name, 
      description, 
      alibi, 
      lastKnownLocation 
    });
    alert("Suspect registered successfully!");
    window.location = "suspects.html";
  } catch (err) {
    console.error(err);
    alert("Failed to register suspect.");
  }
}

// Delete suspect
async function deleteSuspect() {
  if (!window.currentSuspectId) {
    alert("No suspect selected.");
    return;
  }
  
  if (!confirm("Are you sure you want to delete this suspect? This action cannot be undone.")) {
    return;
  }
  
  try {
    await authSend(`/suspects/${window.currentSuspectId}`, "DELETE");
    alert("Suspect deleted successfully.");
    window.location = "suspects.html";
  } catch (err) {
    console.error(err);
    alert("Failed to delete suspect.");
  }
}

// ========== INITIALIZATION ==========

// Add background detective elements
function initializeBackground() {
  const body = document.body;
  
  // Create background elements
  const backgroundElements = [
    { class: 'background-wanted-1', style: '--start-rotation: -8deg' },
    { class: 'background-wanted-2', style: '--start-rotation: 12deg' },
    { class: 'background-wanted-3', style: '--start-rotation: 5deg' },
    { class: 'background-newspaper-1', style: '--start-rotation: -5deg' },
    { class: 'background-newspaper-2', style: '--start-rotation: 8deg' },
    { class: 'background-footprints-1', style: '' },
    { class: 'background-footprints-2', style: '' },
    { class: 'background-evidence-1', style: '' },
    { class: 'background-evidence-2', style: '' },
    { class: 'background-magnifier', style: '' },
    { class: 'background-board', style: '' }
  ];
  
  backgroundElements.forEach(elem => {
    const div = document.createElement('div');
    div.className = elem.class;
    if (elem.style) {
      div.setAttribute('style', elem.style);
    }
    body.appendChild(div);
  });
}

// Initialize background on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBackground);
} else {
  initializeBackground();
}

// Check if we need to protect this page
if (window.location.pathname.includes("dashboard") || 
    window.location.pathname.includes("cases") || 
    window.location.pathname.includes("suspects") ||
    window.location.pathname.includes("case.html") ||
    window.location.pathname.includes("suspect.html") ||
    window.location.pathname.includes("add-")) {
  requireAuth();
}
