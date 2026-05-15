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
let lastCreatedAt = null;
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
  // 二重通信防止
  if (isLoading || !hasMore) {
    return;
  }
  isLoading = true;

  // ローディング表示
  showLoading(true);
  try {
    // API URL
    let url = "/api/posts";
    if (lastCreatedAt) {
      url += "?last_created_at=" + encodeURIComponent(lastCreatedAt) + "&last_post_id=" + encodeURIComponent(lastPostId);
    }
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
function addPostToTimeline(post,prepend = false) {
  
  const timeline = document.getElementById("timeline");
  const postEl = document.createElement("article");
  postEl.classList.add("tl-card");
  postEl.innerHTML = `
  <article class="tl-card">
    <div class="tl-card-inner">

      <!-- 赤：アバター（左に単独配置） -->
      <span class="avatar"></span>

      <!-- 青：右側のまとまり -->
      <div class="post-body">

        <!-- 緑：username / userid / time -->
        <div class="post-header">
          <span class="username">${post.username}</span>
          <span class="userid">@${post.user_id}</span>
          <span class="post-time">${formatRelativeTime(post.created_at)}</span>
        </div>

        <!-- 黄：本文 -->
        <div class="post-content">
          <p>${post.content}</p>
        </div>

        <!-- 紫：アクション -->
        <div class="post-actions">
          <button class="post-action-btn" title="リプライ">
            <i class="fa-regular fa-comment"></i>
          </button>
          <button class="post-action-btn" title="リポスト">
            <i class="fa-solid fa-retweet"></i>
          </button>
          <button class="post-action-btn pin-btn" title="ピン留め">
            <i class="fa-solid fa-thumbtack"></i>
          </button>
        </div>

      </div>
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
  prepend = false;
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
  const now = new Date();
  const postDate = new Date(dateString);

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

// ピン留めのトグル
document.querySelectorAll(".pin-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("pinned");
    // [FLASK] fetch(`/api/posts/${postId}/pin`, { method: "POST" });
  });
});


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

      // tooltip
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


