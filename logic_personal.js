function loadPersonalFilesUI() {
  const c = document.getElementById("content");

  c.innerHTML = 
    <h1>Личные дела</h1>
    <div id="pf-container">Загрузка...</div>
  ;

  loadPersonalList();
}

async function loadPersonalList() {
  const box = document.getElementById("pf-container");

  const { data: list } = await supabase
    .from("personal_files")
    .select("*");

  let html = "";

  for (const f of list) {
    html += 
      <div class="glass pf-item" onclick="openPersonalFile('${f.id}')">
        <strong>${f.forum_nick}</strong> [${f.forum_dept}]
      </div>
    ;
  }

  box.innerHTML = html;
}

async function openPersonalFile(id) {
  const { data } = await supabase
    .from("personal_files")
    .select("*")
    .eq("id", id)
    .single();

  const c = document.getElementById("content");

  c.innerHTML = 
    <button onclick="loadPage('files')" class="btn-primary" style="margin-bottom:10px;">< Назад</button>
    <h1>${data.forum_nick}</h1>
    <p><b>Отдел:</b> ${data.forum_dept}</p>
    <p><b>Номер аккаунта:</b> ${data.account_number}</p>
    <p><b>Ранг:</b> ${data.rank}</p>
  ;
}