window.addEventListener("DOMContentLoaded", () => initApp());

async function initApp() {
  const uid = localStorage.getItem("pp_uid");
  if (!uid) return window.location = "index.html";

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", uid)
    .single();

  window.currentUser = user;

  document.getElementById("user-nick").textContent = user.nick;
  document.getElementById("user-role").textContent = user.role;
  if (user.avatar_url)
    document.getElementById("user-avatar").src = user.avatar_url;

  if (user.role !== "admin") {
    document.getElementById("admin-nav").style.display = "none";
  }

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.onclick = () => loadPage(btn.dataset.page);
  });

  loadPage("home");

  document.getElementById("logout").onclick = () => {
    localStorage.removeItem("pp_uid");
    window.location = "index.html";
  };
}

function loadPage(page) {
  const c = document.getElementById("content");

  if (page === "home") c.innerHTML = <h1>Добро пожаловать, ${currentUser.nick}</h1>;
  if (page === "files") loadPersonalFilesUI();
  if (page === "guide") loadGuideUI?.();
  if (page === "admin") loadAdminUI();
}