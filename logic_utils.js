function $(sel) {
  return document.querySelector(sel);
}

function createEl(tag, attrs={}) {
  const el = document.createElement(tag);
  for (const k in attrs) el[k] = attrs[k];
  return el;
}