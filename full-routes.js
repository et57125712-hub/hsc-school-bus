/* 完整路線資料載入器：將公開校車路線表轉為本站格式，並保留本地快取。 */
window.HSC_FULL_ROUTES_URL = 'https://raw.githubusercontent.com/jswu-2026/bus-system/main/index.html';
window.HSC_FALLBACK_STOPS = [
  {name:'龍潭國小',area:'桃園市龍潭區',bus:'67',route:'龍潭',order:'',time:'07:14',address:'龍潭國小校門口公車亭',lat:24.8656,lng:121.2169},
  {name:'龍潭中正大同路口',area:'桃園市龍潭區',bus:'67',route:'龍潭',order:'',time:'07:12',address:'中正路與大同路口附近',lat:24.864,lng:121.2216},
  {name:'龍潭百年大鎮',area:'桃園市龍潭區',bus:'66',route:'龍潭',order:'',time:'07:02',address:'百年大鎮社區周邊',lat:24.8787,lng:121.2113},
  {name:'中壢火車站',area:'桃園市中壢區',bus:'31',route:'中壢',order:'',time:'06:20',address:'中壢火車站周邊指定候車點',lat:24.9537,lng:121.2258},
  {name:'內壢火車站',area:'桃園市中壢區',bus:'6',route:'桃園2',order:'',time:'06:32',address:'內壢火車站前',lat:24.9727,lng:121.2583},
  {name:'桃園火車站',area:'桃園市桃園區',bus:'17',route:'桃園',order:'',time:'06:50',address:'桃園火車站周邊指定候車點',lat:24.9892,lng:121.314},
  {name:'楊梅火車站',area:'桃園市楊梅區',bus:'48',route:'楊梅',order:'',time:'06:20',address:'楊梅火車站前',lat:24.9142,lng:121.1451},
  {name:'埔心火車站',area:'桃園市楊梅區',bus:'52',route:'楊梅',order:'',time:'06:55',address:'埔心火車站前',lat:24.9197,lng:121.1837},
  {name:'新竹火車站',area:'新竹市東區',bus:'31',route:'新竹',order:'',time:'06:20',address:'新竹火車站周邊指定候車點',lat:24.8016,lng:120.9716},
  {name:'竹北火車站',area:'新竹縣竹北市',bus:'34',route:'竹北',order:'',time:'06:20',address:'竹北火車站前',lat:24.8388,lng:121.0095}
];

window.loadHscRoutes = async function () {
  const cacheKey = 'hsc-full-routes-v20260326';
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try { const rows = JSON.parse(cached); if (Array.isArray(rows) && rows.length > 100) return rows; } catch (_) {}
  }
  try {
    const response = await fetch(window.HSC_FULL_ROUTES_URL, {cache:'no-store'});
    if (!response.ok) throw new Error('route source unavailable');
    const html = await response.text();
    const match = html.match(/const\s+DATA\s*=\s*(\[.*?\]);\s*const\s+/s);
    if (!match) throw new Error('route data not found');
    const raw = JSON.parse(match[1]);
    const calibrated = new Map(window.HSC_FALLBACK_STOPS.map(s => [s.name, s]));
    const rows = raw.map((r, index) => {
      const known = calibrated.get(String(r['站別'] || '').replace(/\d+$/,'')) || calibrated.get(String(r['站別'] || ''));
      return {
        id: `${r['車號'] || ''}-${r['路線編號'] || index}`,
        name: r['站別'] || '未命名站點',
        area: r['市區'] || '未分類',
        bus: String(r['車號'] || ''),
        route: r['路線'] || '',
        order: String(r['路線編號'] || ''),
        time: r['到站時間'] || '',
        address: r['位址'] || '',
        lat: known?.lat ?? null,
        lng: known?.lng ?? null
      };
    });
    localStorage.setItem(cacheKey, JSON.stringify(rows));
    return rows;
  } catch (error) {
    console.warn('完整路線載入失敗，使用備援資料。', error);
    return window.HSC_FALLBACK_STOPS;
  }
};

/* 地圖開場動畫、精確站點圖層與簡易家長版說明 */
(function () {
  const style = document.createElement('style');
  style.textContent = `
    .hsc-intro{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:radial-gradient(circle at 25% 10%,rgba(191,255,243,.9),transparent 35%),linear-gradient(150deg,#eafdf9,#e6efff);transition:opacity .75s ease,visibility .75s ease}
    .hsc-intro.hide{opacity:0;visibility:hidden}
    .hsc-intro-card{width:min(88vw,390px);padding:30px 24px;border-radius:34px;text-align:center;color:#123b38;background:rgba(255,255,255,.58);border:1px solid rgba(255,255,255,.8);backdrop-filter:blur(28px) saturate(150%);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 28px 70px rgba(23,103,96,.22)}
    .hsc-bus{font-size:68px;display:inline-block;animation:hscDrive 1.6s cubic-bezier(.22,.8,.32,1) infinite alternate}
    .hsc-intro h2{margin:10px 0 6px;font-size:25px}.hsc-intro p{margin:0;color:#5c7775;line-height:1.6;font-size:14px}
    .hsc-loader{height:8px;margin-top:18px;border-radius:99px;background:rgba(11,112,103,.12);overflow:hidden}.hsc-loader i{display:block;width:38%;height:100%;border-radius:99px;background:linear-gradient(90deg,#0b7067,#35d3c2);animation:hscLoad 1.25s ease-in-out infinite}
    .hsc-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0 0;padding:10px;border-radius:22px;background:rgba(255,255,255,.58);border:1px solid rgba(255,255,255,.74);backdrop-filter:blur(18px);box-shadow:inset 0 1px 0 #fff,0 12px 30px rgba(18,92,86,.1)}
    .hsc-step{text-align:center;padding:10px 6px;border-radius:16px;background:rgba(255,255,255,.55);font-weight:850;font-size:13px;color:#315e5a}.hsc-step b{display:block;font-size:20px;color:#0b7067;margin-bottom:3px}
    .hsc-map-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:4px 4px 10px}.hsc-map-btn{border:1px solid rgba(255,255,255,.75);border-radius:14px;padding:10px 8px;background:rgba(255,255,255,.75);color:#0b7067;font-weight:900;backdrop-filter:blur(16px);box-shadow:inset 0 1px 0 #fff,0 8px 22px rgba(16,91,84,.12);cursor:pointer;font-size:13px}
    .hsc-map-status{grid-column:1/-1;font-size:13px;color:#4e6d6a;display:flex;align-items:center;padding:5px 4px 0;line-height:1.5}.hsc-stop-icon{background:transparent;border:0}.hsc-pin{width:30px;height:30px;border-radius:50% 50% 50% 8px;transform:rotate(-45deg);background:linear-gradient(145deg,#0b7067,#29c9b8);border:2px solid white;box-shadow:0 6px 16px rgba(0,82,75,.28);display:grid;place-items:center}.hsc-pin span{transform:rotate(45deg);color:#fff;font-size:10px;font-weight:900}
    .hsc-popup b{font-size:16px}.hsc-popup .time{display:inline-block;margin:7px 0;padding:5px 8px;border-radius:8px;background:#e9f2ff;color:#245e9f;font-weight:900}.hsc-popup .route{font-weight:850;color:#0b7067;line-height:1.6}.hsc-popup .addr{font-size:13px;line-height:1.6;color:#5e7473;margin-top:5px}.hsc-popup-label{font-weight:900;color:#244d49}
    @keyframes hscDrive{from{transform:translateX(-25px) rotate(-3deg)}to{transform:translateX(25px) rotate(3deg)}}@keyframes hscLoad{0%{transform:translateX(-120%)}100%{transform:translateX(360%)}}
    @media(max-width:560px){.hsc-map-tools{grid-template-columns:1fr}.hsc-map-status{grid-column:auto}.hsc-steps{gap:5px}.hsc-step{font-size:12px;padding:9px 3px}}
    @media(prefers-reduced-motion:reduce){.hsc-bus,.hsc-loader i{animation:none}}
  `;
  document.head.appendChild(style);

  const intro = document.createElement('div');
  intro.className = 'hsc-intro';
  intro.innerHTML = `<div class="hsc-intro-card"><div class="hsc-bus">🚌</div><h2>校車地圖準備中</h2><p>馬上帶您看看校車可以坐到哪裡</p><div class="hsc-loader"><i></i></div></div>`;
  document.body.appendChild(intro);

  let exactLayer = null;
  let loading = false;
  const geoCacheKey = 'hsc-exact-stop-coordinates-v1';
  const getCache = () => { try { return JSON.parse(localStorage.getItem(geoCacheKey) || '{}'); } catch (_) { return {}; } };
  const saveCache = cache => { try { localStorage.setItem(geoCacheKey, JSON.stringify(cache)); } catch (_) {} };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function geocodeStop(stop) {
    const cache = getCache();
    if (cache[stop.id]) return cache[stop.id];
    if (Number.isFinite(stop.lat) && Number.isFinite(stop.lng)) return {lat:stop.lat,lng:stop.lng};
    const query = `${stop.area} ${stop.address || ''} ${stop.name}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tw&q=${encodeURIComponent(query)}`, {headers:{'Accept-Language':'zh-TW'},signal:controller.signal});
      const data = await response.json();
      if (!data.length) return null;
      const point = {lat:Number(data[0].lat),lng:Number(data[0].lon)};
      cache[stop.id] = point;
      saveCache(cache);
      return point;
    } catch (_) { return null; }
    finally { clearTimeout(timer); }
  }

  function markerIcon(bus) {
    return L.divIcon({className:'hsc-stop-icon',html:`<div class="hsc-pin"><span>${String(bus || '')}</span></div>`,iconSize:[30,30],iconAnchor:[15,29],popupAnchor:[0,-30]});
  }

  function popupHtml(stop) {
    return `<div class="hsc-popup"><b>${stop.name}</b><br><span class="time">上車時間：${stop.time || '尚未填寫'}</span><div class="route"><span class="hsc-popup-label">校車：</span>${stop.bus} 號<br><span class="hsc-popup-label">路線：</span>${stop.route || '未命名路線'}<br><span class="hsc-popup-label">第幾站：</span>${stop.order || '—'}</div><div class="addr"><span class="hsc-popup-label">等車地點：</span><br>${stop.area}<br>${stop.address || '候車位置待補'}</div></div>`;
  }

  async function loadVisibleStops(forceArea) {
    if (loading || !window.L || typeof map === 'undefined' || !map || typeof stops === 'undefined' || !Array.isArray(stops)) return;
    loading = true;
    if (!exactLayer) exactLayer = L.layerGroup().addTo(map);
    exactLayer.clearLayers();
    const bounds = map.getBounds().pad(.3);
    let candidates = stops.filter(s => forceArea ? s.area === forceArea : (Number.isFinite(s.lat)&&Number.isFinite(s.lng)) || bounds.contains([centers?.[s.area]?.[0] || 0, centers?.[s.area]?.[1] || 0]));
    candidates = candidates.slice(0, 24);
    const statusNode = document.querySelector('.hsc-map-status');
    for (let i=0;i<candidates.length;i++) {
      if (statusNode) statusNode.textContent = `正在找站點，請稍等一下（${i+1}/${candidates.length}）`;
      const point = await geocodeStop(candidates[i]);
      if (point) L.marker([point.lat,point.lng],{icon:markerIcon(candidates[i].bus),title:candidates[i].name}).addTo(exactLayer).bindPopup(popupHtml(candidates[i]));
      if (!getCache()[candidates[i].id] && !(Number.isFinite(candidates[i].lat)&&Number.isFinite(candidates[i].lng))) await sleep(900);
    }
    if (statusNode) statusNode.textContent = `地圖上共有 ${exactLayer.getLayers().length} 個站點，點一下圖示就能看時間和地點。`;
    loading = false;
  }

  function simplifyPageWords() {
    const heroTitle = document.querySelector('.hero h1');
    const heroText = document.querySelector('.hero p');
    const searchTitle = document.querySelector('.searchTitle');
    const hint = document.querySelector('.hint');
    const searchButton = document.querySelector('.searchRow .primary');
    const locateButton = document.querySelector('.locate');
    const tabs = document.querySelectorAll('.tab');
    const headings = document.querySelectorAll('.head h2');
    const footer = document.querySelector('footer');
    if(heroTitle) heroTitle.innerHTML='查校車，<br>三個步驟就完成';
    if(heroText) heroText.textContent='輸入住家附近的地址或地標，就能查看附近有哪些校車站點。';
    if(searchTitle) searchTitle.textContent='您住在哪裡？';
    if(hint) hint.textContent='可輸入住家地址，也可以輸入附近有名的地方，例如：藝文特區、台茂、龍潭大池。';
    if(searchButton) searchButton.textContent='幫我找校車';
    if(locateButton) locateButton.textContent='📍 用我現在的位置';
    if(tabs[0]) tabs[0].textContent='看地圖';
    if(tabs[1]) tabs[1].textContent='附近站點';
    if(tabs[2]) tabs[2].textContent='全部路線';
    if(headings[0]) headings[0].textContent='校車可以坐到哪裡？';
    if(headings[1]) headings[1].textContent='附近可以搭車的地方';
    if(headings[2]) headings[2].textContent='所有校車站點';
    if(footer) footer.textContent='請提早 10 分鐘到等車地點。若校車時間有更動，請以學校最新通知為準。';

    const searchCard=document.querySelector('.searchCard');
    if(searchCard && !document.querySelector('.hsc-steps')){
      const steps=document.createElement('div');
      steps.className='hsc-steps';
      steps.innerHTML='<div class="hsc-step"><b>1</b>輸入地點</div><div class="hsc-step"><b>2</b>查看地圖</div><div class="hsc-step"><b>3</b>點站點看時間</div>';
      searchCard.appendChild(steps);
    }
  }

  function addMapTools() {
    const wrap = document.querySelector('.mapWrap');
    const mapNode = document.getElementById('map');
    if (!wrap || !mapNode || wrap.querySelector('.hsc-map-tools')) return;
    const tools = document.createElement('div');
    tools.className = 'hsc-map-tools';
    tools.innerHTML = `<button class="hsc-map-btn" data-action="tour">▶ 再看一次動畫</button><button class="hsc-map-btn" data-action="exact">📍 顯示這附近的站</button><button class="hsc-map-btn" data-action="overview">🌏 看全部地區</button><span class="hsc-map-status">請先把地圖放大，再按「顯示這附近的站」。</span>`;
    wrap.insertBefore(tools,mapNode);
    tools.addEventListener('click',event=>{
      const action=event.target?.dataset?.action;
      if(action==='tour') playTour();
      if(action==='exact') loadVisibleStops();
      if(action==='overview') { if(exactLayer) exactLayer.clearLayers(); map.flyTo([24.93,121.18],9,{duration:1.3}); }
    });
  }

  function playTour() {
    if (typeof map === 'undefined' || !map) return;
    if (exactLayer) exactLayer.clearLayers();
    map.setView([24.8647,121.2168],14,{animate:false});
    setTimeout(()=>map.flyTo([24.93,121.18],9,{duration:2.2,easeLinearity:.22}),500);
    setTimeout(()=>{ if (typeof renderMap === 'function') renderMap(); },1500);
  }

  window.hscShowAreaStops = async function(area) {
    if (typeof centers !== 'undefined' && centers[area]) map.flyTo(centers[area],13,{duration:1.2});
    await loadVisibleStops(area);
  };

  function boot() {
    const ready = typeof map !== 'undefined' && map && typeof stops !== 'undefined' && Array.isArray(stops) && stops.length;
    if (!ready) return setTimeout(boot,250);
    simplifyPageWords();
    addMapTools();
    playTour();
    setTimeout(()=>intro.classList.add('hide'),2400);
    setTimeout(()=>intro.remove(),3300);
    map.on('zoomend moveend',()=>{
      if (map.getZoom() >= 12) {
        const node=document.querySelector('.hsc-map-status');
        if(node) node.textContent='已經放大了，請按「顯示這附近的站」。';
      }
    });
  }

  window.addEventListener('load',()=>setTimeout(boot,300));
})();