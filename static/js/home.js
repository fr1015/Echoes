
// ===== PC コンポーザー =====

// 文字数カウント
function updateCharCount() {
  const ta = document.getElementById("postText");
  document.getElementById("charCount").textContent = `${ta.value.length} / 500`;
}

// 投稿
function submitPost() {
  // 投稿内容を取得
  const postbutton = document.getElementById("submit-btn");

  // 投稿内容をサーバーに送信
  postbutton.addEventListener("click", async () => {
    const content = document.getElementById("postText").value;

    const formData = new FormData();
    formData.append("content", content);

    // fetch API を使用して POST リクエストを送信
    try {
      const response = await fetch("/post/create", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

        if (data.success) {
          // 投稿成功時の処理
          addPostToTimeline(data.post);

          // 投稿内容をクリア
          document.getElementById("postText").value = "";

        } else {
          // 投稿失敗時の処理
          alert("投稿に失敗しました: " + data.error);
        }

    } catch (error) {
      console.error("Error submitting post:", error);
    }
})
  // updateCharCount();
  // addHeatmapPost();
  window.addEventListener("DOMContentLoaded", submitPost);
}

// タイムラインに投稿を追加
function addPostToTimeline(post) {
  const timeline = document.getElementById("timeline");
  const postEl = document.createElement("div");
  postEl.classList.add("post");
  postEl.innerHTML = `
    <div class="post-header">
      <span class="avatar"></span>
      <span class="username">${post.username}</span>
    </div>
    <div class="post-content">
      <p>${post.content}</p>
    </div>
  `;
  timeline.prepend(postEl);
}


// ===== モーダル =====

// モーダルを開く
function openModal() {
  document.getElementById("postModal").classList.add("open");
  setTimeout(() => document.getElementById("modalPostText").focus(), 50);
}

// モーダルを閉じる
function closeModal() {
  document.getElementById("postModal").classList.remove("open");
}

// モーダルのオーバーレイクリックで閉じる
function handleModalOverlayClick(e) {
  if (e.target === document.getElementById("postModal")) closeModal();
}

// モーダルの文字数カウント
function updateModalCharCount() {
  const ta = document.getElementById("modalPostText");
  document.getElementById("modalCharCount").textContent = `${ta.value.length} / 500`;
}

// 初期化
function initializeCharCounts() {
  updateCharCount();
  updateModalCharCount();
}

// モーダルの投稿
function submitModalPost() {
  const ta = document.getElementById("modalPostText");
  if (!ta.value.trim()) return;
  ta.value = "";
  updateModalCharCount();
  closeModal();
  addHeatmapPost();
}

// ESC キーでモーダルを閉じる
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});



// ===== メモ =====

// メモを保存
function saveMemo() {
  localStorage.setItem("memo", document.getElementById("memoText").value);
  const btn = document.getElementById("saveMemoBtn");
  btn.textContent = "保存済み ✓";
  setTimeout(() => btn.textContent = "保存", 1500);
}

// メモをクリア
function clearMemo() {
  document.getElementById("memoText").value = "";
  localStorage.removeItem("memo");
}

// ページロード時にメモを復元
window.addEventListener("load", () => {
  const saved = localStorage.getItem("memo");
  if (saved) document.getElementById("memoText").value = saved;
  initializeCharCounts();
});



// ===== ヒートマップ =====

const heatmapData = {};
const today = new Date();

// 日付をキーにするための関数
function dateKey(d) {
  return d.toISOString().split("T")[0];
}

// ヒートマップに投稿を追加（ダミーのデータ更新）
function addHeatmapPost() { buildHeatmap(); }

// ヒートマップを構築
function buildHeatmap() {
  const container = document.getElementById("heatmapGrid");
  if (!container) return;
  const outerW = container.parentElement.clientWidth;

  const ROWS = 5, COLS = 12, gap = 4;
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

buildHeatmap();
