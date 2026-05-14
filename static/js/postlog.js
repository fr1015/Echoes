
const postCountMap = {
  "2026-05-12": 5,  "2026-05-11": 12, "2026-05-10": 3,
  "2026-05-09": 0,  "2026-05-08": 8,  "2026-05-07": 18,
  "2026-05-06": 12, "2026-05-05": 7,  "2026-05-04": 2,
  "2026-05-03": 15, "2026-05-02": 9,  "2026-05-01": 6,
  "2026-04-30": 11, "2026-04-29": 4,  "2026-04-28": 20,
  "2026-04-27": 0,  "2026-04-26": 7,  "2026-04-25": 3,
  "2026-04-24": 16, "2026-04-23": 8,  "2026-04-22": 5,
  "2026-04-21": 0,  "2026-04-20": 13, "2026-04-15": 9,
};


const groupedPosts = {
  "2026-05-07": [
    { time: "07:19", content: "今日は朝からコードを書いていた。だいぶ形になってきた気がする。" },
    { time: "09:43", content: "CSSのレイアウト沼にはまりかけたけどなんとか抜け出せた。flexboxは偉大。" },
    { time: "12:30", content: "昼ごはん食べながらドキュメントを読んでいた。Flaskのblueprintが意外と便利だということに気づいた。" },
  ],
  "2026-05-06": [
    { time: "08:02", content: "SQLAlchemyのリレーション設定でちょっとはまった。back_populatesとbackrefの違いをちゃんと理解できていなかった。" },
    { time: "22:15", content: "今日のまとめ：DB設計を見直して、マイグレーションを走らせた。うまくいって安心。" },
  ],
  "2026-05-05": [
    { time: "11:20", content: "祝日なのでのんびり開発。モーダルのアニメーションを整えた。細かいところが気になるたちなので時間がかかる。" },
  ],
};

// ユーザー情報
// [FLASK] username / userId を {{ current_user.username }} 等で差し替え
const USERNAME = "kan";
const USER_ID  = "@lifelog_kan";

// // ==========================================================
// //  ポスト描画
// // ==========================================================
// // 日付ラベルを「YYYY年M月D日（曜）」形式に変換
// function formatDateLabel(dateStr) {
//   const d = new Date(dateStr + "T00:00:00");
//   const week = ["日","月","火","水","木","金","土"][d.getDay()];
//   return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${week}）`;
// }

// // 投稿データを受け取ってHTMLに描画
// function renderPosts(data) {
//   // data: { "YYYY-MM-DD": [{ time, content }, ...], ... }
//   const container = document.getElementById("postLog");
//   container.innerHTML = "";

//   const dates = Object.keys(data).sort().reverse();

//   if (dates.length === 0) {
//     container.innerHTML = `
//       <div class="log-empty">
//         <div class="log-empty-icon">🌱</div>
//         <div class="log-empty-text">まだ投稿はありません</div>
//       </div>`;
//     return;
//   }

//   // 日付ごとにグループ化して表示
//   dates.forEach(dateStr => {
//     const posts = data[dateStr];
//     const group = document.createElement("div");
//     group.className = "date-group";
//     group.id = `date-${dateStr}`;

//     const heading = document.createElement("div");
//     heading.className = "date-heading";
//     heading.innerHTML = `
//       <span class="date-heading-text">${formatDateLabel(dateStr)}</span>
//       <span class="date-count">${posts.length}件</span>`;
//     group.appendChild(heading);

//     posts.forEach(post => {
//       const card = document.createElement("article");
//       card.className = "tl-card";
//       card.innerHTML = `
//         <div class="post-header">
//           <div class="post-avatar">${USERNAME[0]}</div>
//           <div class="post-meta">
//             <span class="post-username">${USERNAME}</span>
//             <span class="post-userid">${USER_ID}</span>
//             <span class="post-time">${post.time}</span>
//           </div>
//         </div>
//         <div class="post-content"><p>${post.content}</p></div>`;
//       group.appendChild(card);
//     });

//     container.appendChild(group);
//   });
// }

// ページネーション（シンプル版 / Flask連携後はURLパラメータで制御）
function renderPagination(current, total) {
  const el = document.getElementById("pagination");
  if (total <= 1) { el.innerHTML = ""; return; }

  let html = `<button class="page-btn" ${current===1?"disabled":""} onclick="goPage(${current-1})">← 前</button>`;
  for (let i = 1; i <= total; i++) {
    if (i === current) {
      html += `<span class="page-btn active">${i}</span>`;
    } else if (i === 1 || i === total || Math.abs(i - current) <= 1) {
      html += `<a class="page-btn" href="#" onclick="goPage(${i});return false;">${i}</a>`;
    } else if (Math.abs(i - current) === 2) {
      html += `<span style="color:var(--text-muted);font-size:13px;">…</span>`;
    }
  }
  html += `<a class="page-btn" ${current===total?"style='pointer-events:none;opacity:.4'":""} href="#" onclick="goPage(${current+1});return false;">次 →</a>`;
  el.innerHTML = html;
}

function goPage(page) {
  // [FLASK] window.location.href = `/post-log?page=${page}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 統計表示
function renderStats() {
  const w = document.getElementById("statsWidget");
  if (!w) return;
  const fmt = n => Number(n).toLocaleString();
  document.getElementById("statToday").innerHTML = `${fmt(w.dataset.today)}<span class="stat-unit">件</span>`;
  document.getElementById("statMonth").innerHTML = `${fmt(w.dataset.month)}<span class="stat-unit">件</span>`;
  document.getElementById("statYear").innerHTML  = `${fmt(w.dataset.year)}<span class="stat-unit">件</span>`;
  document.getElementById("statTotal").innerHTML = `${fmt(w.dataset.total)}<span class="stat-unit">件</span>`;
}

// ==========================================================
//  カレンダー
// ==========================================================
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

// 投稿数をレベル0〜4に変換
function getLevel(count) {
  if (!count || count === 0) return 0;
  if (count <= 10) return 1;
  if (count <= 29) return 2;
  if (count <= 49) return 3;
  return 4;
}

// プルダウンに選択肢を生成（過去2年〜今月）
function populateCalSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = "";
  const today = new Date();
  for (let y = today.getFullYear(); y >= today.getFullYear() - 2; y--) {
    const maxM = (y === today.getFullYear()) ? today.getMonth() : 11;
    for (let m = maxM; m >= 0; m--) {
      const opt = document.createElement("option");
      opt.value = `${y}-${m}`;
      opt.textContent = `${y}年${m + 1}月`;
      if (y === calYear && m === calMonth) opt.selected = true;
      sel.appendChild(opt);
    }
  }
}

// プルダウン変更時
function selectMonth(target) {
  const selId = target === "sp" ? "spCalSelect" : "pcCalSelect";
  const otherId = target === "sp" ? "pcCalSelect" : "spCalSelect";
  const val = document.getElementById(selId)?.value;
  if (!val) return;
  const [y, m] = val.split("-").map(Number);
  calYear = y; calMonth = m;

  // もう一方のプルダウンも同期
  const other = document.getElementById(otherId);
  if (other) other.value = val;

  buildCalendar("pcCalBody",      "pcCalSelect");
  buildCalendar("spCalBody_grid", "spCalSelect");
}

function buildCalendar(targetBodyId, targetSelectId) {
  const today    = new Date();
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay  = new Date(calYear, calMonth + 1, 0);

  const tbody = document.getElementById(targetBodyId);
  tbody.innerHTML = "";

  const dayOfWeek = firstDay.getDay();
  let date = 1;
  const totalRows = Math.ceil((dayOfWeek + lastDay.getDate()) / 7);

  for (let row = 0; row < totalRows; row++) {
    const tr = document.createElement("tr");
    for (let col = 0; col < 7; col++) {
      const td = document.createElement("td");

      if (row === 0 && col < dayOfWeek) {
        // 前月
        const prevDate = new Date(calYear, calMonth, -(dayOfWeek - col - 1));
        const span = document.createElement("span");
        span.className = "cal-day other-month";
        span.textContent = prevDate.getDate();
        td.appendChild(span);
      } else if (date > lastDay.getDate()) {
        // 翌月
        const span = document.createElement("span");
        span.className = "cal-day other-month";
        span.textContent = date - lastDay.getDate();
        td.appendChild(span);
        date++;
      } else {
        const key = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(date).padStart(2,"0")}`;
        const isToday = (calYear === today.getFullYear() && calMonth === today.getMonth() && date === today.getDate());
        const count = postCountMap[key] || 0;
        const level = getLevel(count);

        const a = document.createElement("a");
        a.className = "cal-day" + (isToday ? " today" : "");
        if (!isToday && level > 0) a.setAttribute("data-level", level);
        a.textContent = date;
        a.href = "#";
        a.title = `${count}件`;
        a.onclick = (e) => { e.preventDefault(); jumpToDate(key); };
        td.appendChild(a);
        date++;
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

function jumpToDate(dateKey) {
  // [FLASK] window.location.href = `/post-log?date=${dateKey}`;
  const target = document.getElementById(`date-${dateKey}`);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ランダムジャンプ（実装はFlask連携後）
function jumpToRandom() {
  // [FLASK] 投稿がある日付のリストからランダムに選んでジャンプ
  // 例: window.location.href = `/post-log?date=${randomDate}`;
}

// ==========================================================
//  検索
// ==========================================================
function doSearch(from) {
  const id = from === "sp" ? "spSearchInput" : "searchInput";
  const q  = document.getElementById(id)?.value.trim();
  if (!q) return;
  // [FLASK] window.location.href = `/post-log?q=${encodeURIComponent(q)}`;
  alert(`「${q}」で検索（Flask連携後に実装）`);
}

["searchInput","spSearchInput"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(id === "spSearchInput" ? "sp" : "pc"); });
});

// ==========================================================
//  初期化
// ==========================================================
// renderPosts(groupedPosts);
renderPagination(1, 12);
renderStats();
populateCalSelect("pcCalSelect");
populateCalSelect("spCalSelect");
buildCalendar("pcCalBody",      "pcCalSelect");
buildCalendar("spCalBody_grid", "spCalSelect");
