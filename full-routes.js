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