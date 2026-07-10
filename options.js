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

  const upInput = document.getElementById('up-input');
  const btnAddUp = document.getElementById('btn-add-up');
  const upList = document.getElementById('up-list');

  const bvInput = document.getElementById('bv-input');
  const btnAddBv = document.getElementById('btn-add-bv');
  const bvList = document.getElementById('bv-list');
  const ssInput = document.getElementById('ss-input');
  const ssNameInput = document.getElementById('ss-name-input');
  const btnAddSs = document.getElementById('btn-add-ss');
  const ssList = document.getElementById('ss-list');

  const blackUpInput = document.getElementById('black-up-input');
  const blackUpNameInput = document.getElementById('black-up-name-input');
  const btnAddBlackUp = document.getElementById('btn-add-black-up');
  const blackUpList = document.getElementById('black-up-list');

  const blackBvInput = document.getElementById('black-bv-input');
  const btnAddBlackBv = document.getElementById('btn-add-black-bv');
  const blackBvList = document.getElementById('black-bv-list');

  const btnPull = document.getElementById('btn-pull');
  const btnPush = document.getElementById('btn-push');
  const syncMessage = document.getElementById('sync-message');

  const statsList = document.getElementById('stats-list');
  const statsCount = document.getElementById('stats-count');
  const statsMessage = document.getElementById('stats-message');

  // 被拦截记录
  const blockedList = document.getElementById('blocked-list');
  const blockedCount = document.getElementById('blocked-count');
  const blockedMessage = document.getElementById('blocked-message');

  // 右下角提示
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  let toastTimer = null;

  // 推荐 UP 主导入
  const recommendModal = document.getElementById('recommend-modal');
  const btnImportRecommend = document.getElementById('btn-import-recommend');
  const recommendSelectAll = document.getElementById('recommend-select-all');
  const recommendList = document.getElementById('recommend-list');
  const recommendCount = document.getElementById('recommend-count');
  const btnConfirmImport = document.getElementById('btn-confirm-import');
  const btnCancelImport = document.getElementById('btn-cancel-import');
  const recommendMessage = document.getElementById('recommend-message');

  let recommendUpsCache = [];

  // 配置密码验证遮罩层
  const configLockOverlay = document.getElementById('config-lock-overlay');
  const lockTitle = document.getElementById('lock-title');
  const lockDesc = document.getElementById('lock-desc');
  const lockPasswordGroup = document.getElementById('lock-password-group');
  const lockPassword = document.getElementById('lock-password');
  const btnVerifyConfig = document.getElementById('btn-verify-config');
  const btnLockRelogin = document.getElementById('btn-lock-relogin');
  const lockMessage = document.getElementById('lock-message');

  // 临时解锁
  const btnGenerateUnlockCode = document.getElementById('btn-generate-unlock-code');
  const unlockCodeDisplay = document.getElementById('unlock-code-display');
  const unlockCodeMessage = document.getElementById('unlock-code-message');

  // 退出登录
  const btnLogout = document.getElementById('btn-logout');

  // 会员状态
  const membershipExpireTime = document.getElementById('membership-expire-time');
  const btnRefreshExpire = document.getElementById('btn-refresh-expire');
  const plansRow = document.getElementById('plans-row');
  const planCardFree = document.getElementById('plan-card-free');
  const planCardPremium = document.getElementById('plan-card-premium');
  const planCardLifetime = document.getElementById('plan-card-lifetime');

  let cachedConfigPassword = '';

  const domainSwitches = document.getElementById('domain-switches');
  const btnEnableAllChannels = document.getElementById('btn-enable-all-channels');
  const btnDisableAllChannels = document.getElementById('btn-disable-all-channels');
  const switches = {};
  const statuses = {};

  function renderDomainSwitches() {
    if (!domainSwitches || typeof CHANNEL_RULES === 'undefined') return;
    domainSwitches.innerHTML = '';
    for (const rule of CHANNEL_RULES) {
      const item = document.createElement('div');
      item.className = 'switch-item';

      const label = document.createElement('label');
      label.htmlFor = `switch-${rule.key}`;
      label.textContent = rule.name;

      const wrap = document.createElement('div');
      wrap.className = 'switch-wrap';

      const switchLabel = document.createElement('label');
      switchLabel.className = 'switch';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `switch-${rule.key}`;
      switches[rule.key] = input;

      const slider = document.createElement('span');
      slider.className = 'slider';

      switchLabel.appendChild(input);
      switchLabel.appendChild(slider);

      const status = document.createElement('span');
      status.id = `status-${rule.key}`;
      status.className = 'status-text block';
      status.textContent = '拦截';
      statuses[rule.key] = status;

      wrap.appendChild(switchLabel);
      wrap.appendChild(status);

      item.appendChild(label);
      item.appendChild(wrap);

      domainSwitches.appendChild(item);
      input.addEventListener('change', saveDomainRules);
    }
  }

  function updateStatusText(key) {
    const el = statuses[key];
    const checked = switches[key].checked;
    if (el) {
      el.textContent = checked ? '放行' : '拦截';
      el.className = checked ? 'status-text allow' : 'status-text block';
    }
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = `message ${type}`;
    el.classList.remove('hidden');
  }

  function showToast(text, type = 'error') {
    toastMessage.textContent = text;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  function hideMessage(el) {
    el.className = 'message hidden';
  }

  async function loadWhitelist() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
      const whitelist = response?.data || { upIds: [], upNames: [], bvIds: [], ssIds: [], ssNames: [] };
      renderUpList(whitelist);
      renderBvList(whitelist.bvIds);
      renderSsList(whitelist);
    } catch (e) {
      console.error('加载白名单失败', e);
    }
  }

  async function loadBlacklist() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getBlacklist' });
      const blacklist = response?.data || { upIds: [], upNames: [], bvIds: [] };
      renderBlackUpList(blacklist);
      renderBlackBvList(blacklist.bvIds);
    } catch (e) {
      console.error('加载黑名单失败', e);
    }
  }

  function renderBlackUpList(blacklist) {
    const upIds = blacklist?.upIds || [];
    const upNames = blacklist?.upNames || [];
    blackUpList.innerHTML = '';
    if (!upIds || upIds.length === 0) {
      blackUpList.innerHTML = '<li class="empty-tip">暂无黑名单UP主</li>';
      return;
    }
    for (let i = 0; i < upIds.length; i++) {
      const id = upIds[i];
      const name = upNames[i] || '';
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(name ? name + ' (' + id + ')' : id)}</span>`;
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = '删除';
      delBtn.addEventListener('click', () => removeBlackUpId(id));
      li.appendChild(delBtn);
      blackUpList.appendChild(li);
    }
  }

  function renderBlackBvList(bvIds) {
    blackBvList.innerHTML = '';
    if (!bvIds || bvIds.length === 0) {
      blackBvList.innerHTML = '<li class="empty-tip">暂无黑名单BV号</li>';
      return;
    }
    for (const id of bvIds) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(id)}</span>`;
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = '删除';
      delBtn.addEventListener('click', () => removeBlackBvId(id));
      li.appendChild(delBtn);
      blackBvList.appendChild(li);
    }
  }

  async function removeBlackUpId(upId) {
    await chrome.runtime.sendMessage({ action: 'removeBlackUpId', upId });
    const response = await chrome.runtime.sendMessage({ action: 'getBlacklist' });
    renderBlackUpList(response?.data);
    await pushCurrentBlacklist();
  }

  async function removeBlackBvId(bvId) {
    await chrome.runtime.sendMessage({ action: 'removeBlackBvId', bvId });
    const response = await chrome.runtime.sendMessage({ action: 'getBlacklist' });
    renderBlackBvList(response?.data?.bvIds || []);
    await pushCurrentBlacklist();
  }

  async function addBlackUpId() {
    const value = blackUpInput.value.trim();
    if (!value) return;
    if (!/^\d+$/.test(value)) {
      showToast('UP主ID应为纯数字', 'error');
      return;
    }
    let upName = blackUpNameInput.value.trim();
    if (!upName) {
      upName = await fetchUpName(value);
    }
    await chrome.runtime.sendMessage({ action: 'addBlackUpId', upId: value, upName });
    blackUpInput.value = '';
    blackUpNameInput.value = '';
    const response = await chrome.runtime.sendMessage({ action: 'getBlacklist' });
    renderBlackUpList(response?.data);
    await pushCurrentBlacklist();
  }

  async function addBlackBvId() {
    const value = blackBvInput.value.trim();
    if (!value) return;
    if (!/^BV[0-9A-Za-z]+$/.test(value)) {
      showToast('BV号格式不正确（如 BV1YERYBDEES）', 'error');
      return;
    }
    await chrome.runtime.sendMessage({ action: 'addBlackBvId', bvId: value });
    blackBvInput.value = '';
    const response = await chrome.runtime.sendMessage({ action: 'getBlacklist' });
    renderBlackBvList(response?.data?.bvIds || []);
    await pushCurrentBlacklist();
  }

  async function loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      const settings = response?.data || {};
      const rules = settings.domainRules || {};
      for (const rule of CHANNEL_RULES) {
        const key = rule.key;
        if (switches[key]) {
          switches[key].checked = !!rules[key];
        }
        updateStatusText(key);
      }
    } catch (e) {
      console.error('加载设置失败', e);
    }
  }

  function renderUpList(whitelist) {
    const upIds = whitelist?.upIds || [];
    const upNames = whitelist?.upNames || [];
    upList.innerHTML = '';
    if (!upIds || upIds.length === 0) {
      upList.innerHTML = '<li class="empty-tip">暂无UP主</li>';
      return;
    }
    for (let i = 0; i < upIds.length; i++) {
      const id = upIds[i];
      const name = upNames[i] || '';
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(name ? name + ' (' + id + ')' : id)}</span>`;
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = '删除';
      delBtn.addEventListener('click', () => removeUpId(id));
      li.appendChild(delBtn);
      upList.appendChild(li);
    }
  }

  function renderBvList(bvIds) {
    bvList.innerHTML = '';
    if (!bvIds || bvIds.length === 0) {
      bvList.innerHTML = '<li class="empty-tip">暂无BV号</li>';
      return;
    }
    for (const id of bvIds) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(id)}</span>`;
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = '删除';
      delBtn.addEventListener('click', () => removeBvId(id));
      li.appendChild(delBtn);
      bvList.appendChild(li);
    }
  }

  async function removeUpId(upId) {
    await chrome.runtime.sendMessage({ action: 'removeUpId', upId });
    const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
    renderUpList(response?.data);
    await pushCurrentWhitelist();
  }

  async function removeBvId(bvId) {
    await chrome.runtime.sendMessage({ action: 'removeBvId', bvId });
    const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
    renderBvList(response?.data?.bvIds || []);
    await pushCurrentWhitelist();
  }

  async function fetchUpName(upId) {
    try {
      const res = await fetch(`https://api.bilibili.com/x/web-interface/card?mid=${upId}`);
      const data = await res.json();
      if (data.code === 0 && data.data?.card?.name) {
        return data.data.card.name;
      }
    } catch (e) {
      console.error('获取UP主名字失败', e);
    }
    return '';
  }

  async function addUpId() {
    const value = upInput.value.trim();
    if (!value) return;
    if (!/^\d+$/.test(value)) {
      showToast('UP主ID应为纯数字', 'error');
      return;
    }
    const upName = await fetchUpName(value);
    await chrome.runtime.sendMessage({ action: 'addUpId', upId: value, upName });
    upInput.value = '';
    const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
    renderUpList(response?.data);
    await pushCurrentWhitelist();
  }

  async function addBvId() {
    const value = bvInput.value.trim();
    console.log('[哔哩护苗 Options] 添加 BV 号:', value);
    if (!value) return;
    if (!/^BV[0-9A-Za-z]+$/.test(value)) {
      showToast('BV号格式不正确（如 BV1YERYBDEES）', 'error');
      return;
    }
    await chrome.runtime.sendMessage({ action: 'addBvId', bvId: value });
    bvInput.value = '';
    const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
    console.log('[哔哩护苗 Options] getWhitelist 返回:', response?.data);
    renderBvList(response?.data?.bvIds || []);
    await pushCurrentWhitelist();
  }

  function renderSsList(whitelist) {
    const ssIds = whitelist?.ssIds || [];
    const ssNames = whitelist?.ssNames || [];
    ssList.innerHTML = '';
    if (!ssIds || ssIds.length === 0) {
      ssList.innerHTML = '<li class="empty-tip">暂无番剧</li>';
      return;
    }
    for (let i = 0; i < ssIds.length; i++) {
      const id = ssIds[i];
      const name = ssNames[i] || '';
      const li = document.createElement('li');
      li.innerHTML = `<span>${escapeHtml(name ? name + ' (' + id + ')' : id)}</span>`;
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = '删除';
      delBtn.addEventListener('click', () => removeSsId(id));
      li.appendChild(delBtn);
      ssList.appendChild(li);
    }
  }

  async function removeSsId(ssId) {
    await chrome.runtime.sendMessage({ action: 'removeSsId', ssId });
    const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
    renderSsList(response?.data);
    await pushCurrentWhitelist();
  }

  async function addSsId() {
    let value = ssInput.value.trim().toLowerCase();
    if (!value) return;
    let toStore = null;
    let autoName = '';
    if (/^(ss|md)\d+$/.test(value)) {
      toStore = value;
    } else if (/^ep\d+$/.test(value)) {
      const resp = await chrome.runtime.sendMessage({ action: 'getSeasonId', epId: value.slice(2) });
      toStore = resp?.data?.md || resp?.data?.ss;
      autoName = resp?.data?.name || '';
      if (!toStore) {
        showToast('ep 号反查失败，请检查网络或改填 md/ss 号', 'error');
        return;
      }
    } else {
      showToast('请填写 md/ss/ep 号（如 md28229233、ss12345、ep3781141）', 'error');
      return;
    }
    const ssName = ssNameInput.value.trim() || autoName;
    await chrome.runtime.sendMessage({ action: 'addSsId', ssId: toStore, ssName });
    ssInput.value = '';
    ssNameInput.value = '';
    const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
    renderSsList(response?.data);
    await pushCurrentWhitelist();
  }

  async function pushCurrentWhitelist() {
    console.log('[哔哩护苗 Options] pushCurrentWhitelist 被调用');
    if (!cachedConfigPassword) {
      console.log('[哔哩护苗 Options] 无缓存配置密码，跳过推送');
      return;
    }
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
      console.log('[哔哩护苗 Options] 推送前 whitelist:', response?.data);
      const raw = response?.data || {};
      const whitelist = {
        upIds: Array.isArray(raw.upIds) ? raw.upIds : [],
        upNames: Array.isArray(raw.upNames) ? raw.upNames : [],
        bvIds: Array.isArray(raw.bvIds) ? raw.bvIds : [],
        ssIds: Array.isArray(raw.ssIds) ? raw.ssIds : [],
        ssNames: Array.isArray(raw.ssNames) ? raw.ssNames : []
      };
      console.log('[哔哩护苗 Options] 构造后的 whitelist:', whitelist);
      const result = await api.saveWhitelist(whitelist, cachedConfigPassword);
      console.log('[哔哩护苗 Options] saveWhitelist 结果:', result);
      if (result.success) {
        const wlResult = await api.getWhitelist();
        console.log('[哔哩护苗 Options] 拉取结果:', wlResult);
        if (wlResult.success && wlResult.data) {
          await chrome.runtime.sendMessage({ action: 'setWhitelist', whitelist: wlResult.data });
        }
      } else {
        console.error('[哔哩护苗] 自动同步白名单失败:', result.message);
      }
    } catch (e) {
      console.error('[哔哩护苗] 自动同步白名单异常', e);
    }
  }

  async function pushCurrentBlacklist() {
    console.log('[哔哩护苗 Options] pushCurrentBlacklist 被调用');
    if (!cachedConfigPassword) {
      console.log('[哔哩护苗 Options] 无缓存配置密码，跳过推送黑名单');
      return;
    }
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getBlacklist' });
      console.log('[哔哩护苗 Options] 推送前 blacklist:', response?.data);
      const raw = response?.data || {};
      const blacklist = {
        upIds: Array.isArray(raw.upIds) ? raw.upIds : [],
        upNames: Array.isArray(raw.upNames) ? raw.upNames : [],
        bvIds: Array.isArray(raw.bvIds) ? raw.bvIds : []
      };
      console.log('[哔哩护苗 Options] 构造后的 blacklist:', blacklist);
      const result = await api.saveBlacklist(blacklist, cachedConfigPassword);
      console.log('[哔哩护苗 Options] saveBlacklist 结果:', result);
      if (result.success) {
        const blResult = await api.getBlacklist();
        console.log('[哔哩护苗 Options] 拉取黑名单结果:', blResult);
        if (blResult.success && blResult.data) {
          await chrome.runtime.sendMessage({ action: 'setBlacklist', blacklist: blResult.data });
        }
      } else {
        console.error('[哔哩护苗] 自动同步黑名单失败:', result.message);
      }
    } catch (e) {
      console.error('[哔哩护苗] 自动同步黑名单异常', e);
    }
  }

  async function saveDomainRules() {
    const rules = {};
    for (const rule of CHANNEL_RULES) {
      const key = rule.key;
      rules[key] = switches[key].checked;
      updateStatusText(key);
    }
    await chrome.runtime.sendMessage({ action: 'setDomainRules', rules });
    // 同步推送到云端，使管理端能立即看到更新
    if (cachedConfigPassword) {
      try {
        const result = await api.saveSettings({ domainRules: rules }, cachedConfigPassword);
        if (!result.success) {
          console.error('[哔哩护苗 Options] 推送频道规则失败:', result.message);
        } else {
          console.log('[哔哩护苗 Options] 频道规则已推送到云端:', rules);
        }
      } catch (e) {
        console.error('[哔哩护苗 Options] 推送频道规则异常:', e);
      }
    }
  }

  async function setAllChannels(enabled) {
    for (const rule of CHANNEL_RULES) {
      const input = switches[rule.key];
      if (input) {
        input.checked = enabled;
        updateStatusText(rule.key);
      }
    }
    await saveDomainRules();
    showToast(enabled ? '已全部放行' : '已全部拦截', 'success');
  }

  if (btnEnableAllChannels) {
    btnEnableAllChannels.addEventListener('click', () => setAllChannels(true));
  }
  if (btnDisableAllChannels) {
    btnDisableAllChannels.addEventListener('click', () => setAllChannels(false));
  }

  // ========== 工作模式 ==========
  const modeTypeInputs = document.querySelectorAll('input[name="mode-type"]');
  const timeRangesSection = document.getElementById('time-ranges-section');
  const timeRangesList = document.getElementById('time-ranges-list');
  const btnAddTimeRange = document.getElementById('btn-add-time-range');
  const btnSaveMode = document.getElementById('btn-save-mode');
  let currentMode = { type: 'strict', timeRanges: [] };
  let modeDirty = false;

  function renderMode() {
    const input = document.querySelector(`input[name="mode-type"][value="${currentMode.type}"]`);
    if (input) input.checked = true;
    if (timeRangesSection) {
      timeRangesSection.classList.toggle('hidden', currentMode.type !== 'timed');
    }
    renderTimeRanges();
  }

  function renderTimeRanges() {
    if (!timeRangesList) return;
    timeRangesList.innerHTML = '';
    const ranges = Array.isArray(currentMode.timeRanges) ? currentMode.timeRanges : [];
    if (ranges.length === 0) {
      timeRangesList.innerHTML = '<p class="small-text">尚未添加时段</p>';
      return;
    }
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
    ranges.forEach((range, index) => {
      const el = document.createElement('div');
      el.className = 'time-range-item';
      const days = Array.isArray(range.days) ? range.days : [];
      const dayChecks = [1, 2, 3, 4, 5, 6, 0].map(d => {
        const checked = days.includes(d) ? 'checked' : '';
        return `<label class="day-check"><input type="checkbox" data-idx="${index}" data-day="${d}" ${checked}>${dayLabels[d]}</label>`;
      }).join('');
      el.innerHTML = `
        <div class="day-row">${dayChecks}</div>
        <div class="time-row">
          <input type="time" data-idx="${index}" data-field="start" value="${escapeHtml(range.start || '00:00')}">
          <span>至</span>
          <input type="time" data-idx="${index}" data-field="end" value="${escapeHtml(range.end || '00:00')}">
          <button class="btn btn-danger btn-small" data-remove-idx="${index}">删除</button>
        </div>
      `;
      timeRangesList.appendChild(el);
    });

    timeRangesList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', updateTimeRangeFromDom);
    });
    timeRangesList.querySelectorAll('input[type="time"]').forEach(input => {
      input.addEventListener('change', updateTimeRangeFromDom);
    });
    timeRangesList.querySelectorAll('[data-remove-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.removeIdx, 10);
        currentMode.timeRanges.splice(idx, 1);
        renderTimeRanges();
      });
    });
  }

  function updateTimeRangeFromDom() {
    const ranges = [];
    timeRangesList.querySelectorAll('.time-range-item').forEach((item) => {
      const days = [];
      item.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        days.push(parseInt(cb.dataset.day, 10));
      });
      const start = item.querySelector('input[type="time"][data-field="start"]')?.value || '00:00';
      const end = item.querySelector('input[type="time"][data-field="end"]')?.value || '00:00';
      ranges.push({ days, start, end });
    });
    currentMode.timeRanges = ranges;
  }

  async function loadMode() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getMode' });
      const mode = response?.data || {};
      console.log('[Mode Load] background 返回:', mode);
      if (modeDirty) {
        console.log('[Mode Load] 用户已操作过模式，跳过覆盖');
        return;
      }
      currentMode = {
        type: ['strict', 'lenient', 'timed'].includes(mode.type) ? mode.type : 'strict',
        timeRanges: Array.isArray(mode.timeRanges) ? mode.timeRanges : []
      };
      renderMode();
    } catch (e) {
      console.error('加载模式失败', e);
    }
  }

  async function saveMode() {
    updateTimeRangeFromDom();
    console.log('[Mode Save] 当前模式:', currentMode);
    await chrome.runtime.sendMessage({ action: 'setMode', mode: currentMode });
    try {
      const result = await api.saveMode(currentMode);
      console.log('[Mode Save] 后端返回:', result);
      if (result.success) {
        modeDirty = false;
        showToast('模式已保存', 'success');
        await chrome.runtime.sendMessage({ action: 'syncFromBackend' });
        await loadMode();
      } else {
        showToast(result.message || '保存失败', 'error');
      }
    } catch (e) {
      console.error('[哔哩护苗 Options] 推送模式失败:', e);
      showToast('保存失败', 'error');
    }
  }

  if (modeTypeInputs) {
    modeTypeInputs.forEach(input => {
      input.addEventListener('change', () => {
        modeDirty = true;
        currentMode.type = input.value;
        renderMode();
      });
    });
  }
  if (btnAddTimeRange) {
    btnAddTimeRange.addEventListener('click', () => {
      modeDirty = true;
      if (!Array.isArray(currentMode.timeRanges)) currentMode.timeRanges = [];
      currentMode.timeRanges.push({ days: [1, 2, 3, 4, 5], start: '16:00', end: '20:00' });
      renderTimeRanges();
    });
  }
  if (btnSaveMode) {
    btnSaveMode.addEventListener('click', saveMode);
  }

  async function pullWhitelist() {
    hideMessage(syncMessage);
    try {
      const authRes = await chrome.runtime.sendMessage({ action: 'getAuth' });
      const token = authRes?.data?.token;
      if (!token) {
        showMessage(syncMessage, '请先登录', 'error');
        return;
      }
      api.setTokens(token, authRes?.data?.refreshToken);
      const wlResult = await api.getWhitelist();
      const stResult = await api.getSettings();
      if (wlResult.success) {
        await chrome.runtime.sendMessage({ action: 'setWhitelist', whitelist: wlResult.data });
        await loadWhitelist();
      }
      if (stResult.success) {
        await chrome.runtime.sendMessage({ action: 'setSettings', settings: stResult.data });
        await loadSettings();
      }
      if (wlResult.success || stResult.success) {
        console.log('[哔哩护苗 Options] 手动拉取成功');
        showMessage(syncMessage, '拉取成功', 'success');
      } else {
        showMessage(syncMessage, wlResult.message || stResult.message || '拉取失败', 'error');
      }
    } catch (e) {
      showMessage(syncMessage, '拉取失败: ' + e.message, 'error');
    }
  }

  async function pushWhitelist() {
    hideMessage(syncMessage);
    try {
      const authRes = await chrome.runtime.sendMessage({ action: 'getAuth' });
      const token = authRes?.data?.token;
      if (!token) {
        showMessage(syncMessage, '请先登录', 'error');
        return;
      }
      api.setTokens(token, authRes?.data?.refreshToken);
      const configPassword = window.prompt('请输入配置密码以确认推送');
      if (!configPassword) {
        return;
      }
      const wlResponse = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
      const whitelist = wlResponse?.data;
      const stResponse = await chrome.runtime.sendMessage({ action: 'getSettings' });
      const settings = stResponse?.data;
      const wlResult = await api.saveWhitelist(whitelist, configPassword);
      const stResult = await api.saveSettings(settings, configPassword);
      if (wlResult.success && stResult.success) {
        showMessage(syncMessage, '推送成功', 'success');
      } else {
        showMessage(syncMessage, wlResult.message || stResult.message || '推送失败', 'error');
      }
    } catch (e) {
      showMessage(syncMessage, '推送失败: ' + e.message, 'error');
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== 推荐 UP 主一键导入 ==========
  async function loadRecommendUps() {
    if (recommendUpsCache.length > 0) return recommendUpsCache;
    const url = chrome.runtime.getURL('recommend-ups.json');
    const res = await fetch(url);
    if (!res.ok) throw new Error('加载推荐列表失败');
    recommendUpsCache = await res.json();
    return recommendUpsCache;
  }

  async function getCurrentWhitelist() {
    const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
    const raw = response?.data || {};
    return {
      upIds: Array.isArray(raw.upIds) ? raw.upIds : [],
      upNames: Array.isArray(raw.upNames) ? raw.upNames : [],
      bvIds: Array.isArray(raw.bvIds) ? raw.bvIds : [],
      ssIds: Array.isArray(raw.ssIds) ? raw.ssIds : [],
      ssNames: Array.isArray(raw.ssNames) ? raw.ssNames : []
    };
  }

  function renderRecommendList(ups, currentWhitelist) {
    recommendList.innerHTML = '';
    const existingIds = new Set(currentWhitelist.upIds || []);
    if (!ups || !ups.length) {
      recommendList.innerHTML = '<div class="empty-tip">暂无推荐数据</div>';
      recommendCount.textContent = '已选 0 / 0';
      return;
    }
    for (const up of ups) {
      const alreadyAdded = existingIds.has(up.uid);
      const item = document.createElement('label');
      item.className = 'recommend-item' + (alreadyAdded ? ' already-added' : '');
      item.innerHTML = `
        <input type="checkbox" value="${escapeHtml(up.uid)}" ${alreadyAdded ? 'disabled' : ''}>
        <div class="recommend-item-info">
          <div class="recommend-item-title">${escapeHtml(up.name)}</div>
          <div class="recommend-item-meta">
            <span>UID: ${escapeHtml(up.uid)}</span>
            <span>${escapeHtml(up.category)}</span>
            <span>${escapeHtml(up.ageRange)}</span>
          </div>
          <div class="recommend-item-reason">${escapeHtml(up.reason)}</div>
        </div>
      `;
      recommendList.appendChild(item);
    }
    updateRecommendCount();
  }

  function getSelectedRecommendIds() {
    return Array.from(recommendList.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)')).map(cb => cb.value);
  }

  function updateRecommendCount() {
    const total = recommendList.querySelectorAll('input[type="checkbox"]:not(:disabled)').length;
    const selected = getSelectedRecommendIds().length;
    recommendCount.textContent = `已选 ${selected} / ${total}`;
  }

  async function openRecommendModal() {
    hideMessage(recommendMessage);
    recommendSelectAll.checked = false;
    btnConfirmImport.disabled = true;
    btnConfirmImport.textContent = '加载中...';
    recommendModal.classList.remove('hidden');
    try {
      const [ups, currentWhitelist] = await Promise.all([
        loadRecommendUps(),
        getCurrentWhitelist()
      ]);
      renderRecommendList(ups, currentWhitelist);
      btnConfirmImport.disabled = false;
      btnConfirmImport.textContent = '导入选中';
    } catch (e) {
      showMessage(recommendMessage, '加载推荐列表失败: ' + e.message, 'error');
      btnConfirmImport.textContent = '导入选中';
    }
  }

  function closeRecommendModal() {
    recommendModal.classList.add('hidden');
  }

  async function importSelectedUps() {
    const selectedIds = getSelectedRecommendIds();
    if (!selectedIds.length) {
      showMessage(recommendMessage, '请至少选择一位 UP 主', 'error');
      return;
    }
    const ups = await loadRecommendUps();
    const upsById = Object.fromEntries(ups.map(u => [u.uid, u]));
    for (const uid of selectedIds) {
      await chrome.runtime.sendMessage({ action: 'addUpId', upId: uid, upName: upsById[uid]?.name || '' });
    }
    const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
    renderUpList(response?.data);
    await pushCurrentWhitelist();
    showMessage(recommendMessage, `成功导入 ${selectedIds.length} 位 UP 主`, 'success');
    setTimeout(closeRecommendModal, 800);
    showToast('导入成功', 'success');
  }

  recommendList.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      updateRecommendCount();
      const selected = getSelectedRecommendIds().length;
      const total = recommendList.querySelectorAll('input[type="checkbox"]:not(:disabled)').length;
      recommendSelectAll.checked = selected > 0 && selected === total;
    }
  });

  recommendSelectAll.addEventListener('change', () => {
    const checkboxes = recommendList.querySelectorAll('input[type="checkbox"]:not(:disabled)');
    for (const cb of checkboxes) {
      cb.checked = recommendSelectAll.checked;
    }
    updateRecommendCount();
  });

  if (btnImportRecommend) {
    btnImportRecommend.addEventListener('click', openRecommendModal);
  }
  if (btnCancelImport) {
    btnCancelImport.addEventListener('click', closeRecommendModal);
  }
  if (btnConfirmImport) {
    btnConfirmImport.addEventListener('click', importSelectedUps);
  }

  function formatBlockedReason(reason) {
    if (!reason) return '未知';
    if (reason === 'not-in-whitelist') return '不在白名单';
    if (reason.startsWith('channel:')) {
      const key = reason.replace('channel:', '');
      const rule = CHANNEL_RULES.find(r => r.key === key);
      return rule ? `${rule.name}频道拦截` : '频道拦截';
    }
    return reason;
  }

  async function loadBlockedVideos() {
    try {
      const userId = await getCurrentUserId();
      console.log('[哔哩护苗 Options] 加载被拦截记录, userId:', userId);
      const response = await chrome.runtime.sendMessage({ action: 'getBlockedVideos' });
      console.log('[哔哩护苗 Options] getBlockedVideos 返回:', response);
      if (!response?.success) {
        showMessage(blockedMessage, response?.message || '读取拦截记录失败', 'error');
        return;
      }
      const list = response?.data || [];
      renderBlockedList(list);
    } catch (e) {
      console.error('加载拦截记录失败', e);
      showMessage(blockedMessage, '加载拦截记录失败: ' + e.message, 'error');
    }
  }

  function getBilibiliUrl(bvId, url) {
    if (bvId) return `https://www.bilibili.com/video/${bvId}`;
    if (url && url.includes('bilibili.com')) return url;
    return '';
  }

  function renderBlockedList(list) {
    console.log('[哔哩护苗 Options] 渲染被拦截记录，条数:', list.length);
    blockedCount.textContent = `共 ${list.length} 条记录`;
    blockedList.innerHTML = '';
    if (!list || list.length === 0) {
      blockedList.innerHTML = '<div class="empty-tip">暂无被拦截记录</div>';
      return;
    }
    for (const item of list) {
      const el = document.createElement('div');
      el.className = 'stat-item';
      const title = escapeHtml(item.title || '未知页面');
      const upName = escapeHtml(item.upName || '未知UP主');
      const bv = escapeHtml(item.bvId || '');
      const when = formatDate(item.blockedAt);
      const reason = formatBlockedReason(item.reason);
      const url = escapeHtml(item.url || '');
      const biliUrl = getBilibiliUrl(item.bvId, item.url);
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
          <div class="stat-times">${url ? `<a href="${url}" target="_blank" style="color:#00a1d6;">${url}</a>` : ''}</div>
        </div>
        <div class="stat-duration">
          <div class="stat-when">${when}</div>
          ${openBtn}
        </div>
      `;
      blockedList.appendChild(el);
    }
  }

  // ---------- 观看统计 ----------

  function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0秒';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}时${m}分${s}秒`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  }

  function formatDate(ts) {
    if (!ts) return '--';
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  async function loadVideoStats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getVideoStats' });
      const stats = response?.data || [];
      renderStatsList(stats);
    } catch (e) {
      console.error('加载统计失败', e);
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
      const opened = formatDate(s.openedAt);
      const started = s.startedAt ? formatDate(s.startedAt) : '未开始';
      const closed = s.closedAt ? formatDate(s.closedAt) : '未关闭';
      const biliUrl = getBilibiliUrl(s.bvId, null);
      const openBtn = biliUrl
        ? `<a href="${biliUrl}" target="_blank" class="btn btn-small btn-primary" style="margin-top:6px;">去B站看</a>`
        : '';

      item.innerHTML = `
        <div class="stat-main">
          <div class="stat-title" title="${title}">${title}${playedBadge}</div>
          <div class="stat-meta">
            <span class="stat-up">${upName}</span>
            <span class="stat-bv">${bv}</span>
          </div>
          <div class="stat-times">打开 ${opened} · 开始 ${started} · 关闭 ${closed}</div>
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

  btnAddUp.addEventListener('click', addUpId);
  upInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addUpId(); });

  btnAddBv.addEventListener('click', addBvId);
  bvInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBvId(); });
  btnAddSs.addEventListener('click', addSsId);
  ssInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addSsId(); });
  ssNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addSsId(); });

  if (btnAddBlackUp) btnAddBlackUp.addEventListener('click', addBlackUpId);
  if (blackUpInput) blackUpInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBlackUpId(); });
  if (blackUpNameInput) blackUpNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBlackUpId(); });
  if (btnAddBlackBv) btnAddBlackBv.addEventListener('click', addBlackBvId);
  if (blackBvInput) blackBvInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBlackBvId(); });

  if (btnPull) btnPull.addEventListener('click', pullWhitelist);
  if (btnPush) btnPush.addEventListener('click', pushWhitelist);

  async function generateUnlockCode() {
    hideMessage(unlockCodeMessage);
    unlockCodeDisplay.classList.add('hidden');
    try {
      const authRes = await chrome.runtime.sendMessage({ action: 'getAuth' });
      const token = authRes?.data?.token;
      if (!token) {
        showMessage(unlockCodeMessage, '请先登录', 'error');
        return;
      }
      api.setTokens(token, authRes?.data?.refreshToken);
      btnGenerateUnlockCode.disabled = true;
      btnGenerateUnlockCode.textContent = '生成中...';
      const result = await api.generateTempUnlockCode();
      btnGenerateUnlockCode.disabled = false;
      btnGenerateUnlockCode.textContent = '生成解锁密码';
      if (result.success && result.data?.code) {
        unlockCodeDisplay.textContent = result.data.code;
        unlockCodeDisplay.classList.remove('hidden');
        const minutes = Math.max(1, Math.round((result.data.durationSeconds || 900) / 60));
        showMessage(unlockCodeMessage, `解锁后可观看 ${minutes} 分钟`, 'success');
      } else {
        showMessage(unlockCodeMessage, result.message || '生成失败', 'error');
      }
    } catch (e) {
      btnGenerateUnlockCode.disabled = false;
      btnGenerateUnlockCode.textContent = '生成解锁密码';
      showMessage(unlockCodeMessage, '生成异常: ' + e.message, 'error');
    }
  }

  if (btnGenerateUnlockCode) btnGenerateUnlockCode.addEventListener('click', generateUnlockCode);

  function setPlanVisibility(isActive) {
    if (planCardFree) planCardFree.style.display = isActive ? 'none' : '';
    if (planCardPremium) planCardPremium.style.display = isActive ? 'none' : '';
    if (planCardLifetime) planCardLifetime.style.display = '';
    if (plansRow) {
      plansRow.style.display = '';
      plansRow.style.gridTemplateColumns = isActive ? '1fr' : '';
    }
  }

  // 会员状态
  async function loadMembershipExpire() {
    if (!membershipExpireTime) return;
    try {
      const authRes = await chrome.runtime.sendMessage({ action: 'getAuth' });
      const token = authRes?.data?.token;
      if (!token) {
        membershipExpireTime.textContent = '未登录';
        setPlanVisibility(false);
        return;
      }
      api.setTokens(token, authRes?.data?.refreshToken);
      const result = await api.getUserInfo();
      if (result.success && result.data) {
        const expireTime = result.data.expireTime;
        const isActive = expireTime && expireTime > Date.now();
        membershipExpireTime.textContent = isActive ? formatDate(expireTime) : '未开通会员';
        setPlanVisibility(isActive);
      } else {
        membershipExpireTime.textContent = '获取失败';
        setPlanVisibility(false);
      }
    } catch (e) {
      console.error('加载会员信息失败', e);
      membershipExpireTime.textContent = '获取失败';
      if (plansRow) plansRow.style.display = '';
    }
  }

  if (btnRefreshExpire) {
    btnRefreshExpire.addEventListener('click', async () => {
      btnRefreshExpire.disabled = true;
      btnRefreshExpire.textContent = '刷新中...';
      await loadMembershipExpire();
      btnRefreshExpire.disabled = false;
      btnRefreshExpire.textContent = '刷新';
    });
  }

  // 支付页面跳转
  async function openPaymentPage(e) {
    const plan = e?.target?.dataset?.plan || 'premium';
    try {
      const authRes = await chrome.runtime.sendMessage({ action: 'getAuth' });
      const token = authRes?.data?.token;
      if (!token) {
        showToast('请先登录', 'error');
        return;
      }
      api.setTokens(token, authRes?.data?.refreshToken);
      const result = await api.createCheckoutSession(plan, 'https://main.biliguard.pages.dev/index.html#account', 'https://main.biliguard.pages.dev/index.html#account');
      if (result.success && result.data?.url) {
        window.open(result.data.url, '_blank');
      } else {
        showToast(result.message || '创建支付会话失败', 'error');
      }
    } catch (e) {
      console.error('打开支付页面失败', e);
      showToast('支付跳转失败: ' + e.message, 'error');
    }
  }

  const btnPayPremium = document.getElementById('btn-pay-premium');
  const btnPayLifetime = document.getElementById('btn-pay-lifetime');
  if (btnPayPremium) {
    btnPayPremium.dataset.plan = 'premium';
    btnPayPremium.addEventListener('click', openPaymentPage);
  }
  if (btnPayLifetime) {
    btnPayLifetime.dataset.plan = 'lifetime';
    btnPayLifetime.addEventListener('click', openPaymentPage);
  }

  // ---------- 配置密码验证 ----------

  function showLockError(text) {
    lockMessage.textContent = text;
    lockMessage.className = 'message error';
    lockMessage.classList.remove('hidden');
  }

  function hideLockMessage() {
    lockMessage.className = 'message hidden';
  }

  function showLockNeedLogin(text) {
    lockTitle.textContent = '登录已过期';
    lockDesc.textContent = text || '请重新登录后再管理白名单和拦截规则';
    lockPasswordGroup.classList.add('hidden');
    btnVerifyConfig.classList.add('hidden');
    btnLockRelogin.classList.remove('hidden');
    hideLockMessage();
  }

  function showLockNeedPassword() {
    lockTitle.textContent = '验证配置密码';
    lockDesc.textContent = '管理白名单和拦截规则需要先验证配置密码';
    lockPasswordGroup.classList.remove('hidden');
    btnVerifyConfig.classList.remove('hidden');
    btnLockRelogin.classList.add('hidden');
    hideLockMessage();
  }

  function openLoginPage() {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  }

  async function verifyAndUnlock() {
    hideLockMessage();
    const pwd = lockPassword.value.trim();
    if (!pwd) {
      showLockError('请输入配置密码');
      return;
    }
    try {
      const authRes = await chrome.runtime.sendMessage({ action: 'getAuth' });
      const token = authRes?.data?.token;
      if (!token) {
        showLockNeedLogin('请先登录');
        return;
      }
      api.setTokens(token, authRes?.data?.refreshToken);
      const result = await api.verifyConfigPassword(pwd);
      if (result.success) {
        cachedConfigPassword = pwd;
        console.log('[哔哩护苗 Options] 配置密码验证通过，初始化页面');
        configLockOverlay.classList.add('hidden');
        initOptionsPage();
      } else {
        if (result.expired) {
          showLockNeedLogin(result.message);
        } else {
          showLockError(result.message || '配置密码错误');
        }
      }
    } catch (e) {
      showLockError('验证异常: ' + e.message);
    }
  }

  btnVerifyConfig.addEventListener('click', verifyAndUnlock);
  lockPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') verifyAndUnlock(); });
  if (btnLockRelogin) {
    btnLockRelogin.addEventListener('click', openLoginPage);
  }

  async function checkConfigLock() {
    try {
      const authRes = await chrome.runtime.sendMessage({ action: 'getAuth' });
      console.log('[哔哩护苗 Options] checkConfigLock auth:', authRes);
      if (!authRes?.data?.token) {
        configLockOverlay.classList.remove('hidden');
        showLockNeedLogin('请先登录');
        return;
      }
      // 未设置配置密码则直接放行
      if (authRes.data.hasConfigPassword === false) {
        console.log('[哔哩护苗 Options] 未设置配置密码，直接放行');
        configLockOverlay.classList.add('hidden');
        initOptionsPage();
        return;
      }
      // 需要验证配置密码
      console.log('[哔哩护苗 Options] 需要验证配置密码');
      showLockNeedPassword();
      configLockOverlay.classList.remove('hidden');
      lockPassword.focus();
    } catch (e) {
      console.error('[哔哩护苗 Options] checkConfigLock 异常', e);
      configLockOverlay.classList.remove('hidden');
      showLockNeedLogin('加载异常，请重新登录');
    }
  }

  async function initOptionsPage() {
    console.log('[哔哩护苗 Options] 初始化页面数据');
    // 先从云端同步一次，确保本地数据是最新的
    try {
      await chrome.runtime.sendMessage({ action: 'syncFromBackend' });
      console.log('[哔哩护苗 Options] 初始同步完成');
    } catch (e) {
      console.error('[哔哩护苗 Options] 初始同步失败:', e);
    }
    loadWhitelist();
    loadBlacklist();
    loadSettings();
    loadMode();
    loadMembershipExpire();
    loadVideoStats();
    loadBlockedVideos();
  }

  // token 过期统一处理
  window.addEventListener('tokenExpired', (e) => {
    configLockOverlay.classList.remove('hidden');
    showLockNeedLogin(e.detail || '登录已过期，请重新登录');
  });

  // 页面重新可见时检查登录状态（用户在 dashboard 登录后返回 options 可自动恢复）
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && btnLockRelogin && !btnLockRelogin.classList.contains('hidden')) {
      checkConfigLock();
    }
  });

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        await api.logout();
      } catch (e) {
        console.error('[哔哩护苗 Options] 登出请求失败', e);
      }
      await chrome.runtime.sendMessage({ action: 'logout' });
      // options 页面无法通过 window.close() 关闭，改为显示重新登录界面
      configLockOverlay.classList.remove('hidden');
      showLockNeedLogin('已退出登录，请重新登录');
    });
  }

  const contactModal = document.getElementById('contact-modal');
  const linkContact = document.getElementById('link-contact');
  const btnContactClose = document.getElementById('btn-contact-close');
  if (linkContact) {
    linkContact.addEventListener('click', (e) => {
      e.preventDefault();
      contactModal.classList.remove('hidden');
    });
  }
  if (btnContactClose) {
    btnContactClose.addEventListener('click', () => contactModal.classList.add('hidden'));
  }

  renderDomainSwitches();
  checkConfigLock();
});
