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

/* 地圖開場動畫與精確站點圖層 */
(function () {
  const style = document.createElement('style');
  style.textContent = `
    .hsc-intro{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:radial-gradient(circle at 25% 10%,rgba(191,255,243,.9),transparent 35%),linear-gradient(150deg,#eafdf9,#e6efff);transition:opacity .75s ease,visibility .75s ease}
    .hsc-intro.hide{opacity:0;visibility:hidden}
    .hsc-intro-card{width:min(88vw,390px);padding:30px 24px;border-radius:34px;text-align:center;color:#123b38;background:rgba(255,255,255,.58);border:1px solid rgba(255,255,255,.8);backdrop-filter:blur(28px) saturate(150%);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 28px 70px rgba(23,103,96,.22)}
    .hsc-bus{font-size:68px;display:inline-block;animation:hscDrive 1.6s cubic-bezier(.22,.8,.32,1) infinite alternate}
    .hsc-intro h2{margin:10px 0 6px;font-size:25px}.hsc-intro p{margin:0;color:#5c7775;line-height:1.6;font-size:14px}
    .hsc-loader{height:8px;margin-top:18px;border-radius:99px;background:rgba(11,112,103,.12);overflow:hidden}.hsc-loader i{display:block;width:38%;height:100%;border-radius:99px;background:linear-gradient(90deg,#0b7067,#35d3c2);animation:hscLoad 1.25s ease-in-out infinite}
    .hsc-map-tools{display:flex;gap:8px;flex-wrap:wrap;padding:4px 4px 10px}.hsc-map-btn{border:1px solid rgba(255,255,255,.75);border-radius:14px;padding:9px 12px;background:rgba(255,255,255,.7);color:#0b7067;font-weight:850;backdrop-filter:blur(16px);box-shadow:inset 0 1px 0 #fff,0 8px 22px rgba(16,91,84,.12);cursor:pointer}
    .hsc-map-status{font-size:12px;color:#607b79;display:flex;align-items:center;padding:0 4px}.hsc-stop-icon{background:transparent;border:0}.hsc-pin{width:30px;height:30px;border-radius:50% 50% 50% 8px;transform:rotate(-45deg);background:linear-gradient(145deg,#0b7067,#29c9b8);border:2px solid white;box-shadow:0 6px 16px rgba(0,82,75,.28);display:grid;place-items:center}.hsc-pin span{transform:rotate(45deg);color:#fff;font-size:10px;font-weight:900}
    .hsc-popup b{font-size:15px}.hsc-popup .time{display:inline-block;margin:6px 0;padding:4px 7px;border-radius:8px;background:#e9f2ff;color:#245e9f;font-weight:900}.hsc-popup .route{font-weight:850;color:#0b7067}.hsc-popup .addr{font-size:12px;line-height:1.5;color:#5e7473;margin-top:4px}
    @keyframes hscDrive{from{transform:translateX(-25px) rotate(-3deg)}to{transform:translateX(25px) rotate(3deg)}}@keyframes hscLoad{0%{transform:translateX(-120%)}100%{transform:translateX(360%)}}
    @media(prefers-reduced-motion:reduce){.hsc-bus,.hsc-loader i{animation:none}}
  `;
  document.head.appendChild(style);

  const intro = document.createElement('div');
  intro.className = 'hsc-intro';
  intro.innerHTML = `<div class="hsc-intro-card"><div class="hsc-bus">🚌</div><h2>新生醫專校車智慧地圖</h2><p>正在展開全台服務範圍與校車站點</p><div class="hsc-loader"><i></i></div></div>`;
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
    return `<div class="hsc-popup"><b>${stop.name}</b><br><span class="time">${stop.time || '時間未填'}</span><div class="route">車號 ${stop.bus}｜${stop.route || '未命名路線'}｜第 ${stop.order || '—'} 站</div><div class="addr">${stop.area}<br>${stop.address || '候車位置待補'}</div></div>`;
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
      if (statusNode) statusNode.textContent = `正在定位站點 ${i+1}/${candidates.length}`;
      const point = await geocodeStop(candidates[i]);
      if (point) L.marker([point.lat,point.lng],{icon:markerIcon(candidates[i].bus),title:candidates[i].name}).addTo(exactLayer).bindPopup(popupHtml(candidates[i]));
      if (!getCache()[candidates[i].id] && !(Number.isFinite(candidates[i].lat)&&Number.isFinite(candidates[i].lng))) await sleep(900);
    }
    if (statusNode) statusNode.textContent = `已顯示 ${exactLayer.getLayers().length} 個站點；放大或切換區域可更新`;
    loading = false;
  }

  function addMapTools() {
    const wrap = document.querySelector('.mapWrap');
    const mapNode = document.getElementById('map');
    if (!wrap || !mapNode || wrap.querySelector('.hsc-map-tools')) return;
    const tools = document.createElement('div');
    tools.className = 'hsc-map-tools';
    tools.innerHTML = `<button class="hsc-map-btn" data-action="tour">▶ 重新播放導覽</button><button class="hsc-map-btn" data-action="exact">📍 顯示目前區域確切站點</button><button class="hsc-map-btn" data-action="overview">🌏 返回全台分布</button><span class="hsc-map-status">縮放地圖後，可載入目前區域站點</span>`;
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
    addMapTools();
    playTour();
    setTimeout(()=>intro.classList.add('hide'),2600);
    setTimeout(()=>intro.remove(),3500);
    map.on('zoomend moveend',()=>{
      if (map.getZoom() >= 12) {
        const node=document.querySelector('.hsc-map-status');
        if(node) node.textContent='已放大，可按「顯示目前區域確切站點」';
      }
    });
  }

  window.addEventListener('load',()=>setTimeout(boot,300));
})();