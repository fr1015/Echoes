
// ===== PC コンポーザー =====
function updateCharCount() {
  const ta = document.getElementById("postText");
  document.getElementById("charCount").textContent = `${ta.value.length} / 500`;
}

function submitPost() {
  const ta = document.getElementById("postText");
  if (!ta.value.trim()) return;
  ta.value = "";
  updateCharCount();
  addHeatmapPost();
}

// ===== モーダル =====
function openModal() {
  document.getElementById("postModal").classList.add("open");
  setTimeout(() => document.getElementById("modalPostText").focus(), 50);
}

function closeModal() {
  document.getElementById("postModal").classList.remove("open");
}

function handleModalOverlayClick(e) {
  if (e.target === document.getElementById("postModal")) closeModal();
}

function updateModalCharCount() {
  const ta = document.getElementById("modalPostText");
  document.getElementById("modalCharCount").textContent = `${ta.value.length} / 500`;
}

function submitModalPost() {
  const ta = document.getElementById("modalPostText");
  if (!ta.value.trim()) return;
  ta.value = "";
  updateModalCharCount();
  closeModal();
  addHeatmapPost();
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

// ===== メモ =====
function saveMemo() {
  localStorage.setItem("memo", document.getElementById("memoText").value);
  const btn = document.getElementById("saveMemoBtn");
  btn.textContent = "保存済み ✓";
  setTimeout(() => btn.textContent = "保存", 1500);
}

function clearMemo() {
  document.getElementById("memoText").value = "";
  localStorage.removeItem("memo");
}

window.addEventListener("load", () => {
  const saved = localStorage.getItem("memo");
  if (saved) document.getElementById("memoText").value = saved;
});

// ===== ヒートマップ =====
const heatmapData = {};
const today = new Date();

function dateKey(d) {
  return d.toISOString().split("T")[0];
}

function addHeatmapPost() { buildHeatmap(); }

function buildHeatmap() {
  const container = document.getElementById("heatmapGrid");
  if (!container) return;
  const outerW = container.parentElement.clientWidth;

  const ROWS = 7, COLS = 9, gap = 4;
  const cellSize = Math.max(8, Math.floor((outerW - gap * (COLS - 1)) / COLS));
  const totalW   = cellSize * COLS + gap * (COLS - 1);

  container.style.gridTemplateColumns = `repeat(${COLS}, ${cellSize}px)`;
  container.style.gridTemplateRows    = `repeat(${ROWS}, ${cellSize}px)`;
  container.style.gap   = gap + "px";
  container.style.width = totalW + "px";
  container.innerHTML   = "";

  const totalDays = COLS * ROWS;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (totalDays - 1));

  const fmt = d =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const rangeEl = document.getElementById("heatmapRange");
  if (rangeEl) rangeEl.textContent = `${fmt(startDate)} ～ ${fmt(today)}`;

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + col * ROWS + row);

      const cell = document.createElement("div");
      cell.style.gridColumn = col + 1;
      cell.style.gridRow    = row + 1;
      cell.style.width      = cellSize + "px";
      cell.style.height     = cellSize + "px";

      if (d > today) { container.appendChild(cell); continue; }

      const k = dateKey(d);
      const level = heatmapData[k] || 0;
      cell.className = "heatmap-cell";
      cell.innerHTML = `<span class="tooltip">${k}: ${level}件</span>`;
      container.appendChild(cell);
    }
  }
}

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(buildHeatmap, 80);
});

buildHeatmap();
