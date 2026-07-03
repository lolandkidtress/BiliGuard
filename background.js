// background.js - Service Worker

importScripts('storage.js');
importScripts('api.js');

// Service Worker 每次启动时初始化 API 地址与 token
(async function initBackground() {
  const url = await getApiBaseUrl();
  if (url) api.setBaseUrl(url);
  const auth = await getAuth();
  if (auth?.token) {
    api.setTokens(auth.token, auth.refreshToken);
  }
})();

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[哔哩护苗] 扩展已安装/更新', details.reason);
  initStorage();
  setApiBaseUrl(DEFAULT_DATA.apiBaseUrl);
  setStripeConfig(DEFAULT_DATA.stripeConfig);
  api.setBaseUrl(DEFAULT_DATA.apiBaseUrl);
  chrome.alarms.create('autoSync', { periodInMinutes: 0.5 });
  chrome.alarms.create('heartbeat', { periodInMinutes: 30 });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

// 番剧反查 ss(season_id) 与 md(media_id)，结果缓存避免重复请求
const epSeasonCache = {};
async function fetchSeasonIds(params) {
  const cacheKey = params.epId ? 'ep' + params.epId : (params.seasonId ? 'ss' + params.seasonId : null);
  if (!cacheKey) return { ss: null, md: null, name: null };
  if (epSeasonCache[cacheKey]) return epSeasonCache[cacheKey];

  const auth = await getAuth();
  const token = auth?.token;
  if (!token) {
    console.log('[哔哩护苗 Background] 未登录，跳过番剧反查');
    return { ss: null, md: null, name: null };
  }
  const baseUrl = await getApiBaseUrl();
  if (!baseUrl) {
    console.warn('[哔哩护苗 Background] 未配置 API 地址，无法反查番剧');
    return { ss: null, md: null, name: null };
  }

  const query = params.epId
    ? `epId=${encodeURIComponent(params.epId)}`
    : `seasonId=${encodeURIComponent(params.seasonId)}`;
  try {
    const machineId = await getMachineId();
    const headers = { 'At': token };
    if (machineId) headers['Machine-Id'] = machineId;
    const resp = await fetch(`${baseUrl}/bg/bangumi/resolve?${query}`, { headers });
    const json = await resp.json();
    if (json?.success && json?.data) {
      const out = {
        ss: json.data.ss || null,
        md: json.data.md || null,
        name: json.data.name || null
      };
      epSeasonCache[cacheKey] = out;
      return out;
    }
    console.warn('[哔哩护苗 Background] 后端反查番剧无结果', json);
  } catch (e) {
    console.error('[哔哩护苗 Background] 后端反查番剧失败', e);
  }
  return { ss: null, md: null, name: null };
}

async function autoSyncFromBackend() {
  try {
    const auth = await getAuth();
    console.log('[Background Sync] auth 存在:', !!auth?.token, 'userId:', auth?.userId);
    if (!auth?.token) return;

    // 确保 API base URL 与 token 已设置
    const url = await getApiBaseUrl();
    if (url) api.setBaseUrl(url);
    api.setTokens(auth.token, auth.refreshToken);

    const wlResult = await api.getWhitelist();
    console.log('[Background Sync] 白名单结果:', wlResult.success);
    if (wlResult.success && wlResult.data) {
      const safe = normalizeWhitelist(wlResult.data);
      await setWhitelist(safe);
      console.log('[哔哩护苗 Background] 已从云端同步白名单:', safe);
    }

    const stResult = await api.getSettings();
    console.log('[Background Sync] 设置结果:', stResult.success);
    if (stResult.success && stResult.data) {
      const safe = normalizeSettings(stResult.data);
      await setSettings(safe);
      console.log('[哔哩护苗 Background] 已从云端同步设置:', safe);
    }

    const modeResult = await api.getMode();
    console.log('[Background Sync] 模式结果:', modeResult.success, modeResult.data, modeResult.raw);
    if (modeResult.success) {
      const raw = modeResult.data || modeResult.raw || modeResult;
      const modeType = raw?.modeType;
      const timeRanges = raw?.timeRanges;
      if (['strict', 'lenient', 'timed'].includes(modeType)) {
        const mode = {
          type: modeType,
          timeRanges: Array.isArray(timeRanges) ? timeRanges : []
        };
        await setMode(mode);
        console.log('[哔哩护苗 Background] 已从云端同步模式:', mode);
      }
    }
  } catch (e) {
    console.error('[哔哩护苗] 自动同步失败', e);
  }
}

async function uploadStatToBackend(stat) {
  try {
    const auth = await getAuth();
    if (!auth?.token) {
      console.log('[哔哩护苗 Background] 未登录，跳过实时上传统计');
      return;
    }
    const url = await getApiBaseUrl();
    if (url) api.setBaseUrl(url);
    api.setTokens(auth.token, auth.refreshToken);
    const machineId = await getMachineId();
    console.log('[哔哩护苗 Background] 实时上传统计:', stat);
    const result = await api.saveStats([stat], machineId);
    console.log('[哔哩护苗 Background] 实时上传统计结果:', result);
  } catch (e) {
    console.error('[哔哩护苗 Background] 实时上传统计失败:', e);
  }
}

function normalizeWhitelist(data) {
  return {
    upIds: Array.isArray(data?.upIds) ? data.upIds : [],
    upNames: Array.isArray(data?.upNames) ? data.upNames : [],
    bvIds: Array.isArray(data?.bvIds) ? data.bvIds : [],
    ssIds: Array.isArray(data?.ssIds) ? data.ssIds : [],
    ssNames: Array.isArray(data?.ssNames) ? data.ssNames : []
  };
}

function normalizeSettings(data) {
  const rules = data?.domainRules || {};
  const normalized = {};
  for (const rule of CHANNEL_RULES) {
    normalized[rule.key] = !!rules[rule.key];
  }
  const mode = data?.mode || { type: 'strict', timeRanges: [] };
  return {
    domainRules: normalized,
    mode: {
      type: ['strict', 'lenient', 'timed'].includes(mode?.type) ? mode.type : 'strict',
      timeRanges: Array.isArray(mode?.timeRanges) ? mode.timeRanges : []
    }
  };
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoSync') {
    autoSyncFromBackend().catch(e => console.error('[哔哩护苗] alarm 同步异常', e));
  } else if (alarm.name === 'heartbeat') {
    sendHeartbeat().catch(e => console.error('[哔哩护苗] alarm 心跳异常', e));
  }
});

async function sendHeartbeat() {
  try {
    const auth = await getAuth();
    if (!auth?.token) {
      console.log('[哔哩护苗 Background] 未登录，跳过心跳');
      return;
    }
    const url = await getApiBaseUrl();
    if (url) api.setBaseUrl(url);
    api.setTokens(auth.token, auth.refreshToken);
    const result = await api.heartbeat();
    console.log('[哔哩护苗 Background] 心跳结果:', result);
    if (result.expired) {
      console.warn('[哔哩护苗 Background] 心跳检测到登录已过期');
      await clearAuth();
    }
  } catch (e) {
    console.error('[哔哩护苗 Background] 心跳失败:', e);
  }
}

async function submitWhitelistRequest(requestInfo) {
  try {
    const auth = await getAuth();
    if (!auth?.token) {
      return { success: false, message: '请先登录' };
    }
    const url = await getApiBaseUrl();
    if (!url) {
      return { success: false, message: '未配置 API 地址' };
    }
    const machineId = await getMachineId();
    const headers = {
      'Content-Type': 'application/json',
      'At': auth.token
    };
    if (machineId) headers['Machine-Id'] = machineId;
    const resp = await fetch(`${url}/bg/whitelist-request`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestInfo)
    });
    const json = await resp.json();
    return { success: json?.success, message: json?.note || '' };
  } catch (e) {
    console.error('[哔哩护苗 Background] 提交白名单申请失败', e);
    return { success: false, message: e.message };
  }
}

async function uploadBlockedVideoToBackend(record) {
  try {
    const auth = await getAuth();
    if (!auth?.token) {
      console.log('[哔哩护苗 Background] 未登录，跳过实时上传拦截记录');
      return;
    }
    const url = await getApiBaseUrl();
    if (url) api.setBaseUrl(url);
    api.setTokens(auth.token, auth.refreshToken);
    const machineId = await getMachineId();
    console.log('[哔哩护苗 Background] 实时上传拦截记录:', record);
    const result = await api.saveBlockedVideo(record, machineId);
    console.log('[哔哩护苗 Background] 实时上传拦截记录结果:', result);
  } catch (e) {
    console.error('[哔哩护苗 Background] 实时上传拦截记录失败:', e);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === 'getWhitelist') {
        const whitelist = await getWhitelist();
        sendResponse({ success: true, data: whitelist });
      }
      else if (request.action === 'getDomainRules') {
        const rules = await getDomainRules();
        sendResponse({ success: true, data: rules });
      }
      else if (request.action === 'getAuth') {
        const auth = await getAuth();
        sendResponse({ success: true, data: auth });
      }
      else if (request.action === 'setAuth') {
        await setAuth(request.auth);
        sendResponse({ success: true });
      }
      else if (request.action === 'updateAuthTokens') {
        await updateAuthTokens(request.token, request.refreshToken);
        sendResponse({ success: true });
      }
      else if (request.action === 'logout') {
        await clearAuth();
        sendResponse({ success: true });
      }
      else if (request.action === 'addUpId') {
        const whitelist = await addUpId(request.upId, request.upName);
        sendResponse({ success: true, data: whitelist });
      }
      else if (request.action === 'removeUpId') {
        const whitelist = await removeUpId(request.upId);
        sendResponse({ success: true, data: whitelist });
      }
      else if (request.action === 'addBvId') {
        console.log('[哔哩护苗 Background] 收到 addBvId:', request.bvId);
        const whitelist = await addBvId(request.bvId);
        console.log('[哔哩护苗 Background] 返回 whitelist:', whitelist);
        sendResponse({ success: true, data: whitelist });
      }
      else if (request.action === 'removeBvId') {
        const whitelist = await removeBvId(request.bvId);
        sendResponse({ success: true, data: whitelist });
      }
      else if (request.action === 'addSsId') {
        const whitelist = await addSsId(request.ssId, request.ssName);
        sendResponse({ success: true, data: whitelist });
      }
      else if (request.action === 'removeSsId') {
        const whitelist = await removeSsId(request.ssId);
        sendResponse({ success: true, data: whitelist });
      }
      else if (request.action === 'getSeasonId') {
        const ids = await fetchSeasonIds({ epId: request.epId, seasonId: request.seasonId });
        sendResponse({ success: true, data: ids });
      }
      else if (request.action === 'submitWhitelistRequest') {
        const result = await submitWhitelistRequest(request.requestInfo);
        sendResponse(result);
      }
      else if (request.action === 'setDomainRules') {
        await setDomainRules(request.rules);
        sendResponse({ success: true });
      }
      else if (request.action === 'checkTempUnlock') {
        const unlocked = await isTempUnlocked();
        sendResponse({ success: true, data: unlocked });
      }
      else if (request.action === 'setTempUnlock') {
        // request.durationSeconds 由后端 verify 返回，转换为本地过期时间戳
        const duration = Number(request.durationSeconds) || 0;
        const until = duration > 0 ? Date.now() + duration * 1000 : 0;
        await setTempUnlockUntil(until);
        sendResponse({ success: true, data: until });
      }
      else if (request.action === 'verifyTempUnlockCode') {
        const auth = await getAuth();
        const token = auth?.token;
        if (!token) {
          sendResponse({ success: false, message: '请先登录' });
          return;
        }
        api.setTokens(token, auth?.refreshToken);
        const result = await api.verifyTempUnlockCode(request.code);
        if (result.success) {
          const durationSeconds = Number(result.data?.durationSeconds) || 0;
          const until = durationSeconds > 0 ? Date.now() + durationSeconds * 1000 : 0;
          await setTempUnlockUntil(until);
        }
        sendResponse(result);
      }
      else if (request.action === 'setWhitelist') {
        await setWhitelist(request.whitelist);
        sendResponse({ success: true });
      }
      else if (request.action === 'getBlockedVideos') {
        const list = await getBlockedVideos();
        sendResponse({ success: true, data: list });
      }
      else if (request.action === 'addBlockedVideo') {
        console.log('[哔哩护苗 Background] 收到 addBlockedVideo:', request.record);
        const list = await addBlockedVideo(request.record);
        console.log('[哔哩护苗 Background] 拦截记录已保存，当前条数:', list.length);
        // 实时上传到后端，await 防止 Service Worker 提前休眠导致请求中断
        await uploadBlockedVideoToBackend(request.record);
        sendResponse({ success: true, data: list });
      }
      else if (request.action === 'clearBlockedVideos') {
        await clearBlockedVideos();
        sendResponse({ success: true });
      }
      else if (request.action === 'getVideoStats') {
        const stats = await getVideoStats();
        sendResponse({ success: true, data: stats });
      }
      else if (request.action === 'addVideoStat') {
        const stats = await addVideoStat(request.stat);
        // 实时上传统计到后端，await 防止 Service Worker 提前休眠导致请求中断
        await uploadStatToBackend(request.stat);
        sendResponse({ success: true, data: stats });
      }
      else if (request.action === 'clearVideoStats') {
        await clearVideoStats();
        sendResponse({ success: true });
      }
      else if (request.action === 'getApiBaseUrl') {
        const url = await getApiBaseUrl();
        sendResponse({ success: true, data: url });
      }
      else if (request.action === 'setApiBaseUrl') {
        await setApiBaseUrl(request.url);
        sendResponse({ success: true });
      }
      else if (request.action === 'getMode') {
        const mode = await getMode();
        sendResponse({ success: true, data: mode });
      }
      else if (request.action === 'setMode') {
        await setMode(request.mode);
        sendResponse({ success: true });
      }
      else if (request.action === 'getSettings') {
        const settings = await getSettings();
        sendResponse({ success: true, data: settings });
      }
      else if (request.action === 'setSettings') {
        await setSettings(request.settings);
        sendResponse({ success: true });
      }
      else if (request.action === 'syncFromBackend') {
        await autoSyncFromBackend();
        sendResponse({ success: true });
      }
      else if (request.action === 'getStripeConfig') {
        const config = await getStripeConfig();
        sendResponse({ success: true, data: config });
      }
      else if (request.action === 'setStripeConfig') {
        await setStripeConfig(request.config);
        sendResponse({ success: true });
      }
      else {
        sendResponse({ success: false, message: '未知操作' });
      }
    } catch (error) {
      console.error('[哔哩护苗] Background 错误:', error);
      sendResponse({ success: false, message: error.message });
    }
  })();
  return true;
});

console.log('[哔哩护苗] Service Worker 已启动');
