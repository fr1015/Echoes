const postCountMap = JSON.parse(
  document.getElementById("postCountMap")?.textContent || "{}"
);

const postDates = Object.keys(postCountMap).sort();
const oldestDate = postDates[0]; // 例: "2024-03-12"


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
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 統計表示
function renderStats() {
  const w = document.getElementById("statsWidget");
  if (!w) return;
  const fmt = n => Number(n || 0).toLocaleString();
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
  const start = oldestDate ? new Date(oldestDate) : today;

  for (let y = today.getFullYear(); y >= start.getFullYear(); y--) {
    const minM = (y === start.getFullYear()) ? start.getMonth() : 0;
    const maxM = (y === today.getFullYear()) ? today.getMonth() : 11;
    for (let m = maxM; m >= minM; m--) {
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
        a.href = `/postlog?date=${key}`;
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
  window.location.href = `/postlog?date=${dateKey}`;
}

// ランダムジャンプ
function jumpToRandom() {
  const keys = Object.keys(postCountMap);
  if (keys.length === 0) return;
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  jumpToDate(randomKey);
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
renderStats();
populateCalSelect("pcCalSelect");
populateCalSelect("spCalSelect");
buildCalendar("pcCalBody",      "pcCalSelect");
buildCalendar("spCalBody_grid", "spCalSelect");
