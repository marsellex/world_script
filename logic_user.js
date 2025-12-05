async function updateAvatar(file) {
  const ext = file.name.split(".").pop();
  const fileName = ${currentUser.nick}_${Date.now()}.${ext};

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });

  if (error) {
    alert("Ошибка загрузки аватара.");
    return;
  }

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(data.path);

  await supabase
    .from("users")
    .update({ avatar_url: urlData.publicUrl })
    .eq("id", currentUser.id);

  document.getElementById("user-avatar").src = urlData.publicUrl;

  alert("Аватар обновлён!");
}