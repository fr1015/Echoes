// 保存済みテーマを読み込む
function loadTheme() {

  const savedTheme = localStorage.getItem("theme");

  document.body.classList.toggle(
    "dark",
    savedTheme === "dark"
  );

  console.log("loaded theme:", savedTheme);
  console.log(document.body.classList);

}

// テーマ切替
function toggleTheme() {

  document.body.classList.toggle("dark");

  // 保存
  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }

  console.log("clicked");
  console.log(document.body.classList);
  console.log(document.body.classList.contains("dark"));

}

// ページ読み込み後に実行
document.addEventListener("DOMContentLoaded", () => {

  console.log("DOMContentLoaded");

  const toggleBtn =
    document.getElementById("theme-toggle");

  console.log(toggleBtn);

  // 保存テーマ適用
  loadTheme();

  // ボタンイベント
  toggleBtn.addEventListener(
    "click",
    toggleTheme
  );

});



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
let lastUpdatedAt = null;
let lastPostId = null;


// ===== 初期化 =====

document.addEventListener("DOMContentLoaded", () => {

  // テーマを復元
  loadTheme();

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
  if (isLoading || !hasMore) return;
  isLoading = true;
  showLoading(true);

  try {
    let url = "/api/posts";
    if (lastUpdatedAt) {
      url += "?last_updated_at=" + encodeURIComponent(lastUpdatedAt)
           + "&last_post_id=" + encodeURIComponent(lastPostId);
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`投稿取得失敗: ${response.status}`);

    const data = await response.json();
    if (data.length === 0) {
      showEndMessage();
      return;
    }

    data.forEach(post => addPostToTimeline(post, post.is_pinned));

    const lastPost = data[data.length - 1];
    lastUpdatedAt = lastPost.updated_at;
    lastPostId = lastPost.post_id;

  } catch (error) {
    console.error("Error loading posts:", error);
  } finally {
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
      addPostToTimeline(data.post, true);
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
function addPostToTimeline(post, prepend = false) {
  const timeline = document.getElementById("timeline");
  const postEl = document.createElement("article");
  postEl.classList.add("tl-card");
  if (post.is_pinned) postEl.classList.add("pinned");

  const timeString = post.updated_at || post.created_at || "";
  const relativeTime = formatRelativeTime(timeString);

  postEl.innerHTML = `
    <article class="tl-card">
      <div class="tl-card-inner">
        <span class="avatar"></span>
        <div class="post-body">
          <div class="post-header">
            <span class="username">${post.username}</span>
            <span class="userid">@${post.user_id}</span>
            <span class="post-time" data-time="${timeString}">
              ${relativeTime}
            </span>
          </div>
          <div class="post-content">
            <p>${linkify(post.content)}</p>
          </div>
          <div class="post-actions">
            <button class="post-action-btn" title="リプライ">
              <i class="fa-regular fa-comment"></i>
            </button>
            <button class="post-action-btn" title="リポスト">
              <i class="fa-solid fa-retweet"></i>
            </button>
            <button class="post-action-btn pin-btn ${post.is_pinned ? "pinned" : ""}" title="ピン留め">
              <i class="fa-solid fa-thumbtack"></i>
            </button>
            <!-- 三点メニュー -->
            <button class="post-action-btn more-btn" title="その他" onclick="openPostMenu(event, '${post.post_id}')">
              <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;

  postEl.dataset.postId = post.post_id;

  // 相対時間の更新
  const timeEl = postEl.querySelector(".post-time");
  timeEl.textContent = relativeTime;



  // ピンのトグルボタン
  const pinBtn = postEl.querySelector(".pin-btn");
  pinBtn.addEventListener("click", async () => {
    const wantPin = !postEl.classList.contains("pinned");
    const res = await fetch(`/api/posts/${post.post_id}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: wantPin })
    });
    const data = await res.json();
    if (!data.success) return;

    if (data.is_pinned) {
      // 既存ピンを解除（1件制限）
      const old = document.querySelector(".tl-card.pinned");
      if (old && old !== postEl) {
        old.classList.remove("pinned");
        old.querySelector(".pin-btn")?.classList.remove("pinned");
      }
      postEl.classList.add("pinned");
      pinBtn.classList.add("pinned");
      timeline.prepend(postEl);
    } else {
      postEl.classList.remove("pinned");
      pinBtn.classList.remove("pinned");
    }
  });

  if (prepend) {
    timeline.prepend(postEl);
  } else {
    timeline.appendChild(postEl);
  }
}



// ===== 三点メニュー =====
let currentMenu = null;

function openPostMenu(event, postId) {
  event.stopPropagation();

  // 既に開いていれば閉じる
  if (currentMenu) { closePostMenu(); return; }

  const btn = event.currentTarget;
  const rect = btn.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.className = "post-menu";
  menu.id = "postMenu";
  menu.innerHTML = `
    <button class="post-menu-item" onclick="handleEdit('${postId}')">
      <i class="fa-regular fa-pen-to-square"></i> 編集
    </button>
    <div class="post-menu-divider"></div>
    <button class="post-menu-item danger" onclick="handleDelete('${postId}')">
      <i class="fa-regular fa-trash-can"></i> 削除
    </button>
  `;

  // ボタンの左下に表示（画面端対応）
  document.body.appendChild(menu);
  const menuW = menu.offsetWidth;
  const menuH = menu.offsetHeight;

  let top  = rect.bottom + 4;
  let left = rect.left - menuW + rect.width;

  // 画面下にはみ出すなら上に表示
  if (top + menuH > window.innerHeight - 8) top = rect.top - menuH - 4;
  // 画面左にはみ出すなら右端を合わせる
  if (left < 8) left = 8;

  menu.style.top  = `${top}px`;
  menu.style.left = `${left}px`;

  currentMenu = menu;
}

function closePostMenu() {
  if (currentMenu) {
    currentMenu.remove();
    currentMenu = null;
  }
}


// メニュー外クリックで閉じる
document.addEventListener("click", closePostMenu);

// ===== 編集・削除（ここを実装してください） =====
function handleEdit(postId) {
  closePostMenu();
  editingPostId = postId;

  const card = document.querySelector(`.tl-card[data-post-id="${postId}"]`);
  const current = card?.querySelector(".post-content p")?.textContent || "";
  document.getElementById("editPostText").value = current;
  updateEditCharCount();

  openEditModal();
}

async function submitEdit() {
  if (!editingPostId) return;

  const content = document.getElementById("editPostText").value.trim();
  if (!content) return;

  const res = await fetch(`/api/posts/${editingPostId}/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });

  const data = await res.json();
  if (!data.success) {
    alert("編集に失敗しました");
    return;
  }

  // TL更新
  const card = document.querySelector(`.tl-card[data-post-id="${editingPostId}"]`);
  if (card) {
    card.querySelector(".post-content p").textContent = data.post.content;
  }

  closeEditModal();
  editingPostId = null;
}

function handleDelete(postId) {
  closePostMenu();
  // [YOUR CODE] 削除確認・API呼び出し処理
  console.log("delete:", postId);
}


// 無限スクロール

function setupInfiniteScroll() {
  const trigger = document.getElementById("loading-trigger");
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


// 相対時間表示
function formatRelativeTime(dateString) {
  if (!dateString) {
    return "たった今";
  }

  const now = new Date();
  const postDate = new Date(dateString);

  if (Number.isNaN(postDate.getTime())) {
    return "たった今";
  }

  const diffMs = now - postDate;
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // 1分未満
  if (diffMinutes < 1) {
    return "たった今";
  }

  // 60分未満
  if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  }

  // 24時間未満
  if (diffHours < 24) {
    return `${diffHours}時間前`;
  }

  // 7日未満
  if (diffDays < 7) {
    return `${diffDays}日前`;
  }

  // それ以上
  return postDate.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric"
  });
}

// 相対時間を全て更新
function updateAllRelativeTimes() {
  document.querySelectorAll(".post-time").forEach(el => {
    const dateString = el.dataset.time;

    el.textContent = formatRelativeTime(dateString);
  });
}
// 1分ごとに相対時間を更新
setInterval(updateAllRelativeTimes, 60000);




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
async function submitModalPost() {
  const ta = document.getElementById("modalPostText");
  if (!ta.value.trim()) return;
  
  // 値を一時保存
  const content = ta.value;
  
  // PC側のテキストエリアに一時的に設定
  document.getElementById("postText").value = content;
  
  // submitPost()を実行
  await submitPost();
  
  // モーダル側をクリア
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

let heatmapData = {};
const today = new Date();
// 時刻ズレ防止
today.setHours(0, 0, 0, 0);

// 日付をキーにするための関数
function dateKey(d) {

  const yyyy = d.getFullYear();

  const mm = String(d.getMonth() + 1)
    .padStart(2, "0");

  const dd = String(d.getDate())
    .padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

// 投稿数から色レベルを決定
function getHeatmapLevel(count) {
  // 投稿なし
  if (count === 0) {
    return 0;
  }
  // 1～10件
  if (count <= 10) {
    return 1;
  }
  // 11～29件
  if (count <= 29) {
    return 2;
  }
  // 30～49件
  if (count <= 49) {
    return 3;
  }
  // 50件以上
  return 4;
}

// ヒートマップに投稿を追加（ダミーのデータ更新）
function addHeatmapPost() { buildHeatmap(); }

// APIからヒートマップデータ取得
async function loadHeatmapData() {

  const response = await fetch("/heatmap");

  heatmapData = await response.json();

  buildHeatmap();
}

// ヒートマップを構築
function buildHeatmap() {
  const container = document.getElementById("heatmapGrid");
  if (!container) return;
  const outerW = container.parentElement.clientWidth;

  // 7行12列で最大84日分表示。セルサイズは8px以上で自動調整。
  const ROWS = 7, COLS = 12, gap = 4;
  const cellSize = Math.max(8, Math.floor((outerW - gap * (COLS - 1)) / COLS));
  const totalW   = cellSize * COLS + gap * (COLS - 1);
  const totalWeeks = COLS;

  // グリッド設定
  container.style.gridTemplateColumns = `repeat(${COLS}, ${cellSize}px)`;
  container.style.gridTemplateRows    = `repeat(${ROWS}, ${cellSize}px)`;
  container.style.gap   = gap + "px";
  container.style.width = totalW + "px";
  container.innerHTML   = "";

  // 日付範囲の計算
  const totalDays = COLS * ROWS;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  startDate.setDate(startDate.getDate() - ((totalWeeks - 1) * 7));

  // 日付範囲表示
  const fmt = d =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const rangeEl = document.getElementById("heatmapRange");
  if (rangeEl) rangeEl.textContent = `${fmt(startDate)} ～ ${fmt(today)}`;

  // グリッド生成
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + col * ROWS + row);
      d.setHours(0, 0, 0, 0);

      const cell = document.createElement("div");
      cell.style.gridColumn = col + 1;
      cell.style.gridRow    = row + 1;
      cell.style.width      = cellSize + "px";
      cell.style.height     = cellSize + "px";

      if (d > today) { container.appendChild(cell); continue; }

      const k = dateKey(d);
      // 投稿数取得
      const count = heatmapData[k] || 0;

      // 色レベル決定
      const level = getHeatmapLevel(count);

      // CSSクラス付与
      cell.className = `heatmap-cell level-${level}`;
      cell.dataset.date = k;
      cell.addEventListener("click", () => {
        window.location.href = `/postlog?date=${encodeURIComponent(k)}`;
      });

      cell.innerHTML = `
        <span class="tooltip">
          ${k}<br>
          ${count}件
        </span>
      `;
      container.appendChild(cell);
    }
  }
}

loadHeatmapData();

let editingPostId = null;

function openEditModal() {
  document.getElementById("editModal").classList.add("open");
  setTimeout(() => document.getElementById("editPostText").focus(), 50);
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("open");
}

function handleEditModalOverlayClick(e) {
  if (e.target === document.getElementById("editModal")) closeEditModal();
}

function updateEditCharCount() {
  const ta = document.getElementById("editPostText");
  document.getElementById("editCharCount").textContent = `${ta.value.length} / 500`;
}

function handleEdit(postId) {
  closePostMenu();
  editingPostId = postId;

  const card = document.querySelector(`.tl-card[data-post-id="${postId}"]`);
  const current = card?.querySelector(".post-content p")?.textContent || "";
  document.getElementById("editPostText").value = current;
  updateEditCharCount();

  openEditModal();
}

// HTMLエスケープとURLリンク化
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function linkify(text) {
  const escaped = escapeHtml(text);

  return escaped.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}



