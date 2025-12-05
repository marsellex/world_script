function normalizeNick(nick) {
  if (!nick.includes("_")) return null;
  let [f, l] = nick.split("_");
  if (!f || !l) return null;
  return (
    f[0].toUpperCase() + f.slice(1).toLowerCase() +
    "_" +
    l[0].toUpperCase() + l.slice(1).toLowerCase());
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => {
    document.querySelector(".tab.active").classList.remove("active");
    btn.classList.add("active");

    document.querySelector(".auth-form.active").classList.remove("active");
    document.getElementById(btn.dataset.tab + "-form").classList.add("active");
  };
});

document.getElementById("login-btn").onclick = async e => {
  e.preventDefault();

  const nick = normalizeNick(document.getElementById("login-nick").value);
  const pass = document.getElementById("login-pass").value;
  const err = document.getElementById("login-error");

  if (!nick) {
    err.textContent = "Неверный формат ника.";
    return;
  }

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("nick", nick)
    .maybeSingle();

  if (!data || data.password_hash !== pass) {
    err.textContent = "Неверный ник или пароль.";
    return;
  }

  localStorage.setItem("pp_uid", data.id);
  window.location = "app.html";
};

document.getElementById("reg-btn").onclick = async e => {
  e.preventDefault();

  const nick = normalizeNick(document.getElementById("reg-nick").value);
  const pass = document.getElementById("reg-pass").value;
  const dept = document.getElementById("reg-dept").value;
  const err = document.getElementById("reg-error");

  if (!nick) {
    err.textContent = "Неверный формат ника.";
    return;
  }

  const { data: exists } = await supabase
    .from("users")
    .select("id")
    .eq("nick", nick)
    .maybeSingle();

  if (exists) {
    err.textContent = "Ник уже зарегистрирован.";
    return;
  }

  const { data } = await supabase
    .from("users")
    .insert({
      nick,
      password_hash: pass,
      department: dept,
      role: "user"
    })
    .select()
    .single();

  localStorage.setItem("pp_uid", data.id);

  window.location = "app.html";
};