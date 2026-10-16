(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem("oni-manual:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("oni-manual:" + k, JSON.stringify(v)); } catch {} },
};
const resets = {};

/* ---------- 목차·진행 ---------- */
const chapters = $$("section.ch");
const nav = $("#tocNav");
const groups = [];
chapters.forEach((s) => {
  let g = groups.find((x) => x.name === s.dataset.group);
  if (!g) groups.push((g = { name: s.dataset.group, items: [] }));
  g.items.push(s);
});
nav.innerHTML = groups.map((g) => `<div><div class="grp">${esc(g.name)}</div><ol>${g.items.map((s) =>
  `<li><a href="#${s.id}" data-id="${s.id}"><span class="n">${esc($(".num", s).textContent)}</span><span class="t">${esc(s.dataset.title)}</span><span class="ck" aria-hidden="true">✓</span></a></li>`).join("")}</ol></div>`).join("");
let done = store.get("done", {});
function paintDone() {
  $$(".done-btn").forEach((b) => b.setAttribute("aria-pressed", !!done[b.dataset.done]));
  $$("#tocNav a").forEach((a) => {
    const sec = document.getElementById(a.dataset.id);
    const key = $(".done-btn", sec)?.dataset.done;
    a.classList.toggle("done", !!done[key]);
  });
  const all = $$(".done-btn").length, n = $$(".done-btn").filter((b) => done[b.dataset.done]).length;
  $("#progTxt").textContent = n; $("#progAll").textContent = all;
  $("#progBar").style.width = (all ? (n / all) * 100 : 0) + "%";
}
document.addEventListener("click", (e) => {
  const b = e.target.closest(".done-btn");
  if (!b) return;
  done[b.dataset.done] = !done[b.dataset.done];
  store.set("done", done); paintDone();
});
paintDone();
const io = new IntersectionObserver((ents) => {
  ents.forEach((en) => {
    if (en.isIntersecting) $$("#tocNav a").forEach((a) => a.classList.toggle("on", a.dataset.id === en.target.id));
  });
}, { rootMargin: "-30% 0px -60% 0px" });
chapters.forEach((s) => io.observe(s));
$("#tocSearch").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  $$("#tocNav li").forEach((li) => {
    const sec = document.getElementById($("a", li).dataset.id);
    li.hidden = !!q && !sec.textContent.includes(q);
  });
});
const toc = $("#toc");
$("#tocToggle").addEventListener("click", () => {
  const open = toc.classList.toggle("open");
  $("#tocToggle").setAttribute("aria-expanded", open);
});
nav.addEventListener("click", (e) => { if (e.target.closest("a")) { toc.classList.remove("open"); $("#tocToggle").setAttribute("aria-expanded", false); } });
// 테마
function applyTheme(t) {
  if (t === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  $$("[data-theme-set]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.themeSet === t));
}
applyTheme(store.get("theme", "system"));
$$("[data-theme-set]").forEach((b) => b.addEventListener("click", () => { store.set("theme", b.dataset.themeSet); applyTheme(b.dataset.themeSet); }));
document.addEventListener("click", (e) => { const r = e.target.closest("[data-reset]"); if (r) resets[r.dataset.reset]?.(); });

/* ---------- 화면 둘러보기 ---------- */
const pins = {
  1: ["Oni 감독 로고", "앱 이름과 버전입니다. 사이드바 아래 접기 버튼으로 메뉴를 아이콘만 보이게 줄일 수 있습니다."],
  2: ["새 고사", "새 시험(중간·기말 등)을 만듭니다. 지금 고사는 저장된 뒤 ‘기록’에 남습니다."],
  3: ["현재 위치", "지금 열린 고사 이름과 화면입니다. 어떤 고사를 고치고 있는지 항상 여기서 확인하세요."],
  4: ["저장 상태", "‘저장 안 됨’이면 아직 저장하지 않은 변경이 있습니다. 저장 버튼 또는 Ctrl+S로 저장합니다. 저장되면 ‘저장됨’으로 바뀝니다."],
  5: ["되돌리기 / 다시 실행", "직전 변경을 취소하거나 다시 적용합니다. Ctrl+Z, Ctrl+Shift+Z와 같습니다."],
  6: ["고사 파일 가져오기 / 내보내기", "왼쪽 아이콘(아래로 향한 화살표)은 가져오기입니다. 저장해 둔 JSON 고사 파일을 새 고사로 엽니다. 오른쪽 아이콘(위로 향한 화살표)은 내보내기입니다. 지금 고사 전체를 JSON 파일로 저장합니다(백업·PC 이동)."],
  7: ["세부 탭", "메뉴 안의 단계를 나눈 탭입니다. 시험 설정은 ‘일정·고사실 / 감독 방식·배정 기준’, 교사 설정은 ‘교사 명단 / 특별교사 / 감독불가’ 세 탭입니다."],
};
$$("#t-shell .pin").forEach((p) => {
  const go = () => {
    $$("#t-shell .pin").forEach((x) => x.setAttribute("aria-pressed", x === p));
    const [t, d] = pins[p.dataset.pin];
    $("#pinInfo").innerHTML = `<b>${p.dataset.pin}. ${esc(t)}</b>${esc(d)}`;
  };
  p.addEventListener("click", go);
  p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
});

/* ---------- 공용 모달 ---------- */
function modal(stage, { title, sub, body, foot }) {
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</header><div class="mb"></div><footer></footer></div>`;
  const mb = $(".mb", back), ft = $("footer", back);
  if (typeof body === "string") mb.innerHTML = body; else mb.append(body);
  ft.innerHTML = foot || "";
  stage.style.minHeight = "420px";
  stage.append(back);
  back.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  function close() { back.remove(); stage.style.minHeight = ""; }
  setTimeout(() => $("input,button", mb)?.focus(), 0);
  return { el: back, mb, ft, close };
}

/* ---------- 2. 학교 설정 ---------- */
const SCHOOLS = [
  { name: "한빛중학교", region: "서울", counts: [6, 6, 5] },
  { name: "한빛고등학교", region: "경기", counts: [8, 8, 7] },
  { name: "한빛여자중학교", region: "대전", counts: [4, 4, 4] },
];
let sch;
function schoolInit() { sch = { q: "", hits: null, picked: null, rooms: [] }; schoolRender(); $("#schoolToast").textContent = ""; }
resets.school = schoolInit;
function schoolRender() {
  const box = $("#schoolBox");
  if (sch.picked) {
    box.innerHTML = `<div class="row"><span class="chip" style="cursor:default">${esc(sch.picked.name)} <small style="color:var(--app-ink-3);font-weight:400">${esc(sch.picked.region)}</small></span>
      <button class="btn" id="schChange">학교 변경</button><button class="btn primary" id="schLoad">학급을 고사실로 불러오기</button></div>`;
    $("#schChange").onclick = () => { sch.picked = null; sch.hits = null; schoolRender(); };
    $("#schLoad").onclick = () => {
      let added = 0;
      sch.picked.counts.forEach((n, g) => { for (let c = 1; c <= n; c++) { const nm = `${g + 1}-${c}`; if (!sch.rooms.includes(nm)) { sch.rooms.push(nm); added++; } } });
      $("#schoolToast").className = "toast";
      $("#schoolToast").textContent = added ? `${sch.picked.name}의 학급 ${added}개를 고사실에 추가했습니다 (${sch.picked.counts.map((c, i) => `${i + 1}학년 ${c}`).join(" · ")}). 필요하면 이름을 눌러 수정하세요.` : "이미 모든 학급이 등록되어 있습니다.";
      schoolRender();
    };
  } else {
    box.innerHTML = `<form class="row" id="schForm"><input type="text" id="schQ" placeholder="학교 이름 (예: 한국고)" aria-label="학교 이름" value="${esc(sch.q)}" style="flex:1;min-width:160px"><button class="btn primary" type="submit">검색</button></form>
      <div id="schHits" style="display:grid;gap:6px;margin-top:8px"></div>`;
    $("#schForm").onsubmit = (e) => {
      e.preventDefault();
      sch.q = $("#schQ").value.trim();
      const q = sch.q.replace(/\s/g, "");
      sch.hits = q.length < 2 ? [] : SCHOOLS.filter((s) => s.name.includes(q) || q.includes(s.name.slice(0, 2)) && s.name.startsWith(q.slice(0, 2)));
      paintHits();
    };
    paintHits();
  }
  const g = [1, 2, 3].map((gr) => sch.rooms.filter((r) => r.startsWith(gr + "-")));
  $("#schoolRooms").innerHTML = [1, 2, 3].map((gr, i) => `<div class="room-row"><div class="gl"><b>${gr}학년</b><small>${g[i].length}실</small></div><div class="chips">${g[i].map((r) => `<span class="chip" style="cursor:default">${r}</span>`).join("") || '<span class="desc">아직 없음</span>'}</div><div></div></div>`).join("");
  function paintHits() {
    const h = $("#schHits"); if (!h) return;
    if (sch.hits === null) { h.innerHTML = ""; return; }
    if (!sch.hits.length) { h.innerHTML = `<p class="desc">검색된 학교가 없습니다. 이름을 줄여서 검색해 보세요. (예시: “한빛”)</p>`; return; }
    h.innerHTML = sch.hits.map((s, i) => `<button class="school-hit" data-i="${i}"><span>${esc(s.name)}</span><small>${esc(s.region)}</small></button>`).join("");
    $$("button", h).forEach((b) => b.onclick = () => { sch.picked = sch.hits[+b.dataset.i]; schoolRender(); });
  }
}
schoolInit();

/* ---------- 3. 고사실 관리 ---------- */
let rm;
function roomsInit() {
  rm = { grades: { 1: ["1-1", "1-2", "1-3"], 2: ["2-1", "2-2"], 3: ["3-1", "3-2", "3-3"] }, hall: ["본관 복도"], special: [], counts: { 1: 5, 2: 5, 3: 5 } };
  roomsRender();
}
resets.rooms = roomsInit;
const numOf = (n) => +((n.match(/-(\d+)/) || [])[1] || 0);
function roomsRender() {
  const total = Object.values(rm.grades).flat().length + rm.hall.length + rm.special.length;
  $("#roomCount").textContent = `${total}실 · 학년별 교실, 복도·특별실`;
  $("#roomsBox").innerHTML = [1, 2, 3].map((g) => `<div class="room-row"><div class="gl"><b>${g}학년</b><small>${rm.grades[g].length}실</small></div>
    <div class="chips">${[...rm.grades[g]].sort((a, b) => numOf(a) - numOf(b) || a.localeCompare(b)).map((r) => chip(r, "g" + g)).join("")}<button class="link" data-add="${g}" aria-label="${g}학년 고사실 추가">＋ 추가</button></div>
    <div class="row"><input type="number" min="1" max="20" value="${rm.counts[g]}" data-cnt="${g}" aria-label="${g}학년 추가할 학급 수"><span class="desc">개 학급</span><button class="btn soft" data-bulk="${g}">한 번에 추가</button></div></div>`).join("");
  $("#hallBox").innerHTML = [["hall", "복도 감독 구역", "복도"], ["special", "특별실", "특별실"]].map(([k, lab, pre]) =>
    `<div class="room-row"><div class="gl"><b>${lab}</b></div><div class="chips">${rm[k].map((r) => chip(r, k)).join("") || '<span class="desc">없음</span>'}<button class="link" data-addk="${k}" data-pre="${pre}">＋ 추가</button></div><div></div></div>`).join("");
  function chip(r, k) { return `<span class="chip" role="button" tabindex="0" data-ren="${esc(r)}" data-k="${k}" title="눌러서 이름 변경">${esc(r)}<span class="x" role="button" data-del="${esc(r)}" data-k="${k}" aria-label="${esc(r)} 삭제">×</span></span>`; }
}
function listOf(k) { return k[0] === "g" ? rm.grades[k.slice(1)] : rm[k]; }
$("#t-rooms").addEventListener("click", (e) => {
  const t = e.target;
  if (t.dataset.del) { e.stopPropagation(); const l = listOf(t.dataset.k); l.splice(l.indexOf(t.dataset.del), 1); roomsRender(); return; }
  if (t.dataset.add) { const g = t.dataset.add, l = rm.grades[g]; let n = 1; while (l.includes(`${g}-${n}`)) n++; l.push(`${g}-${n}`); roomsRender(); return; }
  if (t.dataset.addk) { const l = rm[t.dataset.addk]; let n = 1; while (l.includes(`${t.dataset.pre} ${n}`)) n++; l.push(`${t.dataset.pre} ${n}`); roomsRender(); return; }
  if (t.dataset.bulk) {
    const g = t.dataset.bulk, n = Math.max(1, Math.min(20, +$(`[data-cnt="${g}"]`).value || 0)), l = rm.grades[g];
    rm.counts[g] = n; for (let c = 1; c <= n; c++) if (!l.includes(`${g}-${c}`)) l.push(`${g}-${c}`);
    roomsRender(); return;
  }
  const ch = t.closest("[data-ren]");
  if (ch) rename(ch);
});
$("#t-rooms").addEventListener("keydown", (e) => { const ch = e.target.closest("[data-ren]"); if (ch && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); rename(ch); } });
$("#t-rooms").addEventListener("change", (e) => { if (e.target.dataset.cnt) rm.counts[e.target.dataset.cnt] = +e.target.value; });
function rename(ch) {
  const old = ch.dataset.ren, l = listOf(ch.dataset.k);
  const m = modal($("#roomStage"), { title: "고사실 이름 변경", body: `<input type="text" id="renIn" aria-label="고사실 새 이름" value="${esc(old)}" style="width:100%"><p class="desc">이름만 바뀌고 과목·교사 연결은 그대로 유지됩니다.</p>`, foot: `<button class="btn" data-x>취소</button><button class="btn primary" data-ok>변경</button>` });
  const ok = () => { const v = $("#renIn").value.trim(); if (v) l[l.indexOf(old)] = v; m.close(); roomsRender(); };
  $("[data-x]", m.ft).onclick = m.close; $("[data-ok]", m.ft).onclick = ok;
  $("#renIn").addEventListener("keydown", (e) => { if (e.key === "Enter") ok(); });
  setTimeout(() => $("#renIn").select(), 0);
}
roomsInit();

/* ---------- 4·5. 시험 일정 공용 ---------- */
const SROOMS = { 1: ["1-1", "1-2", "1-3", "1-4"], 2: ["2-1", "2-2", "2-3", "2-4"], 3: ["3-1", "3-2", "3-3", "3-4"] };
const HALLS = ["본관 복도"];
const cellKey = (p, g) => `${p}|${g}`;
function makeSched(stage, init, opts) {
  let st, uid = 0;
  const reset = () => { st = { periods: init.periods, lessons: structuredClone(init.lessons) }; render(); };
  const ls = (p, g) => st.lessons.filter((l) => l.p === p && l.g === g);
  function render() {
    stage.innerHTML = `<div class="daycard"><div class="top"><div><b>10월 19일 (월)</b><div class="desc">2026. 10. 19</div></div>
      <div class="stepper"><span><b>${st.periods}</b>교시</span><span class="seg"><button aria-label="교시 줄이기" data-pm="-1">−</button><button aria-label="교시 추가" data-pm="1">＋</button></span></div></div>
      <div class="scroll"><table class="g sched"><thead><tr><th>교시</th><th>1학년</th><th>2학년</th><th>3학년</th></tr></thead><tbody>
      ${Array.from({ length: st.periods }, (_, i) => i + 1).map((p) => `<tr><th>${p}<br><small style="font-weight:400">교시</small></th>${[1, 2, 3].map((g) => cell(p, g)).join("")}</tr>`).join("")}
      </tbody></table></div></div>
      <div class="panel" style="padding:10px 12px"><b style="font-size:13px">이 날 만들어지는 감독 자리 (일반 모드)</b><div class="slotsum" id="sum-${stage.id}" style="margin-top:6px"></div></div>
      <div class="toast" id="tst-${stage.id}" aria-live="polite"></div>`;
    summary();
    if (opts?.after) opts.after(st);
  }
  function cell(p, g) {
    const l = ls(p, g);
    const plus = `<button class="plus" tabindex="-1" data-plus="${cellKey(p, g)}" title="추가 과목·고사실 설정" aria-label="${p}교시 ${g}학년 추가 과목·고사실 설정">＋</button>`;
    if (l.length > 1)
      return `<td class="filled"><button class="multi" data-cell="${cellKey(p, g)}" data-open="${cellKey(p, g)}">${l.map((x) => `<span>${esc(x.s)} <small>${x.rooms.length}실</small></span>`).join("")}</button>${plus}</td>`;
    const v = l[0]?.s || "", used = l[0]?.rooms.length ?? 0, all = SROOMS[g].length;
    return `<td class="${v ? "filled" : ""}"><input class="subj" data-cell="${cellKey(p, g)}" aria-label="${p}교시 ${g}학년 과목" placeholder="과목" value="${esc(v)}" autocomplete="off">${l.length === 1 && used < all ? `<span class="part">${used}/${all}실</span>` : ""}${plus}</td>`;
  }
  function commit(inp) {
    const [p, g] = inp.dataset.cell.split("|").map(Number), v = inp.value.trim(), cur = ls(p, g);
    if (cur.length === 1 && cur[0].s === v) return false;
    if (!cur.length && !v) return false;
    const old = cur[0];
    st.lessons = st.lessons.filter((l) => !(l.p === p && l.g === g));
    if (v) st.lessons.push({ id: old?.id ?? "n" + uid++, p, g, s: v, rooms: old?.rooms ?? [...SROOMS[g]] });
    return true;
  }
  function move(from, key) {
    const [p, g] = from.dataset.cell.split("|").map(Number);
    let t;
    if (key === "ArrowUp") t = [p - 1, g]; else if (key === "ArrowDown") t = [p + 1, g]; else t = [p, g + (key === "ArrowLeft" ? -1 : 1)];
    const el = $(`[data-cell="${t[0]}|${t[1]}"]`, stage);
    if (!el) return false;
    el.focus(); if (el.select) el.select();
    return true;
  }
  stage.addEventListener("focusout", (e) => {
    if (!e.target.classList?.contains("subj")) return;
    if (commit(e.target)) {
      const key = e.target.dataset.cell, refocus = document.activeElement?.dataset?.cell;
      render();
      if (refocus) { const el = $(`[data-cell="${refocus}"]`, stage); el?.focus(); el?.select?.(); }
      else if (key) {}
    } else summary();
  });
  stage.addEventListener("keydown", (e) => {
    const el = e.target;
    if (!el.dataset?.cell) return;
    if (el.classList.contains("subj")) {
      if (e.key === "Escape") { const [p, g] = el.dataset.cell.split("|").map(Number); el.value = ls(p, g)[0]?.s || ""; el.blur(); return; }
      if (e.isComposing) return;
      if (e.key === "Enter") { e.preventDefault(); if (!move(el, "ArrowDown")) el.blur(); return; }
      const all = el.selectionStart === 0 && el.selectionEnd === el.value.length;
      const atS = all || (el.selectionStart === 0 && el.selectionEnd === 0), atE = all || (el.selectionStart === el.value.length);
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || (e.key === "ArrowLeft" && atS) || (e.key === "ArrowRight" && atE)) { if (move(el, e.key)) e.preventDefault(); }
    } else if (e.key.startsWith("Arrow")) { if (move(el, e.key)) e.preventDefault(); }
  });
  stage.addEventListener("mousedown", (e) => { if (e.target.dataset?.plus) e.preventDefault(); });
  stage.addEventListener("click", (e) => {
    const t = e.target.closest("[data-pm],[data-plus],[data-open]");
    if (!t) return;
    if (t.dataset.pm) {
      const n = st.periods + +t.dataset.pm;
      if (n < 1 || n > 7) return;
      if (n < st.periods) st.lessons = st.lessons.filter((l) => l.p <= n);
      st.periods = n; render(); return;
    }
    const key = t.dataset.plus || t.dataset.open;
    const inp = $(`input[data-cell="${key}"]`, stage);
    if (inp) commit(inp);
    openDetail(...key.split("|").map(Number));
  });
  function openDetail(p, g) {
    let draft = structuredClone(ls(p, g));
    if (!draft.length) draft = [{ id: "n" + uid++, p, g, s: "", rooms: [...SROOMS[g]] }];
    const body = document.createElement("div");
    body.style.display = "grid"; body.style.gap = "12px";
    const m = modal(stage, { title: "추가 과목·고사실 설정", sub: `10월 19일 (월) · ${p}교시 · ${g}학년`, body, foot: `<button class="btn" data-x>취소</button><button class="btn primary" data-ok>적용완료</button>` });
    const paint = () => {
      body.innerHTML = draft.map((l, i) => `<div class="sblock"><div class="row" style="flex-wrap:nowrap"><input type="text" data-i="${i}" aria-label="과목명 ${i + 1}" placeholder="과목명 입력 (예: 물리 / 화학)" value="${esc(l.s)}" style="flex:1"><button class="btn" data-rm="${i}" aria-label="과목 ${i + 1} 삭제">×</button></div>
        ${i === 0 ? `<p class="desc">추가 과목이 필요하면 아래 ‘과목 추가’로 과목을 더하고 고사실을 나눠 고르세요. 한 반은 한 과목에만 속합니다. 같은 반이 두 과목을 함께 보면 쉼표(,)로 적으세요.</p>` : ""}
        <div class="tools"><b>적용 고사실 <small style="color:var(--app-ink-3)">${l.rooms.length}실</small></b><button class="link" data-all="${i}">전체 선택</button><button class="link" data-none="${i}">전체 해제</button></div>
        <div class="roomgrid">${SROOMS[g].map((r) => `<button aria-pressed="${l.rooms.includes(r)}" data-room="${r}" data-ri="${i}">${r}</button>`).join("")}</div></div>`).join("") +
        `<button class="dashed" data-addsub>＋ 과목 추가</button>`;
    };
    paint();
    body.addEventListener("input", (e) => { if (e.target.dataset.i) draft[+e.target.dataset.i].s = e.target.value; });
    body.addEventListener("click", (e) => {
      const d = e.target.dataset;
      if (d.rm !== undefined) draft.splice(+d.rm, 1);
      else if (d.all !== undefined) draft.forEach((l, k) => (l.rooms = k === +d.all ? [...SROOMS[g]] : []));
      else if (d.none !== undefined) draft[+d.none].rooms = [];
      else if (d.room) { const i = +d.ri, on = draft[i].rooms.includes(d.room); draft.forEach((l, k) => { l.rooms = l.rooms.filter((r) => r !== d.room); if (k === i && !on) l.rooms.push(d.room); }); draft.forEach((l) => l.rooms.sort()); }
      else if (d.addsub !== undefined) draft.push({ id: "n" + uid++, p, g, s: "", rooms: SROOMS[g].filter((r) => !draft.some((l) => l.rooms.includes(r))) });
      else return;
      paint();
      if (d.addsub !== undefined) $$("input", body).at(-1).focus();
    });
    $("[data-x]", m.ft).onclick = m.close;
    $("[data-ok]", m.ft).onclick = () => {
      st.lessons = st.lessons.filter((l) => !(l.p === p && l.g === g)).concat(draft.filter((l) => l.s.trim()).map((l) => ({ ...l, s: l.s.trim() })));
      m.close(); render();
      opts?.applied?.(st, p, g);
    };
  }
  function summary() {
    const el = $(`#sum-${stage.id}`); if (!el) return;
    const rows = [];
    for (let p = 1; p <= st.periods; p++) {
      const l = st.lessons.filter((x) => x.p === p);
      if (!l.length) { rows.push(`<div><b>${p}교시</b><span class="desc">시험 없음 · 감독 자리 0</span></div>`); continue; }
      const rooms = new Set(l.flatMap((x) => x.rooms)).size;
      const self = l.every((x) => x.s === "자습");
      const hall = self ? 0 : HALLS.length;
      const subs = [...new Set(l.flatMap((x) => x.s.split(/[,/]/).map((s) => s.trim()).filter(Boolean)))].filter((s) => s !== "자습");
      rows.push(`<div><b>${p}교시</b><span>교실 ${rooms} + 복도 ${hall} = <b style="min-width:0">${rooms + hall}자리</b></span>${self ? '<span class="desc">자습: 복도 감독 없음</span>' : ""}${subs.length ? `<span class="ex">감독 제외: ${subs.map(esc).join(", ")} 담당 교사</span>` : ""}</div>`);
    }
    el.innerHTML = rows.join("");
  }
  reset();
  return { reset, get: () => st };
}
const schedCtl = makeSched($("#schedStage"), {
  periods: 3,
  lessons: [
    { id: "a", p: 1, g: 1, s: "국어", rooms: [...SROOMS[1]] },
    { id: "b", p: 1, g: 2, s: "수학", rooms: [...SROOMS[2]] },
    { id: "c", p: 2, g: 1, s: "영어", rooms: [...SROOMS[1]] },
  ],
});
resets.sched = schedCtl.reset;
const multiCtl = makeSched($("#multiStage"), {
  periods: 2,
  lessons: [
    { id: "a", p: 1, g: 1, s: "국어", rooms: [...SROOMS[1]] },
    { id: "b", p: 1, g: 2, s: "수학", rooms: [...SROOMS[2]] },
    { id: "c", p: 1, g: 3, s: "물리, 화학", rooms: [...SROOMS[3]] },
    { id: "d", p: 2, g: 1, s: "자습", rooms: [...SROOMS[1]] },
    { id: "e", p: 2, g: 2, s: "영어", rooms: ["2-1", "2-2", "2-3"] },
    { id: "f", p: 2, g: 3, s: "일본어", rooms: [...SROOMS[3]] },
  ],
}, {
  applied(st, p, g) {
    const l = st.lessons.filter((x) => x.p === 2 && x.g === 3);
    const t = $("#tst-multiStage");
    const ja = l.find((x) => x.s.includes("일본어")), zh = l.find((x) => x.s.includes("중국어"));
    if (ja && zh && ja.rooms.join() === "3-1,3-2" && zh.rooms.join() === "3-3,3-4") { t.className = "toast"; t.textContent = "완료! 3학년 2교시 칸에 ‘일본어 2실 / 중국어 2실’이 표시되고, 일본어·중국어 담당 교사 모두 2교시 감독에서 빠집니다."; }
    else t.textContent = "";
  },
});
resets.multi = multiCtl.reset;

/* ---------- 6. 명단 가져오기 ---------- */
let imp;
const COMCI = [
  { name: "김수*", subj: "국어", home: "1-1", note: "" },
  { name: "이주*", subj: "수학", home: "1-2", note: "" },
  { name: "이주*", subj: "통사", home: "", note: "" },
  { name: "박지*", subj: "영어", home: "2-5", note: "" },
  { name: "최서*", subj: "과학", home: "", note: "" },
  { name: "정하*", subj: "체육", home: "", note: "담임학급 중복(2-1, 2-2) 확인 필요" },
];
const IMP_ROOMS = ["1-1", "1-2", "1-3", "2-1", "2-2", "2-3"];
function importInit() { imp = { stage: "src", q: "", hits: null, rows: null, added: [] }; importRender(); }
resets.import = importInit;
function importRender() {
  const s = $("#importStage");
  if (imp.stage === "src") {
    s.innerHTML = `<div class="row" style="justify-content:space-between"><div><h5>교사 기본 정보 설정</h5><p class="desc">명단 가져오기를 눌러 시작하세요.</p></div><button class="btn ghost" id="impOpen">명단 가져오기</button></div>${addedTable()}`;
    $("#impOpen").onclick = () => { imp.stage = "dialog"; importRender(); };
    return;
  }
  s.innerHTML = `<div class="panel" style="padding:12px;display:grid;gap:10px"><div class="row" style="justify-content:space-between"><b>교사 명단 가져오기</b><button class="btn" id="impClose">취소</button></div><p class="desc">엑셀·Google Sheets·컴시간에서 교사를 불러와 명단에 추가합니다.</p><div id="impBody"></div></div>${addedTable()}`;
  $("#impClose").onclick = () => { imp.stage = "src"; imp.rows = null; imp.hits = null; importRender(); };
  const b = $("#impBody");
  if (!imp.rows) {
    b.innerHTML = `<div class="importsrc"><form class="src" id="impForm"><b>컴시간 학교 검색</b><div class="row"><input type="text" id="impQ" placeholder="학교 이름 2글자 이상" aria-label="명단 가져올 학교 이름" value="${esc(imp.q)}" style="flex:1"><button class="btn" type="submit">학교 검색</button></div><p>학교를 선택하면 공개된 교사 명단을 불러옵니다.</p><div id="impHits" style="display:grid;gap:6px"></div></form>
      <div class="src"><b>Google Sheets 링크</b><div class="row"><input type="text" placeholder="https://docs.google.com/spreadsheets/d/…" aria-label="Google Sheets 링크" style="flex:1"><button class="btn primary" data-mock>불러오기</button></div><p>시트의 <b>공유 → 링크가 있는 모든 사용자(뷰어)</b>로 설정한 뒤 링크를 붙여넣으세요.</p></div>
      <div class="src"><b>엑셀·CSV 파일</b><button class="btn" data-mock>엑셀·CSV 파일 선택</button><p>.xlsx, .csv, .tsv 파일을 지원합니다.</p></div></div>
      <div class="toast warn" id="impTst"></div>`;
    $$("[data-mock]", b).forEach((x) => x.onclick = (e) => { e.preventDefault(); $("#impTst").textContent = "연습 화면에서는 컴시간 검색만 동작합니다. 실제 앱에서는 파일·링크를 읽은 뒤 같은 미리보기 표가 나옵니다(열 연결 목록 포함)."; });
    $("#impForm").onsubmit = (e) => { e.preventDefault(); imp.q = $("#impQ").value.trim(); imp.hits = imp.q.length >= 2 && "한빛중학교".includes(imp.q.replace(/\s/g, "").slice(0, 2)) ? [SCHOOLS[0]] : []; paint(); };
    const paint = () => {
      const h = $("#impHits");
      if (imp.hits === null) return;
      h.innerHTML = imp.hits.length ? imp.hits.map((x) => `<button type="button" class="school-hit"><span>${x.name}</span><small>${x.region}</small></button>`).join("") : `<p class="desc">검색된 학교가 없습니다. (예시: “한빛”)</p>`;
      $$("button", h).forEach((x) => x.onclick = () => { imp.rows = COMCI.map((r) => ({ ...r, on: true })); importRender(); });
    };
    paint();
    return;
  }
  const chosen = imp.rows.filter((r) => r.on && r.name.trim());
  const masked = imp.rows.filter((r) => r.on && r.name.includes("*")).length;
  b.innerHTML = `<div class="row"><span style="color:var(--app-accent);font-weight:700">✓</span><b>컴시간 · 한빛중학교 (서울)에서 불러왔습니다</b></div>
    <p class="desc">담당과목과 담임학급을 직접 수정할 수 있습니다. 여러 과목은 쉼표로 구분하세요.</p>
    <div class="scroll"><table class="g"><thead><tr><th><input type="checkbox" id="impAll" aria-label="전체 선택" ${imp.rows.every((r) => r.on) ? "checked" : ""}></th><th>교사명</th><th>담당과목</th><th>담임학급</th><th>확인 사항</th></tr></thead><tbody>
    ${imp.rows.map((r, i) => {
      const linked = !r.home || IMP_ROOMS.includes(r.home);
      return `<tr><td><input type="checkbox" data-on="${i}" ${r.on ? "checked" : ""} aria-label="${i + 1}행 가져오기"></td>
      <td><input type="text" data-f="name" data-i="${i}" value="${esc(r.name)}" aria-label="${i + 1}행 교사명" style="width:90px;${r.name.includes("*") ? "border-color:var(--app-amber)" : ""}"></td>
      <td><input type="text" data-f="subj" data-i="${i}" value="${esc(r.subj)}" aria-label="${i + 1}행 담당과목" style="width:100px;${r.subj === "통사" ? "border-color:var(--app-amber)" : ""}"></td>
      <td>${r.home ? `${esc(r.home)} <span class="${linked ? "linked" : "unlinked"}">${linked ? "고사실 연결됨" : "미연결 · 확인 필요"}</span>` : "—"}</td>
      <td style="text-align:left;font-size:12px;color:var(--app-ink-2)">${[r.name.includes("*") ? "가려진 이름" : "", r.subj === "통사" ? "과목 약칭 → 시험 과목명과 맞추기" : "", r.note].filter(Boolean).join(" · ") || "—"}</td></tr>`;
    }).join("")}</tbody></table></div>
    <div class="row" style="justify-content:space-between"><span class="desc">${chosen.length}명 선택${masked ? ` · 가려진 이름 ${masked}명` : ""}</span><div class="row"><button class="btn" id="impBack">다른 명단 불러오기</button><button class="btn primary" id="impAdd" ${chosen.length ? "" : "disabled"}>${chosen.length}명 추가</button></div></div>`;
  b.oninput = (e) => { const d = e.target.dataset; if (d.f) { imp.rows[+d.i][d.f] = e.target.value; } };
  b.onchange = (e) => {
    const d = e.target.dataset;
    if (d.on !== undefined) imp.rows[+d.on].on = e.target.checked;
    else if (e.target.id === "impAll") imp.rows.forEach((r) => (r.on = e.target.checked));
    else if (!d.f) return;
    importRender();
  };
  $("#impBack").onclick = () => { imp.rows = null; importRender(); };
  $("#impAdd").onclick = () => {
    imp.added.push(...chosen.map((r) => ({ ...r, review: [r.home && !IMP_ROOMS.includes(r.home) ? `담임 ${r.home}: 고사실에 없는 학급` : "", r.note].filter(Boolean) })));
    imp.stage = "src"; imp.rows = null; imp.hits = null; importRender();
  };
}
function addedTable() {
  if (!imp.added.length) return "";
  return `<div class="scroll"><table class="g"><thead><tr><th>순번</th><th>교사명</th><th>담당과목</th><th>담임</th><th>비고 / 역할</th></tr></thead><tbody>${imp.added.map((r, i) => `<tr><td>${i + 1}</td><td class="name">${esc(r.name)} ${r.review.length ? `<span class="review" title="${esc(r.review.join(" / "))}">수정 필요</span>` : ""}</td><td>${r.subj ? `<span class="chip sub">${esc(r.subj)}</span>` : ""}</td><td>${r.home && IMP_ROOMS.includes(r.home) ? `<span class="chip sub">${esc(r.home)}</span>` : '<span class="desc">담임 선택</span>'}</td><td><span class="role normal">일반 교사</span> <span class="desc">${esc(r.review.join(" / "))}</span></td></tr>`).join("")}</tbody></table></div>
  <p class="desc">명단에 추가되었습니다. ${imp.added.some((r) => r.name.includes("*")) ? "아직 가려진 이름이 있습니다. 실제 앱에서는 ‘이름·과목 일괄 편집’으로 한 번에 고칠 수 있습니다." : "‘수정 필요’ 배지에 마우스를 올리면 사유가 보입니다."}</p>`;
}
importInit();

/* ---------- 7. 교사 명단 ---------- */
const ALL_SUBJ = ["국어", "수학", "영어", "사회", "과학", "역사", "음악", "미술", "체육", "물리", "화학", "일본어", "중국어"];
const T_ROOMS = { 1: ["1-1", "1-2", "1-3"], 2: ["2-1", "2-2", "2-3"], 3: ["3-1", "3-2", "3-3"] };
const ROLES = { normal: "일반 교사", designated: "지정배치", lecturer: "시간강사", support: "비교과", roaming: "순회", hallway: "복도 전담", excluded: "감독 제외" };
let tc;
function teachInit() {
  tc = { open: null, tab: 1, list: [
    { name: "김민서", subj: ["국어"], home: "1-1", mov: [], role: "normal", memo: "" },
    { name: "박지우", subj: ["영어"], home: null, mov: ["2-3"], role: "lecturer", memo: "화·목 출근" },
    { name: "한소윤", subj: ["미술"], home: null, mov: [], role: "normal", memo: "" },
  ] };
  teachRender();
}
resets.teach = teachInit;
function teachRender() {
  const s = $("#teachStage");
  const roleCls = (r) => r === "normal" ? "normal" : r === "excluded" ? "ex" : "sp";
  s.innerHTML = `<div class="row" style="justify-content:space-between"><div><h5>교사 기본 정보 설정</h5><p class="desc">과목·담임·감독불가학급 칸을 클릭해 선택하세요. 복수 과목과 여러 감독불가학급을 지정할 수 있습니다.</p></div><div class="row"><button class="btn ghost">명단 가져오기</button><button class="btn ghost">이름·과목 일괄 편집</button><button class="btn" id="tcAdd">＋ 교사 추가</button></div></div>
  <div class="scroll" style="position:relative"><table class="g"><thead><tr><th>순번</th><th>교사명</th><th>담당과목</th><th>담임</th><th>감독불가학급</th><th>비고 / 역할</th></tr></thead><tbody>
  ${tc.list.map((t, i) => `<tr><td>${i + 1}</td><td class="name">${esc(t.name)}</td>
    <td><button class="cellbtn" data-pk="subj" data-i="${i}" aria-label="${esc(t.name)} 담당과목 선택">${t.subj.map((x) => `<span class="chip sub">${esc(x)}</span>`).join("") || '<span class="ph">+ 과목 선택</span>'}</button></td>
    <td><button class="cellbtn" data-pk="home" data-i="${i}" aria-label="${esc(t.name)} 담임 학급 선택">${t.home ? `<span class="chip sub">${t.home}</span>` : '<span class="ph">담임 선택</span>'}</button></td>
    <td><button class="cellbtn" data-pk="mov" data-i="${i}" aria-label="${esc(t.name)} 감독불가학급 선택">${t.mov.map((x) => `<span class="chip sub">${x}</span>`).join("") || '<span class="ph">+ 감독불가학급</span>'}</button></td>
    <td style="text-align:left"><div class="row" style="flex-wrap:nowrap"><select data-role="${i}" aria-label="${esc(t.name)} 역할">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${t.role === k ? "selected" : ""}>${v}</option>`).join("")}</select><input type="text" data-memo="${i}" value="${esc(t.memo)}" placeholder="추가 메모" aria-label="${esc(t.name)} 메모" style="width:100px"></div></td></tr>`).join("")}
  </tbody></table><div id="tcPop"></div></div>
  <div class="panel" style="padding:10px 12px;font-size:13px;display:grid;gap:4px"><b>이 설정으로 정해지는 배정 조건</b>${tc.list.map((t) => `<div><span class="role ${roleCls(t.role)}">${ROLES[t.role]}</span> <b>${esc(t.name)}</b>: ${explain(t)}</div>`).join("")}</div>`;
  if (tc.open) pop();
}
function explain(t) {
  if (t.role === "excluded") return "어떤 감독에도 배정되지 않습니다.";
  const a = [];
  if (t.subj.length) a.push(`${t.subj.join("·")} 시험 교시 감독 제외`);
  if (t.home) a.push(`${t.home} 고사실 감독 금지`);
  if (t.mov.length) a.push(`${t.mov.join(", ")} 고사실 감독 금지`);
  if (t.role !== "normal") a.push(`<b style="color:var(--app-blue)">특별교사 감독 설정에서 체크한 교시에만</b> 감독`);
  else a.push("나머지 교시에서 점수 균등 배정");
  return a.join(" · ");
}
function pop() {
  const { k, i } = tc.open, t = tc.list[i];
  const btn = $(`[data-pk="${k}"][data-i="${i}"]`, $("#teachStage"));
  const box = $("#tcPop");
  const host = box.parentElement.getBoundingClientRect(), r = btn.getBoundingClientRect();
  const left = Math.max(0, Math.min(r.left - host.left, host.width - 250));
  let inner = "";
  if (k === "subj") inner = `<b style="font-size:13px">${esc(t.name)} 담당과목</b><span class="desc">여러 항목을 클릭하여 선택할 수 있습니다.</span><div class="opts">${ALL_SUBJ.map((x) => `<button data-opt="${x}" aria-pressed="${t.subj.includes(x)}">${x}</button>`).join("")}</div>`;
  else {
    inner = `<b style="font-size:13px">${esc(t.name)} ${k === "home" ? "담임 학급" : "감독불가학급"}</b><span class="desc">${k === "home" ? "하나의 학급을 선택하세요. 선택한 항목을 다시 누르면 해제됩니다." : "여러 학급을 고를 수 있습니다."}</span>
      <div class="tabs">${[1, 2, 3].map((g) => `<button data-tab="${g}" aria-pressed="${tc.tab === g}">${g}학년</button>`).join("")}</div>
      <div class="opts">${T_ROOMS[tc.tab].map((x) => `<button data-opt="${x}" aria-pressed="${k === "home" ? t.home === x : t.mov.includes(x)}">${x}</button>`).join("")}</div>`;
  }
  box.innerHTML = `<div class="pick-pop" style="left:${left}px;top:${r.bottom - host.top + 4}px">${inner}<div class="row" style="justify-content:flex-end"><button class="btn primary" data-close>닫기</button></div></div>`;
}
$("#teachStage").addEventListener("click", (e) => {
  const t = e.target.closest("button"); if (!t) return;
  const d = t.dataset;
  if (d.pk) { tc.open = tc.open && tc.open.k === d.pk && tc.open.i === +d.i ? null : { k: d.pk, i: +d.i }; if (tc.open && d.pk !== "subj") { const cur = tc.list[+d.i]; const g = (d.pk === "home" ? cur.home : cur.mov[0])?.[0]; tc.tab = +g || 1; } teachRender(); return; }
  if (d.close !== undefined) { tc.open = null; teachRender(); return; }
  if (d.tab) { tc.tab = +d.tab; teachRender(); return; }
  if (d.opt && tc.open) {
    const x = tc.list[tc.open.i], k = tc.open.k;
    if (k === "home") x.home = x.home === d.opt ? null : d.opt;
    else { const l = x[k]; l.includes(d.opt) ? l.splice(l.indexOf(d.opt), 1) : l.push(d.opt); }
    teachRender(); return;
  }
  if (t.id === "tcAdd") { tc.list.push({ name: "새 교사", subj: [], home: null, mov: [], role: "normal", memo: "" }); teachRender(); }
});
$("#teachStage").addEventListener("change", (e) => { const d = e.target.dataset; if (d.role) { tc.list[+d.role].role = e.target.value; teachRender(); } });
$("#teachStage").addEventListener("input", (e) => { const d = e.target.dataset; if (d.memo) tc.list[+d.memo].memo = e.target.value; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && tc?.open) { tc.open = null; teachRender(); } });
teachInit();

/* ---------- 8·9. 체크 표 ---------- */
const TIMES = [["19", 1], ["19", 2], ["19", 3], ["20", 1], ["20", 2], ["20", 3]];
const tk = (t) => t.join("-");
function timeHead() {
  return `<thead><tr><th rowspan="2">교사명</th><th colspan="3">10월 19일 (월)</th><th colspan="3">10월 20일 (화)</th><th rowspan="2" EXTRA></th><th rowspan="2">초기화</th></tr><tr>${TIMES.map((t) => `<th>${t[1]}교시</th>`).join("")}</tr></thead>`;
}
let sp;
const PLACE = { hallwayFirst: "복도 우선", classroomFirst: "교과 우선", any: "교과·복도 모두", hallwayOnly: "복도만" };
function specialInit() {
  sp = { list: [
    { name: "박지우", role: "시간강사", place: "hallwayFirst", on: [] },
    { name: "정하준", role: "복도 전담", place: "hallwayOnly", on: ["20-2", "20-3"] },
    { name: "윤지호", role: "순회", place: "any", on: ["19-3"] },
  ] };
  specialRender();
}
resets.special = specialInit;
function specialRender() {
  const s = $("#specialStage");
  s.innerHTML = `<p class="desc">특별교사(지정배치·시간강사·비교과·순회·복도 전담)는 체크한 교시에만, 체크한 교시마다 반드시 감독합니다. 감독하는 교시에 체크하고 배치 자리를 고르세요.</p>
  <div class="row"><button class="btn ghost">시간표에서 불러오기</button></div>
  <div class="scroll"><table class="g">${timeHead().replace("EXTRA", "").replace('<th rowspan="2" ></th>', '<th rowspan="2">배치 자리</th>')}<tbody>
  ${sp.list.map((t, i) => `<tr><td class="name">${esc(t.name)} <span class="role sp">${t.role}</span></td>${TIMES.map((x) => `<td><button class="circ blue ${t.on.includes(tk(x)) ? "on" : ""}" data-sp="${i}" data-t="${tk(x)}" aria-pressed="${t.on.includes(tk(x))}" aria-label="${esc(t.name)} ${x[0]}일 ${x[1]}교시 지정배치">✓</button></td>`).join("")}
  <td><select data-place="${i}" aria-label="${esc(t.name)} 배치 자리">${Object.entries(PLACE).map(([k, v]) => `<option value="${k}" ${t.place === k ? "selected" : ""}>${v}</option>`).join("")}</select></td><td><button class="link" data-spr="${i}">초기화</button></td></tr>`).join("")}
  </tbody></table></div>
  <div class="panel" style="padding:10px 12px;font-size:13px;display:grid;gap:3px">${sp.list.map((t) => `<div><b>${esc(t.name)}</b>: ${t.on.length ? `${t.on.length}개 교시 반드시 감독 (${t.on.map((x) => x.replace("-", "일 ") + "교시").join(", ")}) · ${PLACE[t.place]}` : '<span style="color:var(--app-red)">지정 교시가 없어 감독에 배정되지 않습니다.</span>'}</div>`).join("")}</div>
  <div class="toast" id="spTst">${sp.list[0].on.includes("19-1") && sp.list[0].on.includes("19-2") ? "좋습니다. 박지우는 19일 1·2교시에 반드시 배정되고, 복도 자리가 먼저 고려됩니다." : ""}</div>
  <div class="row" style="justify-content:flex-end"><button class="btn primary">저장 및 다음 단계</button></div>`;
}
$("#specialStage").addEventListener("click", (e) => {
  const d = e.target.closest("button")?.dataset; if (!d) return;
  if (d.sp) { const l = sp.list[+d.sp].on; l.includes(d.t) ? l.splice(l.indexOf(d.t), 1) : l.push(d.t); specialRender(); }
  if (d.spr) { sp.list[+d.spr].on = []; specialRender(); }
});
$("#specialStage").addEventListener("change", (e) => { const d = e.target.dataset; if (d.place) { sp.list[+d.place].place = e.target.value; specialRender(); } });
specialInit();

let un;
function unavInit() {
  un = { list: [
    { name: "김민서", subj: "국어", off: ["19-3"], why: "출장" },
    { name: "이서준", subj: "수학", off: [], why: "" },
    { name: "최서연", subj: "사회", off: [], why: "" },
    { name: "강도윤", subj: "국어", off: [], why: "" },
  ], fresh: [] };
  unavRender();
}
resets.unav = unavInit;
function unavRender() {
  const s = $("#unavStage");
  s.innerHTML = `<p class="desc">일반 교사는 체크하지 않은 교시에서 자동으로 고르게 배정됩니다. 출장·육아시간 등으로 감독할 수 없는 교시에만 체크하세요.</p>
  <div class="row"><button class="btn ghost" id="unTT">시간표에서 불러오기</button></div>
  <div class="scroll"><table class="g">${timeHead().replace("EXTRA", "").replace('<th rowspan="2" ></th>', '<th rowspan="2">사유</th>')}<tbody>
  ${un.list.map((t, i) => `<tr><td class="name">${esc(t.name)}</td>${TIMES.map((x) => { const on = t.off.includes(tk(x)); return `<td><button class="circ red ${on ? "on" : ""} ${un.fresh.includes(i + "|" + tk(x)) ? "new" : ""}" data-un="${i}" data-t="${tk(x)}" aria-pressed="${on}" aria-label="${esc(t.name)} ${x[0]}일 ${x[1]}교시 불가">−</button></td>`; }).join("")}
  <td><input type="text" class="reason" data-why="${i}" value="${esc(t.why)}" placeholder="${i === 0 ? "출장, 육아시간 등" : ""}" aria-label="${esc(t.name)} 불가 사유"></td><td><button class="link" data-unr="${i}">초기화</button></td></tr>`).join("")}
  </tbody></table></div><div class="toast" id="unTst" aria-live="polite"></div><div class="stage" id="unModal" style="min-height:0"></div>`;
  $("#unTT").onclick = timetable;
}
$("#unavStage").addEventListener("click", (e) => {
  const d = e.target.closest("button")?.dataset; if (!d) return;
  if (d.un) { const l = un.list[+d.un].off; l.includes(d.t) ? l.splice(l.indexOf(d.t), 1) : l.push(d.t); un.fresh = []; unavRender(); }
  if (d.unr) { un.list[+d.unr].off = []; un.list[+d.unr].why = ""; unavRender(); }
});
$("#unavStage").addEventListener("input", (e) => { const d = e.target.dataset; if (d.why) un.list[+d.why].why = e.target.value; });
function timetable() {
  const rows = [
    { label: "이서*", subj: "수학", times: ["19-2", "20-1"], cands: [1], pick: 1 },
    { label: "최서*", subj: "사회", times: ["20-3"], cands: [2], pick: 2 },
    { label: "강도*", subj: "국어", times: ["19-1"], cands: [3], pick: 3 },
    { label: "김*", subj: "체육", times: ["20-2"], cands: [], pick: -1 },
  ];
  rows.forEach((r) => (r.on = r.pick >= 0));
  const body = document.createElement("div");
  body.style.display = "grid"; body.style.gap = "10px";
  const m = modal($("#unModal"), { title: "시간표에서 불러오기", sub: "시험 시간에 수업이 있는 일반 교사를 감독불가로 체크합니다. 기존 체크는 그대로 두고 더하기만 합니다.", body, foot: `<button class="btn" data-x>취소</button><button class="btn primary" data-ok>적용</button>` });
  const paint = () => {
    const n = rows.filter((r) => r.on && r.pick >= 0).length;
    body.innerHTML = `<div class="row" style="font-size:12.5px"><span class="seg2"><button aria-pressed="true">컴시간 · 한빛중학교</button><button aria-pressed="false">엑셀 시간표</button></span></div>
    <div class="desc">19일: 그 주 실제 시간표 · 20일: 기본 시간표(요일 기준)</div>
    <div class="scroll"><table class="g"><thead><tr><th>적용</th><th>시간표 표기</th><th>과목</th><th>연결할 교사</th><th>시험 시간 수업</th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr><td><input type="checkbox" data-ron="${i}" ${r.on ? "checked" : ""} ${r.pick < 0 ? "disabled" : ""} aria-label="${r.label} 적용"></td><td>${r.label}</td><td>${r.subj}</td>
      <td><select data-rpick="${i}" aria-label="${r.label} 연결할 교사"><option value="-1">${r.cands.length ? "연결 안 함" : "명단에 없음 · 연결 안 함"}</option>${un.list.map((t, k) => `<option value="${k}" ${r.pick === k ? "selected" : ""}>${t.name} (${t.subj})</option>`).join("")}</select></td>
      <td style="font-size:12px">${r.times.map((x) => x.replace("-", "일 ") + "교시").join(", ")}</td></tr>`).join("")}</tbody></table></div>
    <div class="desc">선택 ${n} / ${rows.length}명 · 체육 “김*”은 명단에 없어 연결되지 않았습니다(시간강사 등). 직접 고르거나 비워 둡니다.</div>`;
    $("[data-ok]", m.ft).disabled = !n;
  };
  paint();
  body.addEventListener("change", (e) => {
    const d = e.target.dataset;
    if (d.ron) rows[+d.ron].on = e.target.checked;
    if (d.rpick) { rows[+d.rpick].pick = +e.target.value; rows[+d.rpick].on = +e.target.value >= 0; }
    paint();
  });
  $("[data-x]", m.ft).onclick = m.close;
  $("[data-ok]", m.ft).onclick = () => {
    un.fresh = []; let changed = 0;
    rows.filter((r) => r.on && r.pick >= 0).forEach((r) => {
      const t = un.list[r.pick]; let any = false;
      r.times.forEach((x) => { if (!t.off.includes(x)) { t.off.push(x); un.fresh.push(r.pick + "|" + x); any = true; } });
      if (any) { changed++; if (!t.why) t.why = "교과수업"; }
    });
    m.close(); unavRender();
    $("#unTst").textContent = `${changed}명에게 수업 교시를 감독불가로 체크했습니다. 확인 후 저장하세요. (주황 테두리 = 이번에 더해진 칸)`;
  };
}
unavInit();

/* ---------- 10. 감독 방식 ---------- */
let md;
const MROOMS = ["1-1", "1-2", "2-1", "2-2"], MP = [1, 2, 3];
function modeInit() { md = { mode: "general", cw: 2, hw: 1, mc: 6, mh: 1, third: false, single: ["1-1|3", "1-2|3"] }; modeRender(); }
resets.mode = modeInit;
function modeRender() {
  const s = $("#modeStage"), ms = md.mode === "mainSub";
  const sc = (c, h) => +(c * md.cw + h * md.hw).toFixed(2);
  const a = sc(3, 1), b = sc(2, 2), c = sc(4, 0);
  const singles = md.single.length, total = MROOMS.length * MP.length;
  s.innerHTML = `<div class="panel" style="padding:12px;display:grid;gap:12px">
    <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div><b>정/부감독 모드</b><p class="desc">${ms ? "정감독·부감독을 배정합니다. 일반 모드의 가중치와 상한은 적용하지 않습니다." : "교실 감독과 복도 감독을 배정합니다."}</p></div><label class="switch"><input type="checkbox" id="mdSw" ${ms ? "checked" : ""} aria-label="정/부감독 모드"><span></span></label></div>
    <fieldset class="set" ${ms ? "disabled" : ""}><div class="box"><b style="font-size:13px">감독 가중치</b><label>교실 감독 <input type="number" min="0" step="0.5" id="mdCw" value="${md.cw}"></label><label>복도 감독 <input type="number" min="0" step="0.5" id="mdHw" value="${md.hw}"></label></div>
    <div class="box"><b style="font-size:13px">감독 횟수 참고 기준</b><label>전체 기간 교실 감독 <span><input type="number" min="0" id="mdMc" value="${md.mc}"> 회</span></label><label>하루 복도 감독 <span><input type="number" min="0" id="mdMh" value="${md.mh}"> 회</span></label><label style="font-size:12.5px">하루 3회 이상 교실 감독 경고 해제 <input type="checkbox" id="mdTh" ${md.third ? "checked" : ""}></label></div></fieldset>
    ${ms ? "" : `<div class="calc">점수 = 교실 횟수 × ${md.cw} + 복도 횟수 × ${md.hw}
김교사  교실 3 · 복도 1 → ${a}점
이교사  교실 2 · 복도 2 → ${b}점
박교사  교실 4 · 복도 0 → ${c}점   ${md.mc < 4 ? "⚠ 교실 상한 " + md.mc + "회 초과 경고" : ""}
점수 격차(최고−최저) = ${+(Math.max(a, b, c) - Math.min(a, b, c)).toFixed(2)}  ← 프로그램이 가장 먼저 줄이는 값</div>`}
  </div>
  ${ms ? `<div class="panel" style="padding:12px;display:grid;gap:10px"><div class="row" style="justify-content:space-between"><div><b>단독 감독 고사실 설정</b><p class="desc">칸을 눌러 정감독만 배치할 고사실을 고르세요. 고사실 이름은 그 줄 전체, 교시 머리글은 그 교시 전체를 한 번에 고릅니다.</p></div>${singles ? `<button class="btn" id="mdClr">전체 해제 · ${singles}칸</button>` : ""}</div>
    <div class="scroll"><table class="g single"><thead><tr><th>고사실</th>${MP.map((p) => `<th><button data-col="${p}">${p}교시</button></th>`).join("")}</tr></thead><tbody>
    ${MROOMS.map((r) => `<tr><th><button data-rowr="${r}">${r}</button></th>${MP.map((p) => { const on = md.single.includes(`${r}|${p}`); return `<td class="${on ? "on" : ""}"><button data-cellr="${r}|${p}" aria-pressed="${on}">${on ? "정감독만" : "정 + 부"}</button></td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="calc">필요한 감독 = 정감독 ${total}자리 + 부감독 ${total - singles}자리 = ${total * 2 - singles}자리 (복도 감독 없음)</div></div>` : ""}
  <div class="row" style="justify-content:space-between"><span class="desc">설정을 저장하고 감독을 배정합니다.</span><button class="btn primary">설정 저장 및 감독 배정 실행</button></div>`;
}
$("#modeStage").addEventListener("change", (e) => {
  const id = e.target.id, v = e.target.valueAsNumber;
  if (id === "mdSw") md.mode = e.target.checked ? "mainSub" : "general";
  else if (id === "mdTh") md.third = e.target.checked;
  else if (["mdCw", "mdHw", "mdMc", "mdMh"].includes(id) && Number.isFinite(v) && v >= 0) md[{ mdCw: "cw", mdHw: "hw", mdMc: "mc", mdMh: "mh" }[id]] = v;
  else return;
  modeRender();
});
$("#modeStage").addEventListener("click", (e) => {
  const d = e.target.closest("button")?.dataset; if (!d) return;
  let cells = null;
  if (d.cellr) cells = [d.cellr];
  if (d.rowr) cells = MP.map((p) => `${d.rowr}|${p}`);
  if (d.col) cells = MROOMS.map((r) => `${r}|${d.col}`);
  if (cells) { const on = !cells.every((c) => md.single.includes(c)); md.single = md.single.filter((c) => !cells.includes(c)); if (on) md.single.push(...cells); modeRender(); }
  if (e.target.id === "mdClr") { md.single = []; modeRender(); }
});
modeInit();

/* ---------- 12. 배정 조정 ---------- */
const SW_T = [
  { id: "kim", name: "김민서", subj: ["국어"], home: "1-1", mov: [], off: {} },
  { id: "lee", name: "이서준", subj: ["수학"], home: "1-2", mov: [], off: {} },
  { id: "park", name: "박지우", subj: ["영어"], home: "2-1", mov: [], off: {} },
  { id: "choi", name: "최서연", subj: ["사회"], home: "2-2", mov: [], off: {} },
  { id: "jung", name: "정하준", subj: ["과학"], home: null, mov: [], off: { 3: "출장" } },
  { id: "kang", name: "강도윤", subj: ["국어"], home: null, mov: [], off: {} },
  { id: "yoon", name: "윤지호", subj: ["음악"], home: null, mov: [], off: {} },
  { id: "han", name: "한소윤", subj: ["미술"], home: null, mov: [], off: {} },
  { id: "oh", name: "오유진", subj: ["체육"], home: null, mov: ["2-2"], off: {} },
];
const SW_SUBJ = { 1: ["국어", "수학"], 2: ["영어", "사회"], 3: ["과학", "국어"] };
const SW_R = ["1-1", "1-2", "2-1", "2-2", "본관 복도"];
const SW_INIT = {
  "1|1-1": "park", "1|1-2": "choi", "1|2-1": "jung", "1|2-2": "yoon", "1|본관 복도": "han",
  "2|1-1": "lee", "2|1-2": "kim", "2|2-1": "kang", "2|2-2": "jung", "2|본관 복도": "oh",
  "3|1-1": "choi", "3|1-2": "park", "3|2-1": "yoon", "3|2-2": "han", "3|본관 복도": "lee",
};
const SW_SUBJ_LBL = { 1: "1학년 국어 · 2학년 수학", 2: "1학년 영어 · 2학년 사회", 3: "1학년 과학 · 2학년 국어" };
function forbid(t, p, room) {
  const r = [];
  if (t.off[p]) r.push(`감독 불가 교시: ${t.off[p]}`);
  if (t.home === room) r.push("담임 학급");
  if (t.mov.includes(room)) r.push("감독불가학급");
  if (t.subj.some((s) => SW_SUBJ[p].includes(s))) r.push("담당 과목 시험 교시");
  return r;
}
function blockLabel(t, p) {
  if (t.off[p]) return t.off[p];
  const ex = t.subj.filter((s) => SW_SUBJ[p].includes(s));
  return ex.length ? `${ex.join("·")} 시험` : "";
}
let sw;
function swapInit() { sw = { base: { ...SW_INIT }, work: { ...SW_INIT }, hist: [], sel: null, view: "teacher", msg: "", bad: false, pick: null, saved: false }; swapRender(); }
resets.swap = swapInit;
const roomOf = (a, p, tid) => SW_R.find((r) => a[`${p}|${r}`] === tid) || null;
function swapRender() {
  const s = $("#swapStage"), a = sw.work;
  const diff = Object.keys(a).filter((k) => a[k] !== sw.base[k]).length + Object.keys(sw.base).filter((k) => !(k in a)).length;
  const score = (tid) => { let c = 0, h = 0; for (const p of [1, 2, 3]) { const r = roomOf(a, p, tid); if (r) r.includes("복도") ? h++ : c++; } return { s: c * 2 + h, n: c + h }; };
  const filled = Object.values(a).filter(Boolean).length;
  let grid;
  if (sw.view === "teacher") {
    grid = `<table class="g mx"><thead><tr><th rowspan="2">순</th><th rowspan="2">교사명</th><th rowspan="2">배정<br>점수</th><th colspan="3">10월 19일 (월)</th></tr><tr>${[1, 2, 3].map((p) => `<th title="${SW_SUBJ_LBL[p]}">${p}교시</th>`).join("")}</tr></thead><tbody>
    ${SW_T.map((t, i) => { const sc = score(t.id); return `<tr><td>${i + 1}</td><td class="name">${t.name}</td><td class="score">${sc.s}<small>${sc.n}회</small></td>${[1, 2, 3].map((p) => tcell(t, p)).join("")}</tr>`; }).join("")}</tbody></table>`;
  } else {
    grid = `<table class="g mx"><thead><tr><th rowspan="2">고사실</th><th colspan="3">10월 19일 (월)</th></tr><tr>${[1, 2, 3].map((p) => `<th>${p}교시</th>`).join("")}</tr></thead><tbody>
    ${SW_R.map((r) => `<tr><td class="name">${r}</td>${[1, 2, 3].map((p) => { const tid = a[`${p}|${r}`], t = SW_T.find((x) => x.id === tid); const ch = (sw.base[`${p}|${r}`] || null) !== (tid || null); return `<td class="rc ${t ? "" : "empty"} ${ch ? "changed" : ""}" data-rc="${p}|${r}" tabindex="0" role="button" aria-label="${r} ${p}교시 감독 배정">${t ? t.name : "미배정"}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`;
  }
  s.innerHTML = `<div class="row" style="justify-content:space-between"><h5>배정표</h5><div class="row"><button class="btn" ${diff ? "disabled title='임시 배정 조정을 반영한 뒤 내보내기 해주세요.'" : ""}>엑셀로 내보내기</button><button class="btn primary" ${diff ? "disabled" : ""}>▷ 자동 배정</button></div></div>
  <div class="stats"><span class="badge-opt" style="${diff || sw.saved ? "background:var(--app-fill);color:var(--app-ink-2)" : "background:var(--app-accent-soft);color:var(--app-accent)"}">${diff || sw.saved ? "수동 조정 결과" : "최적해 확인"}</span><span><b>${filled}</b> / 15자리 배정</span><span>미배정 <b>${15 - filled}</b></span><span>지정배치 미충족 <b>0</b></span></div>
  <div class="row" style="justify-content:space-between"><span class="seg2"><button data-view="teacher" aria-pressed="${sw.view === "teacher"}">교사별 보기 · 맞교환</button><button data-view="room" aria-pressed="${sw.view === "room"}">고사실별 보기 · 미배정 확인</button></span>
  ${diff ? `<div class="pendbar"><span>반영 전 변경 <b>${diff}자리</b></span><span class="row"><button class="btn ghost" data-undo ${sw.hist.length ? "" : "disabled"}>되돌리기</button><button class="btn ghost" data-cancel>모두 취소</button><button class="btn primary" data-apply>변경사항 반영</button></span></div>` : ""}</div>
  <p class="desc">${sw.view === "teacher" ? "같은 교시의 두 칸을 차례로 누르면 바로 교환됩니다. 빈칸을 고르면 감독을 다른 교사에게 옮깁니다. 선택한 칸을 다시 누르면 해제됩니다." : "고사실 칸을 클릭하면 배정 가능한 교사와 불가 사유를 확인할 수 있습니다."} <span style="color:var(--app-ink-3)">시험: 1교시 ${SW_SUBJ_LBL[1]} / 2교시 ${SW_SUBJ_LBL[2]} / 3교시 ${SW_SUBJ_LBL[3]}</span></p>
  <div class="toast ${sw.bad ? "bad" : ""}" aria-live="polite">${esc(sw.msg)}</div>
  <div class="scroll">${grid}</div>
  ${sw.view === "teacher" ? `<div class="legend"><span><i style="background:var(--app-accent)"></i>선택</span><span><i style="background:var(--app-accent-soft);outline:1.5px dashed var(--app-accent)"></i>교환 가능</span><span><i style="background:var(--app-red-soft)"></i>교환 불가</span><span><i style="background:#F6F7F7"></i>배정 불가 · 사유 표시</span><span><i style="background:#fff;box-shadow:inset 0 -3px 0 var(--app-amber)"></i>반영 전 변경</span></div>` : ""}
  <div class="stage" id="swModal" style="min-height:0"></div>`;
  if (sw.pick) openPick();
}
function tcell(t, p) {
  const room = roomOf(sw.work, p, t.id), was = roomOf(sw.base, p, t.id);
  const blk = !room && blockLabel(t, p);
  let cls = room ? (room.includes("복도") ? "hall" : "") : blk ? "blocked" : "free";
  if (sw.sel) {
    if (sw.sel.tid === t.id && sw.sel.p === p) cls += " sel";
    else if (sw.sel.p === p) cls += check(sw.sel.tid, t.id, p).length ? " cannot" : " can";
  }
  if (room !== was) cls += " changed";
  return `<td class="c ${cls}" data-c="${t.id}|${p}" tabindex="0" role="button" aria-label="${t.name} ${p}교시 감독 선택">${room ? esc(room) : blk ? esc(blk) : "—"}</td>`;
}
function check(aId, bId, p) {
  const a = SW_T.find((x) => x.id === aId), b = SW_T.find((x) => x.id === bId);
  const ra = roomOf(sw.work, p, aId), rb = roomOf(sw.work, p, bId), r = [];
  if (!ra && !rb) r.push("두 교사 모두 이 교시에 배정된 감독이 없습니다.");
  if (ra) r.push(...forbid(b, p, ra).map((x) => `${b.name}: ${x}`));
  if (rb) r.push(...forbid(a, p, rb).map((x) => `${a.name}: ${x}`));
  return r;
}
function act(el) {
  if (el.dataset.c) {
    const [tid, ps] = el.dataset.c.split("|"), p = +ps, t = SW_T.find((x) => x.id === tid);
    if (!sw.sel) {
      if (!roomOf(sw.work, p, tid) && blockLabel(t, p)) { sw.msg = `${t.name}: 이 교시는 ${blockLabel(t, p)}(으)로 감독할 수 없습니다.`; sw.bad = true; swapRender(); return; }
      sw.sel = { tid, p }; sw.msg = ""; swapRender(); return;
    }
    if (sw.sel.tid === tid && sw.sel.p === p) { sw.sel = null; swapRender(); return; }
    if (sw.sel.p !== p) { sw.msg = "교환은 같은 날짜, 같은 교시에서만 가능합니다."; sw.bad = true; swapRender(); return; }
    const reasons = check(sw.sel.tid, tid, p);
    if (reasons.length) { sw.msg = "교환할 수 없습니다 · " + reasons.join(" / "); sw.bad = true; swapRender(); return; }
    const ra = roomOf(sw.work, p, sw.sel.tid), rb = roomOf(sw.work, p, tid);
    sw.hist.push({ ...sw.work });
    if (ra) sw.work[`${p}|${ra}`] = tid;
    if (rb) sw.work[`${p}|${rb}`] = sw.sel.tid;
    const n1 = SW_T.find((x) => x.id === sw.sel.tid).name;
    sw.msg = rb && ra ? `${n1} ↔ ${t.name} 교환했습니다.` : `${p}교시 ${ra || rb} 감독을 ${ra ? n1 + " → " + t.name : t.name + " → " + n1}(으)로 옮겼습니다.`;
    sw.bad = false; sw.sel = null; sw.saved = false; swapRender();
  } else if (el.dataset.rc) { sw.pick = el.dataset.rc; swapRender(); }
}
$("#swapStage").addEventListener("click", (e) => {
  const el = e.target.closest("[data-c],[data-rc],[data-view],[data-undo],[data-cancel],[data-apply]"); if (!el) return;
  const d = el.dataset;
  if (d.view) { sw.view = d.view; sw.sel = null; sw.msg = ""; swapRender(); return; }
  if (d.undo !== undefined) { sw.work = sw.hist.pop(); sw.msg = "마지막 조정을 되돌렸습니다."; sw.bad = false; swapRender(); return; }
  if (d.cancel !== undefined) { sw.work = { ...sw.base }; sw.hist = []; sw.sel = null; sw.msg = "반영 전 조정을 모두 취소했습니다."; sw.bad = false; swapRender(); return; }
  if (d.apply !== undefined) { sw.base = { ...sw.work }; sw.hist = []; sw.sel = null; sw.saved = true; sw.msg = "조정한 배정을 반영하고 저장했습니다."; sw.bad = false; swapRender(); return; }
  act(el);
});
$("#swapStage").addEventListener("keydown", (e) => { const el = e.target.closest("[data-c],[data-rc]"); if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); act(el); } });
function openPick() {
  const [ps, room] = sw.pick.split("|"), p = +ps, cur = sw.work[sw.pick];
  const body = document.createElement("div");
  body.className = "cand";
  body.innerHTML = SW_T.map((t) => {
    const f = forbid(t, p, room), other = roomOf(sw.work, p, t.id);
    const busy = other && other !== room;
    const sc = [1, 2, 3].filter((q) => roomOf(sw.work, q, t.id)).length;
    const label = t.id === cur ? "현재 배정" : f.length ? f.join(", ") : busy ? `동시간 다른 고사실 배정 (${other})` : `배정 가능 · 현재 ${sc}회`;
    return `<button data-pt="${t.id}" class="${!f.length && !busy ? "ok" : ""} ${t.id === cur ? "cur" : ""}" ${f.length || busy ? "disabled" : ""}><span>${t.name}</span><small>${esc(label)}</small></button>`;
  }).join("") + `<button data-pt=""><span>미배정</span><small>이 자리를 비웁니다</small></button>`;
  const m = modal($("#swModal"), { title: `${room} · 10월 19일 (월) ${p}교시 · 감독`, sub: "가능한 교사를 눌러 배정합니다.", body, foot: `<button class="btn" data-x>닫기</button>` });
  $("[data-x]", m.ft).onclick = () => { sw.pick = null; m.close(); };
  body.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pt]"); if (!b || b.disabled) return;
    const tid = b.dataset.pt || null;
    if (tid !== (cur || null)) { sw.hist.push({ ...sw.work }); sw.work[sw.pick] = tid; sw.msg = tid ? `${room} ${p}교시에 ${SW_T.find((x) => x.id === tid).name} 교사를 배정했습니다.` : `${room} ${p}교시를 미배정으로 바꿨습니다.`; sw.bad = false; sw.saved = false; }
    sw.pick = null; m.close(); swapRender();
  });
}
swapInit();

/* ---------- 13. 내보내기 ---------- */
let ex = { form: "both", full: true };
function exportRender() {
  const s = $("#exportStage");
  const days = ["10월 19일", "10월 20일", "10월 21일"];
  const forms = { both: ["교사별 + 고사실별", "한 장에 두 표를 나란히"], teacher: ["교사별", "교사마다 감독할 고사실"], room: ["고사실별", "고사실마다 감독 교사"] };
  const sheets = [...(ex.full ? ["교사별 전체", "고사실별 전체"] : []), ...days.map((d) => `${d} ${forms[ex.form][0]}`)];
  s.innerHTML = `<div class="panel" style="padding:12px;display:grid;gap:10px;max-width:560px"><b>엑셀로 내보내기</b>
    <div style="display:grid;gap:6px"><b style="font-size:13px">날짜별 감독표</b>${Object.entries(forms).map(([k, [a, b]]) => `<label class="row" style="flex-wrap:nowrap"><input type="radio" name="exf" value="${k}" ${ex.form === k ? "checked" : ""}> <span><b>${a}</b> <span class="desc">${b}</span></span></label>`).join("")}</div>
    <label class="row"><input type="checkbox" id="exFull" ${ex.full ? "checked" : ""}> <span><b>전체 배정표 포함</b> <span class="desc">교사별 전체(누적 횟수·배정점수)와 고사실별 전체 시트</span></span></label>
    <p class="desc">날짜별 감독표는 A4 가로로 인쇄되도록 맞춰 저장합니다.</p>
    <div style="font-size:13px"><b>만들어질 시트 ${sheets.length}개</b><div class="row" style="margin-top:6px;gap:6px">${sheets.map((x) => `<span class="chip sub" style="background:#E8F3EA;color:#1F6B35">▦ ${x}</span>`).join("")}</div></div>
    <div class="row" style="justify-content:flex-end"><button class="btn">취소</button><button class="btn primary">엑셀 파일 저장</button></div></div>`;
}
$("#exportStage").addEventListener("change", (e) => { if (e.target.name === "exf") ex.form = e.target.value; if (e.target.id === "exFull") ex.full = e.target.checked; exportRender(); });
exportRender();
})();
