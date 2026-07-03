// api.js - 真实后端 API 客户端，内部维护 access/refresh token 并自动刷新

const api = (function () {
  'use strict';
  // base url 统一从 storage.js 的 DEFAULT_DATA.apiBaseUrl 获取
  let API_BASE_URL = (typeof DEFAULT_DATA !== 'undefined' && DEFAULT_DATA?.apiBaseUrl) ? DEFAULT_DATA.apiBaseUrl : 'https://api.7wapilot.com/7wa';
  let accessToken = '';
  let refreshToken = '';

  function setBaseUrl(url) {
    if (url) API_BASE_URL = url.replace(/\/$/, '');
  }

  function getUrl(path) {
    return API_BASE_URL + path;
  }

  function setTokens(at, rt) {
    accessToken = at || '';
    refreshToken = rt || '';
  }

  async function hashPassword(password) {
    const data = new TextEncoder().encode(password || '');
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function getMachineIdHeader() {
    try {
      const machineId = await getMachineId();
      return machineId || '';
    } catch (e) {
      return '';
    }
  }

  async function getMachineNameHeader() {
    try {
      const machineName = await getMachineName();
      return machineName || '';
    } catch (e) {
      return '';
    }
  }

  async function getAuthHeaders(token) {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['At'] = token;
    }
    const machineId = await getMachineIdHeader();
    if (machineId) {
      headers['Machine-Id'] = machineId;
    }
    return headers;
  }

  async function parseResponse(resp) {
    const json = await resp.json();
    return {
      success: !!json.success,
      code: json.code,
      message: json.note || '',
      data: json.data,
      raw: json,
      expired: json.code === 10430
    };
  }

  async function handleError(e) {
    return { success: false, message: '网络异常: ' + e.message };
  }

  async function readTokensFromStorage() {
    try {
      const res = await chrome.runtime.sendMessage({ action: 'getAuth' });
      if (res?.data?.token) {
        accessToken = res.data.token;
        refreshToken = res.data.refreshToken || refreshToken;
        return true;
      }
    } catch (e) {}
    return false;
  }

  async function persistTokens(token, rt) {
    try {
      await chrome.runtime.sendMessage({ action: 'updateAuthTokens', token, refreshToken: rt });
    } catch (e) {
      console.error('[哔哩护苗 API] 保存 token 失败', e);
    }
  }

  async function heartbeat() {
    return apiRequest('/bg/auth/heartbeat', { method: 'POST' });
  }

  async function refreshAccessToken() {
    console.log('[哔哩护苗 API] 尝试刷新 token');
    if (!refreshToken) {
      await readTokensFromStorage();
    }
    if (!refreshToken) {
      console.log('[哔哩护苗 API] 无 refresh token');
      throw new Error('无 refresh token');
    }
    console.log('[哔哩护苗 API] refreshToken 存在:', refreshToken.substring(0, 8) + '...');

    const resp = await fetch(getUrl('/bg/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Machine-Id': await getMachineIdHeader() },
      body: JSON.stringify({ refreshToken })
    });
    const result = await parseResponse(resp);
    console.log('[哔哩护苗 API] refresh 结果:', result);
    if (result.success && result.data?.token) {
      accessToken = result.data.token;
      refreshToken = result.data.refreshToken || refreshToken;
      await persistTokens(accessToken, refreshToken);
      console.log('[哔哩护苗 API] 刷新成功');
      return accessToken;
    }
    console.error('[哔哩护苗 API] 刷新失败:', result.message);
    throw new Error(result.message || '刷新失败');
  }

  async function notifyExpired() {
    await chrome.runtime.sendMessage({ action: 'logout' }).catch(() => {});
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tokenExpired', { detail: '登录已过期，请重新登录' }));
    }
  }

  async function apiRequest(path, options = {}, retryOnExpire = true) {
    if (!accessToken) {
      await readTokensFromStorage();
    }
    const token = accessToken;
    console.log('[哔哩护苗 API] 请求:', path, 'token存在:', !!token);
    const headers = await getAuthHeaders(token);

    try {
      const resp = await fetch(getUrl(path), {
        ...options,
        headers: { ...headers, ...(options.headers || {}) }
      });
      const result = await parseResponse(resp);
      console.log('[哔哩护苗 API] 响应:', path, result);

      if (result.expired && retryOnExpire) {
        console.log('[哔哩护苗 API] token 过期，尝试刷新');
        try {
          await refreshAccessToken();
          return apiRequest(path, options, false);
        } catch (e) {
          await notifyExpired();
          return { success: false, expired: true, message: '登录已过期，请重新登录' };
        }
      }
      return result;
    } catch (e) {
      return handleError(e);
    }
  }

  async function register(username, password, email, code) {
    return apiRequest('/bg/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password: await hashPassword(password), email, code })
    }, false);
  }

  async function sendRegisterEmail(email) {
    return apiRequest('/bg/auth/register/send-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    }, false);
  }

  async function login(username, password) {
    const resp = await apiRequest('/bg/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password: await hashPassword(password),
        machineId: await getMachineIdHeader(),
        machineName: await getMachineNameHeader()
      })
    }, false);
    if (resp.success && resp.data?.token) {
      accessToken = resp.data.token;
      refreshToken = resp.data.refreshToken || '';
      await persistTokens(accessToken, refreshToken);
    }
    return resp;
  }

  async function logout() {
    const result = await apiRequest('/bg/auth/logout', { method: 'POST' }, false);
    await chrome.runtime.sendMessage({ action: 'logout' }).catch(() => {});
    accessToken = '';
    refreshToken = '';
    return result;
  }

  async function getWhitelist() {
    return apiRequest('/bg/whitelist', { method: 'GET' });
  }

  async function saveWhitelist(whitelist, configPassword) {
    return apiRequest('/bg/whitelist', {
      method: 'POST',
      body: JSON.stringify({ ...whitelist, configPassword: await hashPassword(configPassword) })
    });
  }

  async function saveStats(stats, machineId) {
    return apiRequest('/bg/stats', {
      method: 'POST',
      body: JSON.stringify({ machineId, stats })
    });
  }

  async function saveBlockedVideo(record, machineId) {
    return apiRequest('/bg/blocked', {
      method: 'POST',
      body: JSON.stringify({ ...record, machineId })
    });
  }

  async function getStats() {
    return apiRequest('/bg/stats', { method: 'GET' });
  }

  async function getSettings() {
    return apiRequest('/bg/settings', { method: 'GET' });
  }

  async function getMode() {
    return apiRequest('/bg/mode', { method: 'GET' });
  }

  async function saveMode(mode) {
    return apiRequest('/bg/mode', {
      method: 'POST',
      body: JSON.stringify({
        modeType: mode?.type || mode?.modeType || 'strict',
        timeRanges: Array.isArray(mode?.timeRanges) ? mode.timeRanges : []
      })
    });
  }

  async function saveSettings(settings, configPassword) {
    return apiRequest('/bg/settings', {
      method: 'POST',
      body: JSON.stringify({ ...settings, configPassword: await hashPassword(configPassword) })
    });
  }

  async function setConfigPassword(configPassword) {
    return apiRequest('/bg/config-password/set', {
      method: 'POST',
      body: JSON.stringify({ configPassword: await hashPassword(configPassword) })
    });
  }

  async function verifyConfigPassword(configPassword) {
    return apiRequest('/bg/config-password/verify', {
      method: 'POST',
      body: JSON.stringify({ configPassword: await hashPassword(configPassword) })
    });
  }

  async function verifyTempUnlockCode(code) {
    return apiRequest('/bg/temp-unlock/verify', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  async function generateTempUnlockCode() {
    return apiRequest('/bg/temp-unlock/generate', {
      method: 'POST'
    });
  }

  async function getBlockedVideos() {
    return apiRequest('/bg/blocked', { method: 'GET' });
  }

  async function getUserInfo() {
    return apiRequest('/bg/auth/info', { method: 'GET' });
  }

  async function createCheckoutSession(plan, successUrl, cancelUrl) {
    const query = new URLSearchParams();
    query.set('plan', plan);
    if (successUrl) query.set('successUrl', successUrl);
    if (cancelUrl) query.set('cancelUrl', cancelUrl);
    return apiRequest(`/bg/payment/create-checkout-session?${query.toString()}`, { method: 'GET' });
  }

  async function sendResetLoginPwdEmail(email) {
    return apiRequest('/bg/auth/forgot-password/send-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    }, false);
  }

  async function resetLoginPassword(email, code, newPassword) {
    return apiRequest('/bg/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword: await hashPassword(newPassword) })
    }, false);
  }

  async function sendResetConfigPwdEmail(email) {
    return apiRequest('/bg/config-password/send-reset-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    }, false);
  }

  async function resetConfigPassword(email, code, newConfigPassword) {
    return apiRequest('/bg/config-password/reset', {
      method: 'POST',
      body: JSON.stringify({ email, code, newConfigPassword: await hashPassword(newConfigPassword) })
    }, false);
  }

  return {
    register,
    sendRegisterEmail,
    login,
    logout,
    getWhitelist,
    saveWhitelist,
    saveStats,
    getStats,
    getSettings,
    getMode,
    saveMode,
    saveSettings,
    setConfigPassword,
    verifyConfigPassword,
    verifyTempUnlockCode,
    generateTempUnlockCode,
    sendResetLoginPwdEmail,
    resetLoginPassword,
    sendResetConfigPwdEmail,
    resetConfigPassword,
    saveBlockedVideo,
    getBlockedVideos,
    getUserInfo,
    createCheckoutSession,
    setBaseUrl,
    setTokens,
    refreshAccessToken,
    heartbeat
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else if (typeof window !== 'undefined') {
  window.api = api;
}
