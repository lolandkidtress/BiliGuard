document.addEventListener('DOMContentLoaded', async () => {
  // 初始化 API base URL 与本地 token
  try {
    const [urlRes, authRes] = await Promise.all([
      chrome.runtime.sendMessage({ action: 'getApiBaseUrl' }),
      chrome.runtime.sendMessage({ action: 'getAuth' })
    ]);
    if (urlRes?.data) {
      api.setBaseUrl(urlRes.data);
    }
    if (authRes?.data?.token) {
      api.setTokens(authRes.data.token, authRes.data.refreshToken);
    }
  } catch (e) {
    console.error('初始化 API 失败', e);
  }

  const loginSection = document.getElementById('login-section');
  const loggedSection = document.getElementById('logged-section');
  const expiredSection = document.getElementById('expired-section');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const btnLogin = document.getElementById('btn-login');
  const btnRegister = document.getElementById('btn-register');
  const btnLogout = document.getElementById('btn-logout');
  const btnRelogin = document.getElementById('btn-relogin');
  const btnOptions = document.getElementById('btn-options');
  const displayUsername = document.getElementById('display-username');
  const loginMessage = document.getElementById('login-message');

  // 付费计划
  const btnUpgrade = document.getElementById('btn-upgrade');
  const btnLifetime = document.getElementById('btn-lifetime');

  // 会员状态
  const membershipExpireTime = document.getElementById('membership-expire-time');
  const upgradeSection = document.getElementById('upgrade-section');
  const planItemFree = document.getElementById('plan-item-free');
  const planItemPremium = document.getElementById('plan-item-premium');
  const planItemLifetime = document.getElementById('plan-item-lifetime');
  const planDividers = upgradeSection?.querySelectorAll('.plan-divider');

  // 注册弹窗
  const registerModal = document.getElementById('register-modal');
  const regPassword = document.getElementById('reg-password');
  const regPasswordConfirm = document.getElementById('reg-password-confirm');
  const regEmail = document.getElementById('reg-email');
  const regCode = document.getElementById('reg-code');
  const btnSendRegCode = document.getElementById('btn-send-reg-code');
  const btnRegSubmit = document.getElementById('btn-reg-submit');
  const btnRegCancel = document.getElementById('btn-reg-cancel');
  const regMessage = document.getElementById('reg-message');

  // 配置密码弹窗
  const configPwdModal = document.getElementById('config-pwd-modal');
  const configPassword = document.getElementById('config-password');
  const configPasswordConfirm = document.getElementById('config-password-confirm');
  const btnConfigSubmit = document.getElementById('btn-config-submit');
  const configMessage = document.getElementById('config-message');

  // 验证配置密码弹窗（登出用）
  const verifyConfigModal = document.getElementById('verify-config-modal');
  const verifyConfigPassword = document.getElementById('verify-config-password');
  const btnVerifyConfigSubmit = document.getElementById('btn-verify-config-submit');
  const btnVerifyConfigCancel = document.getElementById('btn-verify-config-cancel');
  const verifyConfigMessage = document.getElementById('verify-config-message');

  // 重置配置密码弹窗
  const resetConfigModal = document.getElementById('reset-config-modal');
  const resetEmail = document.getElementById('reset-email');
  const resetCode = document.getElementById('reset-code');
  const resetNewPwd = document.getElementById('reset-new-pwd');
  const btnSendCode = document.getElementById('btn-send-code');
  const btnResetSubmit = document.getElementById('btn-reset-submit');
  const btnResetCancel = document.getElementById('btn-reset-cancel');
  const resetMessage = document.getElementById('reset-message');

  // 忘记登录密码弹窗
  const forgotLoginModal = document.getElementById('forgot-login-modal');
  const forgotLoginEmail = document.getElementById('forgot-login-email');
  const forgotLoginCode = document.getElementById('forgot-login-code');
  const forgotLoginNewPwd = document.getElementById('forgot-login-new-pwd');
  const forgotLoginNewPwdConfirm = document.getElementById('forgot-login-new-pwd-confirm');
  const linkForgotLogin = document.getElementById('link-forgot-login');
  const btnForgotLoginSend = document.getElementById('btn-forgot-login-send');
  const btnForgotLoginSubmit = document.getElementById('btn-forgot-login-submit');
  const btnForgotLoginCancel = document.getElementById('btn-forgot-login-cancel');
  const forgotLoginMessage = document.getElementById('forgot-login-message');

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = `message ${type}`;
    el.classList.remove('hidden');
  }

  function hideMessage(el) {
    el.className = 'message hidden';
  }

  function showModal(modal) {
    modal.classList.remove('hidden');
  }

  function hideModal(modal) {
    modal.classList.add('hidden');
  }

  async function checkAuth() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAuth' });
      if (response?.data?.token) {
        showLoggedIn(response.data.username);
        // 未设置配置密码则弹出设置
        if (response.data.hasConfigPassword === false) {
          showModal(configPwdModal);
        }
      } else {
        showLogin();
      }
    } catch (e) {
      showLogin();
    }
  }

  function showLogin() {
    loginSection.classList.remove('hidden');
    loggedSection.classList.add('hidden');
    expiredSection.classList.add('hidden');
  }

  function showExpired() {
    loginSection.classList.add('hidden');
    loggedSection.classList.add('hidden');
    expiredSection.classList.remove('hidden');
  }

  function showLoggedIn(username) {
    loginSection.classList.add('hidden');
    expiredSection.classList.add('hidden');
    loggedSection.classList.remove('hidden');
    displayUsername.textContent = username;
    loadMembershipExpire();
    loadAllStats();
  }

  // ---------- 数据统计 ----------
  const statsList = document.getElementById('stats-list');
  const statsCount = document.getElementById('stats-count');
  const blockedList = document.getElementById('blocked-list');
  const blockedCount = document.getElementById('blocked-count');
  const statsPane = document.getElementById('stats-pane');
  const blockedPane = document.getElementById('blocked-pane');
  const tabStats = document.getElementById('tab-stats');
  const tabBlocked = document.getElementById('tab-blocked');
  const btnRefreshStats = document.getElementById('btn-refresh-stats');

  const CHANNEL_NAME_MAP = { anime: '番剧', live: '直播', manga: '漫画', match: '赛事' };

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : text;
    return div.innerHTML;
  }

  function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0秒';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}时${m}分${s}秒`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  }

  function formatBlockedReason(reason) {
    if (!reason) return '未知';
    if (reason === 'not-in-whitelist') return '不在白名单';
    if (reason.startsWith('channel:')) {
      const key = reason.replace('channel:', '');
      return CHANNEL_NAME_MAP[key] ? `${CHANNEL_NAME_MAP[key]}频道拦截` : '频道拦截';
    }
    return reason;
  }

  function getBilibiliUrl(bvId, url) {
    if (bvId) {
      if (/^(ep|ss)\d+$/.test(bvId)) return `https://www.bilibili.com/bangumi/play/${bvId}`;
      return `https://www.bilibili.com/video/${bvId}`;
    }
    if (url && url.includes('bilibili.com')) return url;
    return '';
  }

  async function loadVideoStats() {
    try {
      const result = await api.getStats();
      if (result.success) {
        renderStatsList(result.data || []);
        return;
      }
      // 后端失败（如订阅过期）回退到本地数据，与 options 行为一致
      const local = await chrome.runtime.sendMessage({ action: 'getVideoStats' });
      renderStatsList(local?.success ? (local.data || []) : []);
    } catch (e) {
      console.error('[哔哩护苗 Popup] 加载观看统计失败', e);
      try {
        const local = await chrome.runtime.sendMessage({ action: 'getVideoStats' });
        renderStatsList(local?.success ? (local.data || []) : []);
      } catch (_) {}
    }
  }

  function renderStatsList(stats) {
    statsCount.textContent = `共 ${stats.length} 条记录`;
    statsList.innerHTML = '';
    if (!stats || stats.length === 0) {
      statsList.innerHTML = '<div class="empty-tip">暂无观看记录</div>';
      return;
    }
    for (const s of stats) {
      const item = document.createElement('div');
      item.className = 'stat-item';
      const title = escapeHtml(s.title || '未知视频');
      const upName = escapeHtml(s.upName || '未知UP主');
      const bv = escapeHtml(s.bvId || '');
      const watch = formatDuration(s.watchDuration);
      const total = s.videoDuration ? formatDuration(s.videoDuration) : '';
      const percent = s.watchPercent ? `${s.watchPercent}%` : '';
      const when = formatDate(s.lastWatchAt || s.watchedAt);
      const playedBadge = s.actuallyPlayed
        ? '<span class="stat-played">已播放</span>'
        : '<span class="stat-not-played">未播放</span>';
      const biliUrl = getBilibiliUrl(s.bvId, null);
      const openBtn = biliUrl
        ? `<a href="${biliUrl}" target="_blank" class="btn btn-small btn-primary" style="margin-top:6px;">去B站看</a>`
        : '';
      item.innerHTML = `
        <div class="stat-main">
          <div class="stat-title" title="${title}">${title}${playedBadge}</div>
          <div class="stat-meta">
            <span class="stat-up">${upName}</span>
            ${bv ? `<span class="stat-bv">${bv}</span>` : ''}
          </div>
        </div>
        <div class="stat-duration">
          <div class="stat-watch">观看 ${watch}</div>
          ${total ? `<div class="stat-total">总时长 ${total} · ${percent}</div>` : ''}
          <div class="stat-when">${when}</div>
          ${openBtn}
        </div>
      `;
      statsList.appendChild(item);
    }
  }

  async function loadBlockedVideos() {
    try {
      const result = await api.getBlockedVideos();
      if (result.success) {
        renderBlockedList(result.data || []);
        return;
      }
      const local = await chrome.runtime.sendMessage({ action: 'getBlockedVideos' });
      renderBlockedList(local?.success ? (local.data || []) : []);
    } catch (e) {
      console.error('[哔哩护苗 Popup] 加载拦截记录失败', e);
      try {
        const local = await chrome.runtime.sendMessage({ action: 'getBlockedVideos' });
        renderBlockedList(local?.success ? (local.data || []) : []);
      } catch (_) {}
    }
  }

  function renderBlockedList(list) {
    blockedCount.textContent = `共 ${list.length} 条记录`;
    blockedList.innerHTML = '';
    if (!list || list.length === 0) {
      blockedList.innerHTML = '<div class="empty-tip">暂无被拦截记录</div>';
      return;
    }
    for (const b of list) {
      const el = document.createElement('div');
      el.className = 'stat-item';
      const title = escapeHtml(b.title || '未知页面');
      const upName = escapeHtml(b.upName || '未知UP主');
      const bv = escapeHtml(b.bvId || '');
      const when = formatDate(b.blockedAt);
      const reason = formatBlockedReason(b.reason);
      const biliUrl = getBilibiliUrl(b.bvId, b.url);
      const openBtn = biliUrl
        ? `<a href="${biliUrl}" target="_blank" class="btn btn-small btn-primary" style="margin-top:6px;">去B站看</a>`
        : '';
      el.innerHTML = `
        <div class="stat-main">
          <div class="stat-title" title="${title}">${title}</div>
          <div class="stat-meta">
            <span class="stat-up">${upName}</span>
            ${bv ? `<span class="stat-bv">${bv}</span>` : ''}
            <span class="stat-reason">${reason}</span>
          </div>
        </div>
        <div class="stat-duration">
          <div class="stat-when">${when}</div>
          ${openBtn}
        </div>
      `;
      blockedList.appendChild(el);
    }
  }

  function loadAllStats() {
    loadVideoStats();
    loadBlockedVideos();
  }

  function switchTab(tab) {
    const isStats = tab === 'stats';
    tabStats.classList.toggle('active', isStats);
    tabBlocked.classList.toggle('active', !isStats);
    statsPane.classList.toggle('hidden', !isStats);
    blockedPane.classList.toggle('hidden', isStats);
  }

  if (tabStats) tabStats.addEventListener('click', () => switchTab('stats'));
  if (tabBlocked) tabBlocked.addEventListener('click', () => switchTab('blocked'));
  if (btnRefreshStats) btnRefreshStats.addEventListener('click', async () => {
    btnRefreshStats.disabled = true;
    btnRefreshStats.textContent = '刷新中...';
    await loadAllStats();
    btnRefreshStats.disabled = false;
    btnRefreshStats.textContent = '⟳ 刷新';
  });

  function formatDate(ts) {
    if (!ts) return '--';
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function setPlanVisibility(isActive) {
    if (planItemFree) planItemFree.style.display = isActive ? 'none' : '';
    if (planItemPremium) planItemPremium.style.display = isActive ? 'none' : '';
    if (planItemLifetime) planItemLifetime.style.display = '';
    if (planDividers) {
      planDividers.forEach(d => { d.style.display = isActive ? 'none' : ''; });
    }
    if (upgradeSection) upgradeSection.style.display = '';
  }

  async function loadMembershipExpire() {
    if (!membershipExpireTime) {
      console.log('[哔哩护苗 Popup] 未找到会员信息 DOM 元素');
      return;
    }
    try {
      const authRes = await chrome.runtime.sendMessage({ action: 'getAuth' });
      console.log('[哔哩护苗 Popup] getAuth 结果:', authRes);
      const token = authRes?.data?.token;
      if (!token) {
        membershipExpireTime.textContent = '未登录';
        setPlanVisibility(false);
        return;
      }
      api.setTokens(token, authRes?.data?.refreshToken);
      const result = await api.getUserInfo();
      console.log('[哔哩护苗 Popup] getUserInfo 结果:', result);
      if (result.success && result.data) {
        const expireTime = result.data.expireTime;
        const isActive = expireTime && expireTime > Date.now();
        membershipExpireTime.textContent = isActive ? formatDate(expireTime) : '未开通会员';
        setPlanVisibility(isActive);
      } else {
        membershipExpireTime.textContent = result.message || '获取失败';
        setPlanVisibility(false);
      }
    } catch (e) {
      console.error('[哔哩护苗 Popup] 加载会员信息失败:', e);
      membershipExpireTime.textContent = '获取失败';
      setPlanVisibility(false);
    }
  }

  async function syncFromBackend() {
    // 业务数据按 userId 隔离存储，登录后直接用后端最新数据覆盖当前 userId 的本地数据
    try {
      const wlResult = await api.getWhitelist();
      if (wlResult.success && wlResult.data) {
        await chrome.runtime.sendMessage({ action: 'setWhitelist', whitelist: wlResult.data });
      }
    } catch (e) {
      console.error('登录后拉取白名单失败', e);
    }
    try {
      const stResult = await api.getSettings();
      if (stResult.success && stResult.data) {
        await chrome.runtime.sendMessage({ action: 'setSettings', settings: stResult.data });
      }
    } catch (e) {
      console.error('登录后拉取设置失败', e);
    }
  }

  btnLogin.addEventListener('click', async () => {
    hideMessage(loginMessage);
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      showMessage(loginMessage, '请输入邮箱和密码', 'error');
      return;
    }

    const result = await api.login(username, password);
    if (result.success) {
      await chrome.runtime.sendMessage({ action: 'setAuth', auth: result.data });
      api.setTokens(result.data.token, result.data.refreshToken);
      await syncFromBackend();
      showLoggedIn(result.data.username);
      usernameInput.value = '';
      passwordInput.value = '';

      // 首次登录未设置配置密码，弹出设置
      if (result.data.hasConfigPassword === false) {
        showModal(configPwdModal);
      }
    } else {
      showMessage(loginMessage, result.message || '登录失败', 'error');
    }
  });

  // 忘记登录密码
  linkForgotLogin.addEventListener('click', (e) => {
    e.preventDefault();
    hideMessage(forgotLoginMessage);
    forgotLoginEmail.value = '';
    forgotLoginCode.value = '';
    forgotLoginNewPwd.value = '';
    forgotLoginNewPwdConfirm.value = '';
    showModal(forgotLoginModal);
  });

  btnForgotLoginCancel.addEventListener('click', () => {
    hideModal(forgotLoginModal);
  });

  btnForgotLoginSend.addEventListener('click', async () => {
    hideMessage(forgotLoginMessage);
    const email = forgotLoginEmail.value.trim();
    if (!email) {
      showMessage(forgotLoginMessage, '请输入邮箱', 'error');
      return;
    }
    const result = await api.sendResetLoginPwdEmail(email);
    showMessage(forgotLoginMessage, result.message, result.success ? 'success' : 'error');
  });

  btnForgotLoginSubmit.addEventListener('click', async () => {
    hideMessage(forgotLoginMessage);
    const email = forgotLoginEmail.value.trim();
    const code = forgotLoginCode.value.trim();
    const newPwd = forgotLoginNewPwd.value.trim();
    const confirm = forgotLoginNewPwdConfirm.value.trim();

    if (!email || !code || !newPwd) {
      showMessage(forgotLoginMessage, '请填写完整信息', 'error');
      return;
    }
    if (newPwd.length < 6) {
      showMessage(forgotLoginMessage, '密码至少6个字符', 'error');
      return;
    }
    if (newPwd !== confirm) {
      showMessage(forgotLoginMessage, '两次输入的密码不一致', 'error');
      return;
    }

    const result = await api.resetLoginPassword(email, code, newPwd);
    showMessage(forgotLoginMessage, result.message, result.success ? 'success' : 'error');
    if (result.success) {
      setTimeout(() => hideModal(forgotLoginModal), 800);
    }
  });

  // 注册弹窗
  btnRegister.addEventListener('click', () => {
    hideMessage(regMessage);
    regPassword.value = '';
    regPasswordConfirm.value = '';
    regEmail.value = '';
    regCode.value = '';
    showModal(registerModal);
  });

  btnRegCancel.addEventListener('click', () => {
    hideModal(registerModal);
  });

  async function sendRegisterCode() {
    hideMessage(regMessage);
    const email = regEmail.value.trim();
    if (!email) {
      showMessage(regMessage, '请先输入邮箱', 'error');
      return;
    }
    btnSendRegCode.disabled = true;
    btnSendRegCode.textContent = '发送中...';
    const result = await api.sendRegisterEmail(email);
    if (result.success) {
      showMessage(regMessage, '验证码已发送，请查收邮件', 'success');
      let seconds = 60;
      btnSendRegCode.textContent = `${seconds}s`;
      const timer = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
          clearInterval(timer);
          btnSendRegCode.disabled = false;
          btnSendRegCode.textContent = '发送验证码';
        } else {
          btnSendRegCode.textContent = `${seconds}s`;
        }
      }, 1000);
    } else {
      showMessage(regMessage, result.message || '发送失败', 'error');
      btnSendRegCode.disabled = false;
      btnSendRegCode.textContent = '发送验证码';
    }
  }

  if (btnSendRegCode) {
    btnSendRegCode.addEventListener('click', sendRegisterCode);
  }

  btnRegSubmit.addEventListener('click', async () => {
    hideMessage(regMessage);
    const email = regEmail.value.trim();
    const password = regPassword.value.trim();
    const passwordConfirm = regPasswordConfirm.value.trim();
    const code = regCode.value.trim();

    if (!email) {
      showMessage(regMessage, '请输入邮箱', 'error');
      return;
    }
    if (!code) {
      showMessage(regMessage, '请输入邮箱验证码', 'error');
      return;
    }
    if (!password) {
      showMessage(regMessage, '请输入密码', 'error');
      return;
    }
    if (password.length < 6) {
      showMessage(regMessage, '密码至少6个字符', 'error');
      return;
    }
    if (password !== passwordConfirm) {
      showMessage(regMessage, '两次输入的密码不一致', 'error');
      return;
    }

    // 邮箱同时作为用户名
    const result = await api.register(email, password, email, code);
    showMessage(regMessage, result.message, result.success ? 'success' : 'error');
    if (result.success) {
      setTimeout(() => hideModal(registerModal), 800);
    }
  });

  // 配置密码设置
  btnConfigSubmit.addEventListener('click', async () => {
    hideMessage(configMessage);
    const pwd = configPassword.value.trim();
    const confirm = configPasswordConfirm.value.trim();

    if (!pwd || pwd.length < 6) {
      showMessage(configMessage, '配置密码至少6个字符', 'error');
      return;
    }
    if (pwd !== confirm) {
      showMessage(configMessage, '两次输入不一致', 'error');
      return;
    }

    const authRes = await chrome.runtime.sendMessage({ action: 'getAuth' });
    const token = authRes?.data?.token;
    if (!token) {
      showMessage(configMessage, '请先登录', 'error');
      return;
    }
    api.setTokens(token, authRes?.data?.refreshToken);
    const result = await api.setConfigPassword(pwd);
    showMessage(configMessage, result.message, result.success ? 'success' : 'error');
    if (result.success) {
      // 更新本地 auth 标记
      authRes.data.hasConfigPassword = true;
      await chrome.runtime.sendMessage({ action: 'setAuth', auth: authRes.data });
      setTimeout(() => hideModal(configPwdModal), 800);
    }
  });

  btnLogout.addEventListener('click', async () => {
    hideMessage(verifyConfigMessage);
    verifyConfigPassword.value = '';
    try {
      const authRes = await chrome.runtime.sendMessage({ action: 'getAuth' });
      // 未设置配置密码时直接登出
      if (authRes?.data?.hasConfigPassword === false) {
        await doLogout();
        return;
      }
    } catch (e) {
      console.error('获取登录状态失败', e);
    }
    showModal(verifyConfigModal);
    verifyConfigPassword.focus();
  });

  btnVerifyConfigCancel.addEventListener('click', () => {
    hideModal(verifyConfigModal);
  });

  btnVerifyConfigSubmit.addEventListener('click', async () => {
    hideMessage(verifyConfigMessage);
    const pwd = verifyConfigPassword.value.trim();
    if (!pwd) {
      showMessage(verifyConfigMessage, '请输入配置密码', 'error');
      return;
    }
    try {
      const authRes = await chrome.runtime.sendMessage({ action: 'getAuth' });
      const token = authRes?.data?.token;
      if (!token) {
        showMessage(verifyConfigMessage, '登录已过期', 'error');
        return;
      }
      api.setTokens(token, authRes?.data?.refreshToken);
      const result = await api.verifyConfigPassword(pwd);
      if (result.success) {
        hideModal(verifyConfigModal);
        await doLogout();
      } else {
        showMessage(verifyConfigMessage, result.message || '配置密码错误', 'error');
      }
    } catch (e) {
      showMessage(verifyConfigMessage, '验证失败: ' + e.message, 'error');
    }
  });

  verifyConfigPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnVerifyConfigSubmit.click();
  });

  async function doLogout() {
    try {
      await api.logout();
    } catch (e) {
      console.error('登出请求失败', e);
    }
    await chrome.runtime.sendMessage({ action: 'logout' });
    showLogin();
  }

  btnOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  async function openPaymentPage(e) {
    const plan = e?.target?.dataset?.plan || 'premium';
    try {
      const authRes = await chrome.runtime.sendMessage({ action: 'getAuth' });
      const token = authRes?.data?.token;
      if (!token) {
        showMessage(loginMessage, '请先登录', 'error');
        return;
      }
      api.setTokens(token, authRes?.data?.refreshToken);
      const result = await api.createCheckoutSession(plan, 'https://www.biliguard.cc/login/#account', 'https://www.biliguard.cc/login/#account');
      if (result.success && result.data?.url) {
        window.open(result.data.url, '_blank');
      } else {
        showMessage(loginMessage, result.message || '创建支付会话失败', 'error');
      }
    } catch (e) {
      console.error('打开支付页面失败', e);
      showMessage(loginMessage, '支付跳转失败: ' + e.message, 'error');
    }
  }

  if (btnUpgrade) {
    btnUpgrade.dataset.plan = 'premium';
    btnUpgrade.addEventListener('click', openPaymentPage);
  }
  if (btnLifetime) {
    btnLifetime.dataset.plan = 'lifetime';
    btnLifetime.addEventListener('click', openPaymentPage);
  }

  if (btnRelogin) {
    btnRelogin.addEventListener('click', () => {
      showLogin();
    });
  }

  // 重置配置密码
  // 在选项页中需要，这里预留弹窗逻辑供选项页调用
  window.showResetConfigModal = () => showModal(resetConfigModal);

  btnSendCode.addEventListener('click', async () => {
    hideMessage(resetMessage);
    const email = resetEmail.value.trim();
    if (!email) {
      showMessage(resetMessage, '请输入邮箱', 'error');
      return;
    }
    const result = await api.sendResetConfigPwdEmail(email);
    showMessage(resetMessage, result.message, result.success ? 'success' : 'error');
  });

  btnResetSubmit.addEventListener('click', async () => {
    hideMessage(resetMessage);
    const email = resetEmail.value.trim();
    const code = resetCode.value.trim();
    const newPwd = resetNewPwd.value.trim();

    if (!email || !code || !newPwd) {
      showMessage(resetMessage, '请填写完整信息', 'error');
      return;
    }
    if (newPwd.length < 6) {
      showMessage(resetMessage, '配置密码至少6个字符', 'error');
      return;
    }

    const result = await api.resetConfigPassword(email, code, newPwd);
    showMessage(resetMessage, result.message, result.success ? 'success' : 'error');
    if (result.success) {
      setTimeout(() => hideModal(resetConfigModal), 800);
    }
  });

  btnResetCancel.addEventListener('click', () => {
    hideModal(resetConfigModal);
  });

  // token 过期统一处理
  window.addEventListener('tokenExpired', (e) => {
    showExpired();
  });

  // 联系我们弹窗
  const contactModal = document.getElementById('contact-modal');
  const linkContact = document.getElementById('link-contact');
  const btnContactClose = document.getElementById('btn-contact-close');
  if (linkContact) {
    linkContact.addEventListener('click', (e) => {
      e.preventDefault();
      showModal(contactModal);
    });
  }
  if (btnContactClose) {
    btnContactClose.addEventListener('click', () => hideModal(contactModal));
  }

  checkAuth();
});
