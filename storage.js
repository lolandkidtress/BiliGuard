// storage.js - Chrome Storage API 封装，业务数据按 userId 命名空间隔离

const STORAGE_KEYS = {
  AUTH: 'auth',
  WHITELIST: 'whitelist',
  BLACKLIST: 'blacklist',
  DOMAIN_RULES: 'domainRules',
  MODE: 'mode',
  TEMP_UNLOCK_UNTIL: 'tempUnlockUntil',
  VIDEO_STATS: 'videoStats',
  BLOCKED_VIDEOS: 'blockedVideos',
  API_BASE_URL: 'apiBaseUrl',
  STRIPE_CONFIG: 'stripeConfig',
  MACHINE_ID: 'machineId',
  MACHINE_NAME: 'machineName'
};

const DEFAULT_DATA = {
  auth: null,
  whitelist: {
    upIds: [],
    upNames: [],
    bvIds: [],
    ssIds: [],
    ssNames: []
  },
  blacklist: {
    upIds: [],
    upNames: [],
    bvIds: []
  },
  domainRules: {
    anime: false,
    movie: false,
    guochuang: false,
    tv: false,
    variety: false,
    documentary: false,
    live: false,
    manga: false,
    match: false,
    douga: false,
    game: false,
    kichiku: false,
    music: false,
    dance: false,
    cinephile: false,
    ent: false,
    knowledge: false,
    tech: false,
    information: false,
    food: false,
    shortplay: false,
    car: false,
    fashion: false,
    sports: false,
    animal: false,
    vlog: false,
    painting: false,
    ai: false,
    home: false,
    outdoors: false,
    gym: false,
    handmake: false,
    travel: false,
    rural: false,
    parenting: false,
    health: false,
    emotion: false,
    lifeJoy: false,
    lifeExperience: false,
    charity: false,
    uhd: false,
    podcast: false,
    read: false,
    activity: false,
    cheese: false,
    musicCenter: false,
    opus: false,
    show: false,
    gamePlatform: false
  },
  mode: {
    type: 'strict',
    timeRanges: []
  },
  tempUnlockUntil: 0,
  videoStats: [],
  blockedVideos: [],
  apiBaseUrl: 'https://api.7wapilot.com/7wa',
  // apiBaseUrl: 'http://uatwhatsapp.qiscrm.com/7wa',
  stripeConfig: {
    publishableKey: 'pk_live_51PKBRw085USgKgPtZ992f4ITlYmRHSKGgOwxd9WNEUzTSR4n58zq3mVQIlaJoVIyjW03ccsmAc12co3kqwkDbldF00dLqHzNJM',
    premiumPricingTableId: 'prctbl_1TlRKs085USgKgPtZ70cV7fS',
    lifetimePricingTableId: 'prctbl_1TlRLN085USgKgPt0jJutNCv'
  }
};

const CHANNEL_RULES = [
  { key: 'anime', name: '番剧' },
  { key: 'movie', name: '电影' },
  { key: 'guochuang', name: '国创' },
  { key: 'tv', name: '电视剧' },
  { key: 'variety', name: '综艺' },
  { key: 'documentary', name: '纪录片' },
  { key: 'live', name: '直播' },
  { key: 'manga', name: '漫画' },
  { key: 'match', name: '赛事' },
  { key: 'douga', name: '动画' },
  { key: 'game', name: '游戏' },
  { key: 'kichiku', name: '鬼畜' },
  { key: 'music', name: '音乐' },
  { key: 'dance', name: '舞蹈' },
  { key: 'cinephile', name: '影视' },
  { key: 'ent', name: '娱乐' },
  { key: 'knowledge', name: '知识' },
  { key: 'tech', name: '科技数码' },
  { key: 'information', name: '资讯' },
  { key: 'food', name: '美食' },
  { key: 'shortplay', name: '小剧场' },
  { key: 'car', name: '汽车' },
  { key: 'fashion', name: '时尚美妆' },
  { key: 'sports', name: '体育运动' },
  { key: 'animal', name: '动物' },
  { key: 'vlog', name: 'vlog' },
  { key: 'painting', name: '绘画' },
  { key: 'ai', name: '人工智能' },
  { key: 'home', name: '家装房产' },
  { key: 'outdoors', name: '户外潮流' },
  { key: 'gym', name: '健身' },
  { key: 'handmake', name: '手工' },
  { key: 'travel', name: '旅游出行' },
  { key: 'rural', name: '三农' },
  { key: 'parenting', name: '亲子' },
  { key: 'health', name: '健康' },
  { key: 'emotion', name: '情感' },
  { key: 'lifeJoy', name: '生活兴趣' },
  { key: 'lifeExperience', name: '生活经验' },
  { key: 'charity', name: '公益' },
  { key: 'uhd', name: '超高清' },
  { key: 'podcast', name: '视频播客' },
  { key: 'read', name: '专栏' },
  { key: 'activity', name: '活动' },
  { key: 'cheese', name: '课堂' },
  { key: 'musicCenter', name: '新歌热榜' },
  { key: 'opus', name: '图文动态' },
  { key: 'show', name: '会员购/演出' },
  { key: 'gamePlatform', name: '游戏中心' }
];

async function storageGet(keys) {
  return chrome.storage.local.get(keys);
}

async function storageSet(items) {
  return chrome.storage.local.set(items);
}

async function getAuth() {
  const data = await storageGet([STORAGE_KEYS.AUTH]);
  return data[STORAGE_KEYS.AUTH] || null;
}

async function setAuth(auth) {
  await storageSet({ [STORAGE_KEYS.AUTH]: auth });
}

async function updateAuthTokens(token, refreshToken) {
  const auth = await getAuth() || {};
  auth.token = token;
  auth.refreshToken = refreshToken;
  await setAuth(auth);
}

async function clearAuth() {
  await storageSet({ [STORAGE_KEYS.AUTH]: null });
}

async function getCurrentUserId() {
  const auth = await getAuth();
  return auth?.userId || null;
}

function userKey(prefix, userId) {
  return `${prefix}:${userId}`;
}

async function getWhitelist() {
  const userId = await getCurrentUserId();
  if (!userId) return DEFAULT_DATA.whitelist;
  const key = userKey(STORAGE_KEYS.WHITELIST, userId);
  const data = await storageGet([key]);
  const whitelist = data[key] || DEFAULT_DATA.whitelist;
  // 防御旧数据或异常数据缺少字段
  return {
    upIds: Array.isArray(whitelist?.upIds) ? whitelist.upIds : [],
    upNames: Array.isArray(whitelist?.upNames) ? whitelist.upNames : [],
    bvIds: Array.isArray(whitelist?.bvIds) ? whitelist.bvIds : [],
    ssIds: Array.isArray(whitelist?.ssIds) ? whitelist.ssIds : [],
    ssNames: Array.isArray(whitelist?.ssNames) ? whitelist.ssNames : []
  };
}

async function setWhitelist(whitelist) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const key = userKey(STORAGE_KEYS.WHITELIST, userId);
  await storageSet({ [key]: whitelist });
}

async function addUpId(upId, upName) {
  const whitelist = await getWhitelist();
  if (!Array.isArray(whitelist.upIds)) whitelist.upIds = [];
  if (!Array.isArray(whitelist.upNames)) whitelist.upNames = [];
  if (!whitelist.upIds.includes(upId)) {
    whitelist.upIds.push(upId);
    whitelist.upNames.push(upName || '');
    await setWhitelist(whitelist);
  }
  return whitelist;
}

async function removeUpId(upId) {
  const whitelist = await getWhitelist();
  if (!Array.isArray(whitelist.upIds)) whitelist.upIds = [];
  if (!Array.isArray(whitelist.upNames)) whitelist.upNames = [];
  const idx = whitelist.upIds.indexOf(upId);
  if (idx >= 0) {
    whitelist.upIds.splice(idx, 1);
    whitelist.upNames.splice(idx, 1);
  }
  await setWhitelist(whitelist);
  return whitelist;
}

async function addBvId(bvId) {
  console.log('[哔哩护苗 Storage] addBvId:', bvId);
  const whitelist = await getWhitelist();
  console.log('[哔哩护苗 Storage] 当前 whitelist:', JSON.parse(JSON.stringify(whitelist)));
  if (!Array.isArray(whitelist.bvIds)) whitelist.bvIds = [];
  if (!whitelist.bvIds.includes(bvId)) {
    whitelist.bvIds.push(bvId);
    await setWhitelist(whitelist);
    console.log('[哔哩护苗 Storage] 添加后 whitelist:', JSON.parse(JSON.stringify(whitelist)));
  } else {
    console.log('[哔哩护苗 Storage] bvId 已存在');
  }
  return whitelist;
}

async function removeBvId(bvId) {
  const whitelist = await getWhitelist();
  if (!Array.isArray(whitelist.bvIds)) whitelist.bvIds = [];
  whitelist.bvIds = whitelist.bvIds.filter(id => id !== bvId);
  await setWhitelist(whitelist);
  return whitelist;
}

async function addSsId(ssId, ssName) {
  const whitelist = await getWhitelist();
  if (!Array.isArray(whitelist.ssIds)) whitelist.ssIds = [];
  if (!Array.isArray(whitelist.ssNames)) whitelist.ssNames = [];
  if (!whitelist.ssIds.includes(ssId)) {
    whitelist.ssIds.push(ssId);
    whitelist.ssNames.push(ssName || '');
    await setWhitelist(whitelist);
  }
  return whitelist;
}

async function removeSsId(ssId) {
  const whitelist = await getWhitelist();
  if (!Array.isArray(whitelist.ssIds)) whitelist.ssIds = [];
  if (!Array.isArray(whitelist.ssNames)) whitelist.ssNames = [];
  const idx = whitelist.ssIds.indexOf(ssId);
  if (idx !== -1) {
    whitelist.ssIds.splice(idx, 1);
    whitelist.ssNames.splice(idx, 1);
  }
  await setWhitelist(whitelist);
  return whitelist;
}

async function getBlacklist() {
  const userId = await getCurrentUserId();
  if (!userId) return DEFAULT_DATA.blacklist;
  const key = userKey(STORAGE_KEYS.BLACKLIST, userId);
  const data = await storageGet([key]);
  const blacklist = data[key] || DEFAULT_DATA.blacklist;
  return {
    upIds: Array.isArray(blacklist?.upIds) ? blacklist.upIds : [],
    upNames: Array.isArray(blacklist?.upNames) ? blacklist.upNames : [],
    bvIds: Array.isArray(blacklist?.bvIds) ? blacklist.bvIds : []
  };
}

async function setBlacklist(blacklist) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const key = userKey(STORAGE_KEYS.BLACKLIST, userId);
  await storageSet({ [key]: blacklist });
}

async function addBlackUpId(upId, upName) {
  const blacklist = await getBlacklist();
  if (!Array.isArray(blacklist.upIds)) blacklist.upIds = [];
  if (!Array.isArray(blacklist.upNames)) blacklist.upNames = [];
  if (!blacklist.upIds.includes(upId)) {
    blacklist.upIds.push(upId);
    blacklist.upNames.push(upName || '');
    await setBlacklist(blacklist);
  }
  return blacklist;
}

async function removeBlackUpId(upId) {
  const blacklist = await getBlacklist();
  if (!Array.isArray(blacklist.upIds)) blacklist.upIds = [];
  if (!Array.isArray(blacklist.upNames)) blacklist.upNames = [];
  const idx = blacklist.upIds.indexOf(upId);
  if (idx >= 0) {
    blacklist.upIds.splice(idx, 1);
    blacklist.upNames.splice(idx, 1);
  }
  await setBlacklist(blacklist);
  return blacklist;
}

async function addBlackBvId(bvId) {
  const blacklist = await getBlacklist();
  if (!Array.isArray(blacklist.bvIds)) blacklist.bvIds = [];
  if (!blacklist.bvIds.includes(bvId)) {
    blacklist.bvIds.push(bvId);
    await setBlacklist(blacklist);
  }
  return blacklist;
}

async function removeBlackBvId(bvId) {
  const blacklist = await getBlacklist();
  if (!Array.isArray(blacklist.bvIds)) blacklist.bvIds = [];
  blacklist.bvIds = blacklist.bvIds.filter(id => id !== bvId);
  await setBlacklist(blacklist);
  return blacklist;
}

async function getDomainRules() {
  const userId = await getCurrentUserId();
  if (!userId) return DEFAULT_DATA.domainRules;
  const key = userKey(STORAGE_KEYS.DOMAIN_RULES, userId);
  const data = await storageGet([key]);
  return data[key] || DEFAULT_DATA.domainRules;
}

async function setDomainRules(rules) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const key = userKey(STORAGE_KEYS.DOMAIN_RULES, userId);
  await storageSet({ [key]: rules });
}

async function getTempUnlockUntil() {
  const userId = await getCurrentUserId();
  if (!userId) return 0;
  const key = userKey(STORAGE_KEYS.TEMP_UNLOCK_UNTIL, userId);
  const data = await storageGet([key]);
  return data[key] || 0;
}

async function setTempUnlockUntil(timestamp) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const key = userKey(STORAGE_KEYS.TEMP_UNLOCK_UNTIL, userId);
  await storageSet({ [key]: timestamp });
}

async function isTempUnlocked() {
  return (await getTempUnlockUntil()) > Date.now();
}

async function getVideoStats() {
  const userId = await getCurrentUserId();
  if (!userId) return DEFAULT_DATA.videoStats;
  const key = userKey(STORAGE_KEYS.VIDEO_STATS, userId);
  const data = await storageGet([key]);
  return data[key] || DEFAULT_DATA.videoStats;
}

async function setVideoStats(stats) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const key = userKey(STORAGE_KEYS.VIDEO_STATS, userId);
  await storageSet({ [key]: stats });
}

async function getBlockedVideos() {
  const userId = await getCurrentUserId();
  if (!userId) return DEFAULT_DATA.blockedVideos;
  const key = userKey(STORAGE_KEYS.BLOCKED_VIDEOS, userId);
  const data = await storageGet([key]);
  return data[key] || DEFAULT_DATA.blockedVideos;
}

async function setBlockedVideos(list) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const key = userKey(STORAGE_KEYS.BLOCKED_VIDEOS, userId);
  await storageSet({ [key]: list });
}

async function addBlockedVideo(record) {
  const userId = await getCurrentUserId();
  console.log('[哔哩护苗 Storage] addBlockedVideo userId:', userId, 'record:', record);
  const list = await getBlockedVideos();
  const idx = list.findIndex(item => item.url === record.url || (item.bvId && record.bvId && item.bvId === record.bvId));
  if (idx >= 0) {
    list.splice(idx, 1);
  }
  list.unshift(record);
  if (list.length > 200) {
    list.length = 200;
  }
  await setBlockedVideos(list);
  console.log('[哔哩护苗 Storage] addBlockedVideo 保存后条数:', list.length);
  return list;
}

async function clearBlockedVideos() {
  await setBlockedVideos([]);
}

async function getApiBaseUrl() {
  const data = await storageGet([STORAGE_KEYS.API_BASE_URL]);
  return data[STORAGE_KEYS.API_BASE_URL] || DEFAULT_DATA.apiBaseUrl;
}

async function setApiBaseUrl(url) {
  await storageSet({ [STORAGE_KEYS.API_BASE_URL]: url });
}

async function getStripeConfig() {
  const data = await storageGet([STORAGE_KEYS.STRIPE_CONFIG]);
  return data[STORAGE_KEYS.STRIPE_CONFIG] || DEFAULT_DATA.stripeConfig;
}

async function setStripeConfig(config) {
  await storageSet({ [STORAGE_KEYS.STRIPE_CONFIG]: config });
}

async function getMachineId() {
  const data = await storageGet([STORAGE_KEYS.MACHINE_ID]);
  let id = data[STORAGE_KEYS.MACHINE_ID];
  if (!id) {
    id = crypto.randomUUID();
    await storageSet({ [STORAGE_KEYS.MACHINE_ID]: id });
  }
  return id;
}

async function getMachineName() {
  const data = await storageGet([STORAGE_KEYS.MACHINE_NAME]);
  let name = data[STORAGE_KEYS.MACHINE_NAME];
  if (!name) {
    name = `Chrome ${new Date().toLocaleDateString()}`;
    await storageSet({ [STORAGE_KEYS.MACHINE_NAME]: name });
  }
  return name;
}

async function addVideoStat(stat) {
  const stats = await getVideoStats();
  const existingIndex = stats.findIndex(s => s.bvId === stat.bvId);
  if (existingIndex >= 0) {
    const existing = stats[existingIndex];
    existing.watchDuration = (existing.watchDuration || 0) + (stat.watchDuration || 0);
    existing.lastWatchAt = stat.lastWatchAt;
    existing.watchPercent = stat.videoDuration
      ? Math.min(100, Math.round((existing.watchDuration / stat.videoDuration) * 100 * 10) / 10)
      : existing.watchPercent;
    if (stat.title) existing.title = stat.title;
    if (stat.upName) existing.upName = stat.upName;
    if (stat.upId) existing.upId = stat.upId;
    if (stat.videoDuration) existing.videoDuration = stat.videoDuration;

    // openedAt 取最早
    if (!existing.openedAt || (stat.openedAt && stat.openedAt < existing.openedAt)) {
      existing.openedAt = stat.openedAt;
    }
    // startedAt 取最早非空
    if (!existing.startedAt || (stat.startedAt && stat.startedAt < existing.startedAt)) {
      existing.startedAt = stat.startedAt;
    }
    // closedAt 取最晚
    if (!existing.closedAt || (stat.closedAt && stat.closedAt > existing.closedAt)) {
      existing.closedAt = stat.closedAt;
    }
    // actuallyPlayed 任一 true
    existing.actuallyPlayed = !!existing.actuallyPlayed || !!stat.actuallyPlayed;

    stats.splice(existingIndex, 1);
    stats.unshift(existing);
  } else {
    stats.unshift(stat);
  }
  if (stats.length > 200) {
    stats.length = 200;
  }
  await setVideoStats(stats);
  return stats;
}

async function clearVideoStats() {
  await setVideoStats([]);
}

async function getSettings() {
  return {
    domainRules: await getDomainRules(),
    mode: await getMode()
  };
}

async function setSettings(settings) {
  if (settings.domainRules !== undefined) {
    await setDomainRules(settings.domainRules);
  }
  if (settings.mode !== undefined) {
    await setMode(settings.mode);
  }
}

async function getMode() {
  const userId = await getCurrentUserId();
  if (!userId) return DEFAULT_DATA.mode;
  const key = userKey(STORAGE_KEYS.MODE, userId);
  const data = await storageGet([key]);
  const mode = data[key] || DEFAULT_DATA.mode;
  return {
    type: ['strict', 'lenient', 'timed'].includes(mode?.type) ? mode.type : 'strict',
    timeRanges: Array.isArray(mode?.timeRanges) ? mode.timeRanges : []
  };
}

async function setMode(mode) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const key = userKey(STORAGE_KEYS.MODE, userId);
  await storageSet({ [key]: mode });
}

async function initStorage() {
  // 仅初始化与用户无关的系统配置；业务数据按 userId 动态写入
  const systemKeys = [STORAGE_KEYS.API_BASE_URL, STORAGE_KEYS.STRIPE_CONFIG];
  const data = await storageGet(systemKeys);
  if (data[STORAGE_KEYS.API_BASE_URL] === undefined) {
    await storageSet({ [STORAGE_KEYS.API_BASE_URL]: DEFAULT_DATA.apiBaseUrl });
  }
  if (data[STORAGE_KEYS.STRIPE_CONFIG] === undefined) {
    await storageSet({ [STORAGE_KEYS.STRIPE_CONFIG]: DEFAULT_DATA.stripeConfig });
  }
  // 清理旧版本无 userId 后缀的业务数据残留
  await chrome.storage.local.remove([
    STORAGE_KEYS.WHITELIST,
    STORAGE_KEYS.BLACKLIST,
    STORAGE_KEYS.DOMAIN_RULES,
    STORAGE_KEYS.MODE,
    STORAGE_KEYS.TEMP_UNLOCK_UNTIL,
    STORAGE_KEYS.VIDEO_STATS,
    STORAGE_KEYS.BLOCKED_VIDEOS
  ]);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    storageGet, storageSet,
    getAuth, setAuth, clearAuth, updateAuthTokens,
    getWhitelist, setWhitelist,
    addUpId, removeUpId,
    addBvId, removeBvId,
    addSsId, removeSsId,
    getBlacklist, setBlacklist,
    addBlackUpId, removeBlackUpId,
    addBlackBvId, removeBlackBvId,
    getDomainRules, setDomainRules,
    getMode, setMode,
    getTempUnlockUntil, setTempUnlockUntil, isTempUnlocked,
    initStorage,
    getVideoStats, setVideoStats, addVideoStat, clearVideoStats,
    getBlockedVideos, setBlockedVideos, addBlockedVideo, clearBlockedVideos,
    getApiBaseUrl, setApiBaseUrl,
    getSettings, setSettings,
    getStripeConfig, setStripeConfig,
    getMachineId, getMachineName,
    STORAGE_KEYS, DEFAULT_DATA, CHANNEL_RULES
  };
}
