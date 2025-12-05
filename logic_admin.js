async function loadAdminUI() {
  if (currentUser.role !== "admin") {
    document.getElementById("content").innerHTML =
      "<h1>Недостаточно прав</h1>";
    return;
  }

  const c = document.getElementById("content");

  c.innerHTML = <h1>Админ-панель</h1>
  <div id="admin-list">Загрузка...</div>;

  const { data: users } = await supabase.from("users").select("*");

  let html = "";

  for (const u of users) {
    html += 
      <div class="admin-user-row glass">
        <div>
          <strong>${u.nick}</strong>
          <div style="opacity:0.7">${u.role}</div>
        </div>

        <select class="admin-role-select" onchange="changeRole('${u.id}', this.value)">
          <option value="user" ${u.role==="user"?"selected":""}>Пользователь</option>
          <option value="moderator" ${u.role==="moderator"?"selected":""}>Модератор</option>
          <option value="admin" ${u.role==="admin"?"selected":""}>Администратор</option>
        </select>
      </div>
    ;
  }

  document.getElementById("admin-list").innerHTML = html;
}

async function changeRole(id, role) {
  if (id === currentUser.id) {
    alert("Нельзя менять свою собственную роль.");
    return;
  }

  await supabase.from("users").update({ role }).eq("id", id);
  alert("Роль изменена.");
}