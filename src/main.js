import { FLOORS, SHOPS, floorZones, money } from './data.js';

const $ = (s) => document.querySelector(s);
let floor = 0;
let mall = null;
let toastTimer;
const KEY = 'yuejing-mall-v2';
let state = { bag: [], visited: [], views: {}, adds: {} };
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved) {
    state.bag = (saved.bag || []).filter((x) => SHOPS.some((s) => s.id === x.id) && Number.isInteger(x.qty) && x.qty > 0).map((x) => ({ id: x.id, qty: Math.min(x.qty, 99) }));
    state.visited = [...new Set((saved.visited || []).filter((id) => SHOPS.some((s) => s.id === id)))];
    for (const key of ['views', 'adds']) for (const s of SHOPS) state[key][s.id] = Math.max(0, Math.min(Number(saved[key]?.[s.id]) || 0, 100000));
  }
} catch { /* keep the empty visit */ }

const symbols = { pot: '♨', tea: '◒', food: '◉', bakery: '◓', fruit: '✦', jewel: '◇', glasses: '∞', watch: '◷', perfume: '♧', beauty: '◐', bags: '▱', fashion: '♧', sport: '↗', cinema: '▷', shoes: '⌁', books: '▤', gym: '↔', kids: '✺', yoga: '◎', blocks: '▦', restaurant: '♨', hotpot: '♨', grill: '♨', western: '◈', cafe: '◒' };

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast('浏览器存储不可用，本次体验仍可继续'); }
  updateCounts();
}
function toast(msg) {
  $('#toast').textContent = msg;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2400);
}
function modal(id) {
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  $(id).showModal();
}
for (const d of document.querySelectorAll('dialog')) {
  d.querySelector('.close').addEventListener('click', () => d.close());
  d.addEventListener('click', (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
    }
  });
}

$('#floor-cards').innerHTML = FLOORS.map((f) => `<button class="floor-card" data-floor="${f.index}" style="--c:${f.color}"><span class="floor-card-id">${f.id}</span><strong>${f.name}</strong><em>${f.en}</em><p>${f.tag}</p><span class="floor-card-go">3 段街 · ${f.shops.length} 家 · 走进去 ↗</span></button>`).join('');
$('#shop-total').textContent = SHOPS.length;
$('#floor-cards').addEventListener('click', (e) => {
  const card = e.target.closest('[data-floor]');
  if (card) enterFloor(+card.dataset.floor);
});

function updateCounts() {
  const count = state.bag.reduce((n, x) => n + x.qty, 0);
  $('#bag-count').textContent = count;
  $('#market-bag-count').textContent = count;
  mall?.setBags(count);
  $('#visited-count').textContent = state.visited.length;
}
function showIntro() {
  $('#intro').hidden = false;
  $('#market').hidden = true;
  $('#market-list').hidden = true;
  mall?.setRunning(false);
  if (location.hash) history.replaceState(null, '', location.pathname);
}
function paintFloor(i) {
  floor = i;
  const f = FLOORS[i];
  document.documentElement.style.setProperty('--floor-color', f.color);
  $('#market-floor').textContent = f.id;
  $('#market-name').textContent = f.name;
  $('#market-tag').textContent = f.tag;
  $('#list-title').textContent = f.name;
}
function shopCard(s) {
  return `<button class="shop-card" data-shop="${s.id}"><span class="shop-symbol" style="--shop-color:${s.color}">${symbols[s.kind] || '·'}</span><span class="shop-copy"><strong>${s.name}<small>${s.category}</small></strong><span>${s.slogan}</span><em>${s.unit} <i>·</i> ${state.visited.includes(s.id) ? '已探索' : '等你发现'}</em></span><span class="shop-chevron">↗</span></button>`;
}
function paintZone(zoneIndex) {
  const zones = floorZones(FLOORS[floor]);
  const current = zones[zoneIndex];
  $('#zone-switch').innerHTML = zones.map((z) => `<button type="button" role="tab" data-zone="${z.index}" class="${z.index === zoneIndex ? 'active' : ''}" aria-selected="${z.index === zoneIndex}">${z.name}</button>`).join('');
  $('#scene-caption').innerHTML = `${current.hint}<br><small>点地面走过去 · 方向键也能走 · 拖动转头</small>`;
}
function renderList() {
  const q = $('#search').value.trim().toLowerCase();
  if (q) {
    const shops = SHOPS.filter((s) => `${s.name}${s.category}${s.product}${s.floor}`.toLowerCase().includes(q));
    $('#list-label').textContent = '全场搜索';
    $('#shop-count').textContent = String(shops.length);
    $('#shop-list').innerHTML = shops.length ? shops.map(shopCard).join('') : '<div class="empty"><span>⌕</span><h3>暂时没有找到</h3><p>试试店名或品类</p></div>';
    return;
  }
  const zones = floorZones(FLOORS[floor]);
  $('#list-label').textContent = '本层三段街';
  $('#shop-count').textContent = String(FLOORS[floor].shops.length);
  $('#shop-list').innerHTML = zones.map((z) => `<h3 class="zone-label">${z.name}<small>${z.shops.length} 家</small></h3>${z.shops.map(shopCard).join('')}`).join('');
}
async function enterFloor(i) {
  paintFloor(i);
  $('#intro').hidden = true;
  $('#market').hidden = false;
  $('#loading').hidden = false;
  history.replaceState(null, '', `#${FLOORS[i].id}`);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (!mall) {
    const { createMall } = await import('./scene.js');
    mall = createMall($('#scene'), { onShop: openShop, onZone: paintZone });
  }
  mall.setRunning(true);
  try {
    mall.setFloor(i);
    mall.resize();
  } catch (error) {
    console.error(error);
    $('#loading').textContent = '这一层没有搭起来，请返回重试';
    return;
  }
  $('#loading').hidden = true;
  renderList();
}
function openShop(s) {
  const index = FLOORS.findIndex((f) => f.id === s.floor);
  if (floor !== index || $('#market').hidden) {
    enterFloor(index).then(() => mall?.focusShop(s));
  } else mall?.focusShop(s);
  if (!state.visited.includes(s.id)) state.visited.push(s.id);
  state.views[s.id] = (state.views[s.id] || 0) + 1;
  save();
  renderList();
  $('#shop-detail').innerHTML = `<div class="shop-hero" style="--hero:${s.color}"><span class="eyebrow">${s.unit} / ${s.category}</span><span class="hero-symbol">${symbols[s.kind] || '·'}</span><h2>${s.name}</h2><p>${s.slogan}</p></div><div class="shop-body"><div class="shop-meta"><span>◷ 10:00—22:00</span><span>⌖ ${s.floor} · ${s.unit}</span></div><div class="eyebrow">A LITTLE SOMETHING FOR YOU</div><h3>${s.product}</h3><p class="dialog-intro">${s.floor === '4F' ? '为相聚留一张桌子，为今天添一份好味道。' : '给今天的游逛，留下一点喜欢的理由。'}</p><div class="product-price"><strong>${money(s.price)}</strong><span>演示参考价 / 份</span></div><button id="add-item" class="primary full">加入逛购清单 ＋</button><button id="navigate-shop" class="text-btn full">走到这家摊位前 ↗</button><p class="muted">概念演示，不代表品牌入驻或真实报价；不提供下单、订座。</p></div>`;
  $('#add-item').onclick = () => add(s);
  $('#navigate-shop').onclick = () => { $('#shop-dialog').close(); mall?.focusShop(s); toast(`站到 ${s.name} 前面`); };
  modal('#shop-dialog');
}
function add(s) {
  const item = state.bag.find((x) => x.id === s.id);
  if (item && item.qty >= 99) return toast('每项最多添加 99 份');
  item ? item.qty += 1 : state.bag.push({ id: s.id, qty: 1 });
  state.adds[s.id] = (state.adds[s.id] || 0) + 1;
  save();
  toast(`已加入清单 · ${s.product}`);
  $('#add-item').textContent = '已加入，再添一份 ＋';
}
function total() { return state.bag.reduce((n, x) => n + SHOPS.find((s) => s.id === x.id).price * x.qty, 0); }
function renderBag() {
  $('#bag-items').innerHTML = state.bag.length ? state.bag.map((x) => {
    const s = SHOPS.find((shop) => shop.id === x.id);
    return `<div class="bag-item"><span class="mini-symbol" style="color:${s.color}">${symbols[s.kind] || '·'}</span><div><strong>${s.product}</strong><small>${s.name} · ${s.floor} · ${money(s.price)}</small></div><div class="quantity"><button data-delta="-1" data-id="${s.id}" aria-label="减少${s.product}">−</button><span>${x.qty}</span><button data-delta="1" data-id="${s.id}" aria-label="增加${s.product}">＋</button></div></div>`;
  }).join('') : '<div class="empty"><span>▱</span><h3>心动，还在下一家</h3><p>打开任意摊位，把喜欢的味道或物件放进清单。</p></div>';
  $('#bag-total').textContent = money(total());
  $('#clear-bag').disabled = !state.bag.length;
}
function openBag() { renderBag(); modal('#bag-dialog'); }
$('#bag-items').onclick = (e) => {
  const b = e.target.closest('[data-delta]');
  if (!b) return;
  const x = state.bag.find((item) => item.id === b.dataset.id);
  x.qty = Math.min(99, x.qty + Number(b.dataset.delta));
  state.bag = state.bag.filter((item) => item.qty > 0);
  save();
  renderBag();
};
$('#bag-btn').onclick = openBag;
$('#market-bag').onclick = openBag;
$('#clear-bag').onclick = () => { state.bag = []; save(); renderBag(); toast('清单已清空'); };
function receipt() {
  const floors = new Set(state.visited.map((id) => SHOPS.find((s) => s.id === id).floor));
  $('#receipt-content').innerHTML = `<div class="receipt-brand">悦境 MALL</div><div class="eyebrow center">A DAY WELL SPENT</div><h2 class="center">今天的美好，已收集。</h2><p class="center muted">${new Date().toLocaleDateString('zh-CN')} · 城市生活漫游</p><div class="receipt-stats"><div><strong>${state.visited.length}</strong><span>探索店铺</span></div><div><strong>${floors.size}</strong><span>到访楼层</span></div><div><strong>${state.bag.reduce((n, x) => n + x.qty, 0)}</strong><span>心动好物</span></div></div><div class="receipt-lines">${state.bag.length ? state.bag.map((x) => { const s = SHOPS.find((shop) => shop.id === x.id); return `<p><span>${s.name} × ${x.qty}</span><b>${money(s.price * x.qty)}</b></p>`; }).join('') : '<p>随心走走，也是美好的一天。</p>'}</div><div class="bag-total"><span>预计消费</span><strong>${money(total())}</strong></div><p class="muted center">概念体验小票 · 非消费凭证<br>愿每一次出门，都遇见一点喜欢。</p>`;
  modal('#receipt-dialog');
}
$('#finish-btn').onclick = receipt;
$('#receipt-btn').onclick = receipt;
$('#download-receipt').onclick = () => {
  const c = document.createElement('canvas');
  c.width = 900;
  c.height = 660 + state.bag.length * 62;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f2e8';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#334d42';
  ctx.textAlign = 'center';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('悦境 MALL', 450, 100);
  ctx.font = '32px sans-serif';
  ctx.fillText('今天的美好，已收集。', 450, 170);
  ctx.font = '23px sans-serif';
  ctx.fillText(`${new Date().toLocaleDateString('zh-CN')}  /  探索 ${state.visited.length} 家店铺`, 450, 225);
  ctx.textAlign = 'left';
  let y = 320;
  for (const x of state.bag) {
    const s = SHOPS.find((shop) => shop.id === x.id);
    ctx.fillText(`${s.name} × ${x.qty}`, 75, y);
    ctx.textAlign = 'right';
    ctx.fillText(money(s.price * x.qty), 825, y);
    ctx.textAlign = 'left';
    y += 62;
  }
  ctx.fillRect(75, y, 750, 2);
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('预计消费', 75, y + 75);
  ctx.textAlign = 'right';
  ctx.fillText(money(total()), 825, y + 75);
  ctx.textAlign = 'center';
  ctx.font = '22px sans-serif';
  ctx.fillText('概念体验小票 · 非消费凭证', 450, y + 155);
  ctx.fillText('愿每一次出门，都遇见一点喜欢。', 450, y + 200);
  c.toBlob((blob) => {
    if (!blob) return toast('图片生成失败，请重试');
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = '悦境MALL-游逛小票.png';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast('小票图片已生成');
  }, 'image/png');
};
function info(html) { $('#info-content').innerHTML = html; modal('#info-dialog'); }
$('#guide-btn').onclick = () => info(`<div class="eyebrow">YOUR MALL, YOUR WAY</div><h2>先选一层，再走进一条街。</h2><div class="guide-grid"><article><b>01</b><h3>选一层</h3><p>介绍页上有五层。点一层，就站到这条街的路口。</p></article><article><b>02</b><h3>走进去</h3><p>每层三十家分成三段夜市街，摊位在左右两边。点地面走到摊位前，再点一次看这家。方向键也能走。</p></article><article><b>03</b><h3>留下你的发现</h3><p>点开摊位加入逛购清单，再生成一张只属于这次游逛的小票。</p></article></div><p class="muted">清单和探索进度只保存在本机浏览器。所有内容为商场数字体验演示。</p>`);
$('#service-btn').onclick = () => info(`<div class="eyebrow">AT YOUR SERVICE</div><h2>照顾每一种需要。</h2><div class="service-list"><p><b>↕ 客梯 / 无障碍通行</b><span>每层街口都留了通行概念位</span></p><p><b>WC 洗手间</b><span>各层公共服务区（概念规划）</span></p><p><b>♡ 母婴 / 亲子服务</b><span>3F 活力游乐场</span></p><p><b>i 服务台 / 失物招领</b><span>1F 闪耀日常</span></p></div><p class="muted">本页为概念服务配置，不对应真实商场点位。</p>`);
$('#ops-btn').onclick = () => {
  const views = Object.values(state.views).reduce((a, b) => a + b, 0);
  const adds = Object.values(state.adds).reduce((a, b) => a + b, 0);
  const top = SHOPS.map((s) => ({ ...s, count: state.views[s.id] || 0 })).sort((a, b) => b.count - a.count).slice(0, 5);
  info(`<div class="eyebrow">MALL EXPERIENCE INSIGHTS</div><h2>每一次探索，都有迹可循。</h2><p class="dialog-intro">本机体验数据 · 用于演示商场运营分析思路</p><div class="receipt-stats"><div><strong>${views}</strong><span>店铺详情浏览</span></div><div><strong>${adds}</strong><span>详情页加购次数</span></div><div><strong>${state.visited.length}</strong><span>已探索店铺</span></div></div><h3>店铺关注排行</h3><div class="ranking">${top.map((s, i) => `<p><span>${i + 1}. ${s.name} <small>${s.floor}</small></span><b>${s.count} 次</b></p>`).join('')}</div><h3>楼层探索覆盖</h3>${FLOORS.map((f) => { const n = f.shops.filter((s) => state.visited.includes(s.id)).length; return `<div class="coverage"><span>${f.id} ${f.name}</span><progress value="${n}" max="${f.shops.length}"></progress><b>${n}/${f.shops.length}</b></div>`; }).join('')}<p class="muted">以上数据仅来自当前浏览器，不是客流、销售额或真实转化率。</p>`);
};
$('#search').addEventListener('input', renderList);
$('#shop-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-shop]');
  if (b) openShop(SHOPS.find((s) => s.id === b.dataset.shop));
});
$('#zone-switch').onclick = (e) => {
  const tab = e.target.closest('[data-zone]');
  if (tab) mall?.setZone(+tab.dataset.zone);
};
$('#back-btn').onclick = showIntro;
$('#list-toggle').onclick = () => { $('#market-list').hidden = !$('#market-list').hidden; };
$('#list-close').onclick = () => { $('#market-list').hidden = true; };
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !$('#market').hidden) { e.preventDefault(); $('#market-list').hidden = false; $('#search').focus(); }
  if (e.key === 'Escape' && !$('#market').hidden && !document.querySelector('dialog[open]')) showIntro();
});
updateCounts();
const opening = FLOORS.find((f) => f.id === location.hash.slice(1));
if (opening) enterFloor(opening.index);
