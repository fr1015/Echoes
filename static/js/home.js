
// ===== PC コンポーザー =====

// 文字数カウント
function updateCharCount() {
  const ta = document.getElementById("postText");
  document.getElementById("charCount").textContent = `${ta.value.length} / 500`;
}



// ===== 状態管理 =====

// 現在読み込み中かどうか
// 二重通信防止に使う
let isLoading = false;

// まだ追加投稿が存在するか
// 最後まで読み切ったらfalseにする
let hasMore = true;

// 最後に表示した投稿日時
// 次回API取得時の基準になる
let lastCreatedAt = null;
let lastPostId = null;


// ===== 初期化 =====

document.addEventListener("DOMContentLoaded", () => {

  // 初回投稿取得
  loadPosts();

  // 無限スクロール監視開始
  setupInfiniteScroll();

});



// ===== 投稿 =====
// 投稿ボタン
const postbutton = document.getElementById("submit-btn");

// 二重送信防止フラグ
let isPosting = false;

// クリックイベントは1回だけ登録
postbutton.addEventListener("click", submitPost);



// ===== 投稿取得 =====
async function loadPosts() {
  console.log("loadPosts called");
  // 二重通信防止
  if (isLoading || !hasMore) {
    return;
  }
  isLoading = true;

  // ローディング表示
  showLoading(true);
  try {
    // API URL
    let url = "/posts";
    if (lastCreatedAt) {
      url += "?last_created_at=" + encodeURIComponent(lastCreatedAt) + "&last_post_id=" + encodeURIComponent(lastPostId);
    }
    console.log("fetch URL:", url);

    // API通信
    const response = await fetch(url);

    // HTTPエラー
    if (!response.ok) {
      throw new Error(`投稿取得失敗: ${response.status}`);
    }
    
    // JSON変換
    const data = await response.json();
    // 投稿0件なら終わる
    if (data.length === 0) {
      showEndMessage();
      return;
    }

    // タイムラインに追加
    data.forEach(post => addPostToTimeline(post));

    // 最後の投稿日時を更新
    const lastPost = data[data.length - 1];
    lastCreatedAt = lastPost.created_at;
    lastPostId = lastPost.post_id;
  }
  
  catch (error) {
    console.error("Error loading posts:", error);
  }
   
  finally {
    isLoading = false;
    showLoading(false);
  }
}



// 投稿処理
async function submitPost() {
  // 二重送信防止
  if (isPosting) {
    return;
  }
  isPosting = true;

  // ボタン無効化
  postbutton.disabled = true;
  try {
    // 投稿内容を取得
    const content = document.getElementById("postText").value;

    // 空投稿防止
    if (!content.trim()) {
      alert("投稿内容を入力してください");
      return;
    }

    // FormData作成
    const formData = new FormData();
    formData.append("content", content);

    // POSTリクエスト送信
    const response = await fetch("/post/create", {
      method: "POST",
      body: formData,
    });

    // JSON変換
    const data = await response.json();

    // 投稿成功
    if (data.success) {
      // TLへ追加
      addPostToTimeline(data.post);
      // 入力欄クリア
      document.getElementById("postText").value = "";

    } else {
      // 投稿失敗
      alert("投稿に失敗しました: " + data.error);
    }

  } catch (error) {
    console.error("Error submitting post:", error);
    alert("通信エラーが発生しました");
  } finally {

    // フラグ解除
    isPosting = false;

    // ボタン再有効化
    postbutton.disabled = false;

  }
  // 文字数カウント更新
  updateCharCount();
}

// タイムラインに投稿を追加
function addPostToTimeline(post,prepend = false) {
  
  const timeline = document.getElementById("timeline");
  const postEl = document.createElement("article");
  postEl.classList.add("tl-card");
  postEl.innerHTML = `
  <article class="tl-card">
    <div class="post-header">
      <span class="avatar"></span>
      <span class="username">${post.username}</span>
      <span class="userid">@${post.user_id}</span>
      <span class="post-time">${post.created_at}</span>
    </div>
    <div class="post-content">
      <p>${post.content}</p>
    </div>
  </article>
  `;
  // 追加位置を切り替える
  if (prepend) {

    // 新規投稿
    timeline.prepend(postEl);

  } else {

    // 無限スクロール
    timeline.appendChild(postEl);

  }
}



// 無限スクロール

function setupInfiniteScroll() {
  const trigger = document.getElementById("loading-trigger");
  console.log(trigger);
  const observer = new IntersectionObserver((entries) => {
    // triggerが画面内に入った
    if (entries[0].isIntersecting) {
      loadPosts();
    }
  }, {
    // 少し早めに読み込む
    rootMargin: "300px"
  });
  observer.observe(trigger);
}



// ローディング表示
function showLoading(show) {
  const loading =
    document.getElementById("loading-indicator");

  loading.style.display =
    show ? "block" : "none";

}


// 最後まで読み込んだ表示

function showEndMessage() {
  const loading =
    document.getElementById("loading-indicator");

  loading.innerText =
    "これ以上投稿はありません";
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
