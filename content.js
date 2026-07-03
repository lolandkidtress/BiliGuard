// content.js - 内容脚本，B站页面拦截核心逻辑

(function () {
  'use strict';

  console.log('[哔哩护苗] content.js 已加载，URL:', window.location.href);

  const OVERLAY_ID = 'bili-guard-overlay';
  let overlayElement = null;
  let isChecking = false;
  let currentTracker = null;
  function isBilibiliHost(url) {
    return url.hostname.endsWith('bilibili.com');
  }

  const DOMAIN_RULES = {
    anime: {
      test: (url) => isBilibiliHost(url) && (url.pathname.startsWith('/anime') || url.pathname.startsWith('/bangumi')),
      name: '番剧'
    },
    movie: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/movie'),
      name: '电影'
    },
    guochuang: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/guochuang'),
      name: '国创'
    },
    tv: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/tv'),
      name: '电视剧'
    },
    variety: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/variety'),
      name: '综艺'
    },
    documentary: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/documentary'),
      name: '纪录片'
    },
    live: {
      test: (url) => url.hostname === 'live.bilibili.com',
      name: '直播'
    },
    manga: {
      test: (url) => url.hostname === 'manga.bilibili.com',
      name: '漫画'
    },
    match: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/match'),
      name: '赛事'
    },
    douga: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/douga'),
      name: '动画'
    },
    game: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/game'),
      name: '游戏'
    },
    kichiku: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/kichiku'),
      name: '鬼畜'
    },
    music: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/music'),
      name: '音乐'
    },
    dance: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/dance'),
      name: '舞蹈'
    },
    cinephile: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/cinephile'),
      name: '影视'
    },
    ent: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/ent'),
      name: '娱乐'
    },
    knowledge: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/knowledge'),
      name: '知识'
    },
    tech: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/tech'),
      name: '科技数码'
    },
    information: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/information'),
      name: '资讯'
    },
    food: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/food'),
      name: '美食'
    },
    shortplay: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/shortplay'),
      name: '小剧场'
    },
    car: {
      test: (url) => isBilibiliHost(url) && (url.pathname.startsWith('/c/car') || url.pathname.startsWith('/car')),
      name: '汽车'
    },
    fashion: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/fashion'),
      name: '时尚美妆'
    },
    sports: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/sports'),
      name: '体育运动'
    },
    animal: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/animal'),
      name: '动物'
    },
    vlog: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/vlog'),
      name: 'vlog'
    },
    painting: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/painting'),
      name: '绘画'
    },
    ai: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/ai'),
      name: '人工智能'
    },
    home: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/home'),
      name: '家装房产'
    },
    outdoors: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/outdoors'),
      name: '户外潮流'
    },
    gym: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/gym'),
      name: '健身'
    },
    handmake: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/handmake'),
      name: '手工'
    },
    travel: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/travel'),
      name: '旅游出行'
    },
    rural: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/rural'),
      name: '三农'
    },
    parenting: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/parenting'),
      name: '亲子'
    },
    health: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/health'),
      name: '健康'
    },
    emotion: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/emotion'),
      name: '情感'
    },
    lifeJoy: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/life_joy'),
      name: '生活兴趣'
    },
    lifeExperience: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/c/life_experience'),
      name: '生活经验'
    },
    charity: {
      test: (url) => url.hostname === 'love.bilibili.com',
      name: '公益'
    },
    uhd: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/blackboard/era/Vp41b8bsU9Wkog3X'),
      name: '超高清'
    },
    podcast: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/blackboard/era/jpyPhRRrMn3fmZ2B'),
      name: '视频播客'
    },
    read: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/read/home'),
      name: '专栏'
    },
    activity: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/blackboard/activity-5zJxM3spoS'),
      name: '活动'
    },
    cheese: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/cheese'),
      name: '课堂'
    },
    musicCenter: {
      test: (url) => url.hostname === 'music.bilibili.com',
      name: '新歌热榜'
    },
    opus: {
      test: (url) => isBilibiliHost(url) && url.pathname.startsWith('/opus'),
      name: '图文动态'
    },
    show: {
      test: (url) => url.hostname === 'show.bilibili.com',
      name: '会员购/演出'
    },
    gamePlatform: {
      test: (url) => url.hostname === 'game.bilibili.com',
      name: '游戏中心'
    }
  };

  const DEFAULT_DOMAIN_RULES = {};
  for (const key of Object.keys(DOMAIN_RULES)) {
    DEFAULT_DOMAIN_RULES[key] = false;
  }

  class VideoStatsTracker {
    constructor(video, bvId, upId, upName, title) {
      this.video = video;
      this.bvId = bvId;
      this.upId = upId;
      this.upName = upName;
      this.title = title;
      this.watchDuration = 0;
      this.lastTime = 0;
      this.lastSaveTime = 0;
      this.isPlaying = false;
      this.saveInterval = 30000;
      this.boundSaveOnUnload = this.save.bind(this, true);

      // 时间记录：页面打开 / 首次播放 / 离开视频
      this.openedAt = Date.now();
      this.startedAt = 0;
      this.closedAt = 0;
      this.actuallyPlayed = false;

      this.onPlay = this.onPlay.bind(this);
      this.onPause = this.onPause.bind(this);
      this.onEnded = this.onEnded.bind(this);
      this.onTimeUpdate = this.onTimeUpdate.bind(this);
      this.onVisibilityChange = this.onVisibilityChange.bind(this);
    }

    start() {
      if (!this.video) return;
      this.video.addEventListener('play', this.onPlay);
      this.video.addEventListener('pause', this.onPause);
      this.video.addEventListener('ended', this.onEnded);
      this.video.addEventListener('timeupdate', this.onTimeUpdate);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      window.addEventListener('beforeunload', this.boundSaveOnUnload);
      if (!this.video.paused) {
        this.isPlaying = true;
        this.lastTime = Date.now();
        if (!this.startedAt) {
          this.startedAt = Date.now();
        }
      }
    }

    stop() {
      if (this.isPlaying) this.accumulate();
      this.closedAt = Date.now();
      this.save(true);
      if (!this.video) return;
      this.video.removeEventListener('play', this.onPlay);
      this.video.removeEventListener('pause', this.onPause);
      this.video.removeEventListener('ended', this.onEnded);
      this.video.removeEventListener('timeupdate', this.onTimeUpdate);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      window.removeEventListener('beforeunload', this.boundSaveOnUnload);
    }

    onPlay() {
      this.isPlaying = true;
      this.lastTime = Date.now();
      if (!this.startedAt) {
        this.startedAt = Date.now();
      }
    }

    onPause() {
      this.accumulate();
      this.isPlaying = false;
      this.save();
    }

    onEnded() {
      this.accumulate();
      this.isPlaying = false;
      this.save();
    }

    onTimeUpdate() {
      if (this.isPlaying) {
        const now = Date.now();
        const delta = Math.min((now - this.lastTime) / 1000, 5);
        if (delta > 0) this.watchDuration += delta;
        this.lastTime = now;
      }
      if (Date.now() - this.lastSaveTime > this.saveInterval) {
        this.save();
      }
    }

    onVisibilityChange() {
      if (document.hidden) {
        if (this.isPlaying) {
          this.accumulate();
          this.isPlaying = false;
        }
      } else if (this.video && !this.video.paused) {
        this.isPlaying = true;
        this.lastTime = Date.now();
        if (!this.startedAt) {
          this.startedAt = Date.now();
        }
      }
    }

    accumulate() {
      if (this.lastTime > 0) {
        this.watchDuration += Math.max(0, (Date.now() - this.lastTime) / 1000);
      }
    }

    async save(force = false) {
      if (!this.bvId) return;
      const videoDuration = this.video ? (this.video.duration || 0) : 0;
      const durationToReport = Math.round(this.watchDuration);
      // 只要有播放行为或累计观看时长大于 0，就标记为真正播放过
      this.actuallyPlayed = this.actuallyPlayed || this.startedAt > 0 || durationToReport > 0;
      const stat = {
        bvId: this.bvId,
        title: this.title || '',
        upName: this.upName || '',
        upId: this.upId || '',
        watchDuration: durationToReport,
        videoDuration: Math.round(videoDuration),
        watchPercent: videoDuration > 0 ? Math.min(100, Math.round((this.watchDuration / videoDuration) * 100 * 10) / 10) : 0,
        openedAt: this.openedAt,
        startedAt: this.startedAt,
        closedAt: this.closedAt,
        actuallyPlayed: this.actuallyPlayed,
        lastWatchAt: Date.now()
      };
      try {
        await chrome.runtime.sendMessage({ action: 'addVideoStat', stat });
        this.lastSaveTime = Date.now();
        this.watchDuration = 0;
      } catch (e) {
        if (force) console.error('[哔哩护苗] 保存统计失败', e);
      }
    }
  }

  function stopCurrentTracking() {
    if (currentTracker) {
      currentTracker.stop();
      currentTracker = null;
    }
  }

  function startTrackingForCurrentVideo() {
    const bvId = getContentIdFromUrl();
    if (!bvId) return;
    const video = document.querySelector('video');
    if (!video) return;
    if (currentTracker && currentTracker.video === video && currentTracker.bvId === bvId) return;

    stopCurrentTracking();
    const upId = getUpIdFromDom();
    const upName = getUpNameFromDom();
    const title = getVideoTitle();
    currentTracker = new VideoStatsTracker(video, bvId, upId, upName, title);
    currentTracker.start();
  }

  function getBvIdFromUrl() {
    const match = window.location.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/);
    return match ? match[1] : null;
  }

  // 通用内容 ID：普通视频取 BV 号，番剧/影视取 ep/ss 号，用于统计标识
  function getContentIdFromUrl() {
    const bv = getBvIdFromUrl();
    if (bv) return bv;
    const bangumi = window.location.pathname.match(/\/bangumi\/play\/((?:ep|ss)\d+)/);
    return bangumi ? bangumi[1] : null;
  }

  function getUpIdFromDom() {
    // 番剧页没有 UP主，作者链接指向 /bangumi/media/mdXXX，优先用 md 号避免 fallback 抓到评论区用户
    if (/\/bangumi\//.test(window.location.pathname)) {
      const mdLink = document.querySelector('a[href*="/bangumi/media/md"]');
      if (mdLink) {
        const m = (mdLink.getAttribute('href') || '').match(/\/bangumi\/media\/(md\d+)/);
        if (m) return m[1];
      }
      return null;
    }
    // 优先在视频信息区域查找，避免匹配到评论区
    const containers = [
      '.video-info',
      '.up-info',
      '.owner',
      '.video-desc',
      '.video-container-v1',
      '#viewbox_report',
      '.video-jumper'
    ];
    for (const container of containers) {
      const el = document.querySelector(container);
      if (el) {
        const link = el.querySelector('a[href*="space.bilibili.com"]');
        if (link) {
          const href = link.getAttribute('href');
          const match = href.match(/space\.bilibili\.com\/(\d+)/);
          if (match) return match[1];
        }
      }
    }
    // fallback: 取页面中第一个匹配的链接
    const links = document.querySelectorAll('a[href*="space.bilibili.com"]');
    for (const link of links) {
      const href = link.getAttribute('href');
      const match = href.match(/space\.bilibili\.com\/(\d+)/);
      if (match) return match[1];
    }
    return null;
  }

  function getVideoTitle() {
    // 优先从 meta 标签获取
    const metaTitle = document.querySelector('meta[property="og:title"]');
    if (metaTitle) {
      const t = metaTitle.getAttribute('content');
      if (t) return t.trim();
    }
    const h1 = document.querySelector('h1');
    if (h1) {
      return h1.textContent.trim();
    }
    // 从 document.title 提取: "视频标题_哔哩哔哩_bilibili"
    const titleMatch = document.title.match(/^(.+?)_哔哩哔哩/);
    if (titleMatch) return titleMatch[1].trim();
    return document.title.trim();
  }

  function getUpNameFromDom() {
    // 番剧/国创页：作者链接指向 /bangumi/media/mdXXX，文本即剧名，优先取避免抓到评论区用户名
    if (/\/bangumi\//.test(window.location.pathname)) {
      const mdLink = document.querySelector('a[href*="/bangumi/media/md"]');
      if (mdLink) {
        const name = mdLink.textContent.trim() || mdLink.getAttribute('title');
        if (name) return name;
      }
      return null;
    }
    const containers = [
      '.video-info',
      '.up-info',
      '.owner',
      '.video-desc',
      '.video-container-v1'
    ];
    for (const container of containers) {
      const el = document.querySelector(container);
      if (el) {
        const link = el.querySelector('a[href*="space.bilibili.com"]');
        if (link) {
          // 尝试取链接内的文本或子元素文本
          const name = link.textContent.trim() || link.getAttribute('title');
          if (name) return name;
        }
      }
    }
    // 尝试常见的类名
    const nameEls = document.querySelectorAll('.up-name, .name, .username, [data-user-profile-id]');
    for (const el of nameEls) {
      const text = el.textContent.trim() || el.getAttribute('title');
      if (text) return text;
    }
    return null;
  }

  async function getWhitelist() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
      const data = response?.data || {};
      return {
        upIds: Array.isArray(data?.upIds) ? data.upIds : [],
        upNames: Array.isArray(data?.upNames) ? data.upNames : [],
        bvIds: Array.isArray(data?.bvIds) ? data.bvIds : [],
        ssIds: Array.isArray(data?.ssIds) ? data.ssIds : [],
        ssNames: Array.isArray(data?.ssNames) ? data.ssNames : []
      };
    } catch (e) {
      return { upIds: [], upNames: [], bvIds: [], ssIds: [], ssNames: [] };
    }
  }

  // 番剧 ss 号：URL 直接是 ss 则取之，是 ep 则委托 background 反查
  async function getSeasonIdsForCurrentPage() {
    const ss = window.location.pathname.match(/\/bangumi\/play\/ss(\d+)/);
    const ep = window.location.pathname.match(/\/bangumi\/play\/ep(\d+)/);
    const result = [];
    if (ss) result.push('ss' + ss[1]);  // ss 页直接可得，反查失败也能比对
    // 页面 DOM 里的 md 链接最可靠，无需网络，优先用它
    const mdLink = document.querySelector('a[href*="/bangumi/media/md"]');
    if (mdLink) {
      const m = (mdLink.getAttribute('href') || '').match(/\/bangumi\/media\/(md\d+)/);
      if (m) result.push(m[1]);
    }
    const req = ss ? { seasonId: ss[1] } : (ep ? { epId: ep[1] } : null);
    if (req) {
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'getSeasonId', ...req });
        const d = resp?.data;
        if (d) {
          if (d.ss) result.push(d.ss);
          if (d.md) result.push(d.md);
        }
      } catch (e) {}
    }
    return [...new Set(result)];
  }

  async function getDomainRules() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getDomainRules' });
      return response?.data || DEFAULT_DOMAIN_RULES;
    } catch (e) {
      return DEFAULT_DOMAIN_RULES;
    }
  }

  function pauseAllVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.pause();
      video.muted = true;
      video.removeAttribute('autoplay');
    });
  }

  function createOverlay(message, requestInfo) {
    if (overlayElement) {
      overlayElement.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(61, 52, 40, 0.88);
      z-index: 9999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-family: Nunito, "Noto Sans SC", "Zen Maru Gothic", "HarmonyOS Sans SC", "MiSans", -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      pointer-events: auto;
    `;

    const title = document.createElement('h2');
    title.textContent = message || '该内容不在白名单中';
    title.style.cssText = 'font-size: 26px; margin-bottom: 16px; text-align: center; font-weight: 700;';

    const desc = document.createElement('p');
    desc.textContent = '请联系管理员将内容添加到白名单中';
    desc.style.cssText = 'font-size: 14px; color: #e8e2d6; margin-bottom: 16px; text-align: center;';

    // 临时解锁输入区
    const unlockWrap = document.createElement('div');
    unlockWrap.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 10px;';

    const unlockInput = document.createElement('input');
    unlockInput.type = 'text';
    unlockInput.placeholder = '输入临时解锁密码';
    unlockInput.maxLength = 6;
    unlockInput.style.cssText = `
      padding: 12px 18px;
      border: 2px solid #e8e2d6;
      border-radius: 18px;
      font-size: 16px;
      text-align: center;
      letter-spacing: 5px;
      width: 190px;
      outline: none;
      background: #fff;
      color: #794f27;
    `;

    const unlockBtn = document.createElement('button');
    unlockBtn.textContent = '临时解锁';
    unlockBtn.style.cssText = `
      padding: 10px 28px;
      border: none;
      border-radius: 18px;
      background: #19c8b9;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      font-weight: 700;
      transition: background 0.2s, transform 0.1s;
    `;

    const unlockMsg = document.createElement('p');
    unlockMsg.style.cssText = 'font-size: 12px; min-height: 18px; margin: 0;';

    async function tryUnlock() {
      const code = unlockInput.value.trim();
      if (!code) {
        unlockMsg.textContent = '请输入密码';
        unlockMsg.style.color = '#e05a5a';
        return;
      }
      unlockBtn.disabled = true;
      unlockBtn.style.opacity = '0.6';
      unlockBtn.textContent = '验证中...';
      try {
        const response = await chrome.runtime.sendMessage({ action: 'verifyTempUnlockCode', code });
        if (response?.success) {
          unlockMsg.textContent = '解锁成功';
          unlockMsg.style.color = '#6fba2c';
          setTimeout(() => removeOverlay(), 400);
        } else {
          unlockMsg.textContent = response?.message || '密码错误';
          unlockMsg.style.color = '#e05a5a';
          unlockBtn.disabled = false;
          unlockBtn.style.opacity = '1';
          unlockBtn.textContent = '临时解锁';
        }
      } catch (e) {
        unlockMsg.textContent = '验证失败';
        unlockMsg.style.color = '#e05a5a';
        unlockBtn.disabled = false;
        unlockBtn.style.opacity = '1';
        unlockBtn.textContent = '临时解锁';
      }
    }

    unlockBtn.addEventListener('click', tryUnlock);
    unlockInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });

    unlockWrap.appendChild(unlockInput);
    unlockWrap.appendChild(unlockBtn);
    unlockWrap.appendChild(unlockMsg);

    overlay.appendChild(title);
    overlay.appendChild(desc);

    // 申请加入白名单按钮（仅 BV/番剧可申请）
    if (requestInfo) {
      const requestWrap = document.createElement('div');
      requestWrap.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 14px 0;';

      const requestBtn = document.createElement('button');
      requestBtn.textContent = '申请加入白名单';
      requestBtn.style.cssText = `
        padding: 10px 28px;
        border: 2px solid #ff9eb5;
        border-radius: 18px;
        background: transparent;
        color: #ff9eb5;
        font-size: 14px;
        cursor: pointer;
        font-weight: 700;
        transition: background 0.2s, color 0.2s;
      `;
      requestBtn.addEventListener('mouseenter', () => {
        requestBtn.style.background = '#ff9eb5';
        requestBtn.style.color = '#fff';
      });
      requestBtn.addEventListener('mouseleave', () => {
        requestBtn.style.background = 'transparent';
        requestBtn.style.color = '#ff9eb5';
      });

      const requestMsg = document.createElement('p');
      requestMsg.style.cssText = 'font-size: 12px; min-height: 18px; margin: 0;';

      async function submitRequest() {
        requestBtn.disabled = true;
        requestBtn.style.opacity = '0.6';
        requestBtn.textContent = '发送中...';
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'submitWhitelistRequest',
            requestInfo
          });
          if (response?.success) {
            requestMsg.textContent = '已发送申请，请等待家长处理';
            requestMsg.style.color = '#6fba2c';
            requestBtn.textContent = '已申请';
          } else {
            requestMsg.textContent = response?.message || '申请失败';
            requestMsg.style.color = '#e05a5a';
            requestBtn.disabled = false;
            requestBtn.style.opacity = '1';
            requestBtn.textContent = '申请加入白名单';
          }
        } catch (e) {
          requestMsg.textContent = '申请失败';
          requestMsg.style.color = '#e05a5a';
          requestBtn.disabled = false;
          requestBtn.style.opacity = '1';
          requestBtn.textContent = '申请加入白名单';
        }
      }

      requestBtn.addEventListener('click', submitRequest);
      requestWrap.appendChild(requestBtn);
      requestWrap.appendChild(requestMsg);
      overlay.appendChild(requestWrap);
    }

    overlay.appendChild(unlockWrap);

    document.documentElement.appendChild(overlay);
    overlayElement = overlay;
  }

  function removeOverlay() {
    if (overlayElement) {
      overlayElement.remove();
      overlayElement = null;
    }
  }

  async function checkTempUnlock() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkTempUnlock' });
      return !!response?.data;
    } catch (e) {
      return false;
    }
  }

  async function recordBlock(reason) {
    try {
      const url = window.location.href;
      const bvId = getContentIdFromUrl() || '';
      const record = {
        url,
        bvId,
        title: getVideoTitle() || document.title.trim() || '',
        upId: getUpIdFromDom() || '',
        upName: getUpNameFromDom() || '',
        reason,
        blockedAt: Date.now()
      };
      console.log('[哔哩护苗] 记录拦截:', record);
      const response = await chrome.runtime.sendMessage({ action: 'addBlockedVideo', record });
      console.log('[哔哩护苗] 拦截记录保存结果:', response);
    } catch (e) {
      console.error('[哔哩护苗] 记录拦截失败', e);
    }
  }

  async function checkAndBlock() {
    if (isChecking) return;
    isChecking = true;
    console.log('[哔哩护苗] 开始检查，URL:', window.location.href);

    try {
      // 如果当前已有拦截遮罩，说明已处理过，避免重复记录，但仍要暂停新加载的视频
      if (overlayElement) {
        pauseAllVideos();
        isChecking = false;
        return;
      }

      const url = new URL(window.location.href);

      // 1. 临时解锁期内全部放行
      if (await checkTempUnlock()) {
        console.log('[哔哩护苗] 临时解锁期内，放行');
        removeOverlay();
        startTrackingForCurrentVideo();
        isChecking = false;
        return;
      }

      const mode = await getMode();
      const effectiveMode = resolveEffectiveMode(mode);
      console.log('[哔哩护苗] 当前模式:', mode, '生效模式:', effectiveMode);

      // 2. 严格模式：频道不拦截，只认白名单
      //    宽松/时间-宽松：执行频道拦截
      if (effectiveMode === 'lenient' || effectiveMode === 'timed-lenient') {
        const domainRules = await getDomainRules();
        console.log('[哔哩护苗] 频道规则:', domainRules, '当前 pathname:', url.pathname);
        for (const [key, rule] of Object.entries(DOMAIN_RULES)) {
          const matched = rule.test(url);
          const blocked = !domainRules[key];
          console.log(`[哔哩护苗] 频道检查 ${key}: 匹配=${matched}, 拦截=${blocked}, 规则值=${domainRules[key]}`);
          if (matched && blocked) {
            console.log('[哔哩护苗] 拦截频道:', key);
            pauseAllVideos();
            createOverlay(`该${rule.name}内容已被拦截`);
            recordBlock(`channel:${key}`);
            isChecking = false;
            return;
          }
        }
      }

      // 3. 宽松模式：频道放行后其余也放行，白名单不生效
      if (effectiveMode === 'lenient' || effectiveMode === 'timed-lenient') {
        console.log('[哔哩护苗] 宽松模式，放行');
        removeOverlay();
        startTrackingForCurrentVideo();
        isChecking = false;
        return;
      }

      // 4. 时间模式-时段外：全部拦截
      if (effectiveMode === 'timed-block') {
        console.log('[哔哩护苗] 时间模式-时段外，全部拦截');
        pauseAllVideos();
        createOverlay('当前不在可观看时段');
        recordBlock('timed-block');
        stopCurrentTracking();
        isChecking = false;
        return;
      }

      // 5. 严格模式：BV/UP 白名单 + 番剧 ss/md 白名单
      const bvId = getBvIdFromUrl();
      console.log('[哔哩护苗] BV号:', bvId);
      if (bvId) {
        const whitelist = await getWhitelist();
        const upId = getUpIdFromDom();
        console.log('[哔哩护苗] 白名单:', whitelist, 'UP主ID:', upId);

        const bvAllowed = whitelist.bvIds.includes(bvId);
        const upAllowed = upId && whitelist.upIds.includes(upId);

        if (!bvAllowed && !upAllowed) {
          console.log('[哔哩护苗] 视频被拦截');
          pauseAllVideos();
          const requestInfo = { contentType: 'bv', contentId: bvId, title: getVideoTitle() || '', upName: getUpNameFromDom() || '' };
          createOverlay('该视频不在白名单中', requestInfo);
          recordBlock('not-in-whitelist');
          stopCurrentTracking();
        } else {
          console.log('[哔哩护苗] 视频放行');
          removeOverlay();
          startTrackingForCurrentVideo();
        }
      } else if (/\/bangumi\/play\/(ep|ss)\d+/.test(url.pathname)) {
        const ids = await getSeasonIdsForCurrentPage();
        const whitelist = await getWhitelist();
        console.log('[哔哩护苗] 番剧 ss/md号:', ids, '白名单:', whitelist.ssIds);
        const allowed = ids.some(id => whitelist.ssIds.includes(id));
        if (allowed) {
          console.log('[哔哩护苗] 番剧在白名单，放行');
          removeOverlay();
          startTrackingForCurrentVideo();
        } else {
          console.log('[哔哩护苗] 番剧不在白名单，拦截');
          pauseAllVideos();
          const mdId = ids.find(id => id.startsWith('md'));
          const ssIdForRequest = ids.find(id => id.startsWith('ss'));
          const requestInfo = {
            contentType: 'ss',
            contentId: mdId || ssIdForRequest || '',
            title: getVideoTitle() || '',
            upName: ''
          };
          createOverlay('该番剧不在白名单中', requestInfo);
          recordBlock('not-in-whitelist');
          stopCurrentTracking();
        }
      } else {
        // 首页/搜索/空间等非视频页：放行
        removeOverlay();
        startTrackingForCurrentVideo();
      }
    } catch (error) {
      console.error('[哔哩护苗] 检查错误:', error);
    } finally {
      isChecking = false;
    }
  }

  // 解析当前生效模式
  // 返回值：'strict' | 'lenient' | 'timed-lenient' | 'timed-block'
  function resolveEffectiveMode(mode) {
    if (!mode || mode.type === 'strict') return 'strict';
    if (mode.type === 'lenient') return 'lenient';
    if (mode.type === 'timed') {
      return isInTimeRanges(mode.timeRanges) ? 'timed-lenient' : 'timed-block';
    }
    return 'strict';
  }

  function isInTimeRanges(timeRanges) {
    if (!Array.isArray(timeRanges) || timeRanges.length === 0) return false;
    const now = new Date();
    const currentDay = now.getDay(); // 0=周日,1=周一,...,6=周六
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    for (const range of timeRanges) {
      const days = Array.isArray(range.days) ? range.days : [];
      if (!days.includes(currentDay)) continue;
      const start = parseTime(range.start);
      const end = parseTime(range.end);
      if (start === null || end === null) continue;
      if (end > start) {
        if (currentMinutes >= start && currentMinutes < end) return true;
      } else {
        // 跨午夜
        if (currentMinutes >= start || currentMinutes < end) return true;
      }
    }
    return false;
  }

  function parseTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  async function getMode() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getMode' });
      return response?.data || { type: 'strict', timeRanges: [] };
    } catch (e) {
      return { type: 'strict', timeRanges: [] };
    }
  }

  function initMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let hasVideo = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'VIDEO' || node.querySelector?.('video')) {
              hasVideo = true;
              break;
            }
          }
        }
        if (hasVideo) break;
      }
      if (hasVideo) {
        checkAndBlock();
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ========== 首页推荐流过滤 ==========
  const FEED_CARD_SELECTORS = [
    '.bili-video-card',
    '.feed-card',
    '[data-idx]',
    '[class*="video-card"]'
  ];

  const FEED_AUTHOR_SELECTORS = [
    '.bili-video-card__info--author',
    '.up-name',
    '.name',
    '.video-author',
    '.author'
  ];

  let feedObserver = null;
  let feedCheckTimer = null;

  function injectFeedStyles() {
    if (document.getElementById('bili-guard-feed-styles')) return;
    const style = document.createElement('style');
    style.id = 'bili-guard-feed-styles';
    style.textContent = `
      .bili-guard-feed-card {
        position: relative !important;
      }
      .bili-guard-feed-safe .bili-guard-feed-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        z-index: 10;
        background: rgba(82, 196, 26, 0.92);
        color: #fff;
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 4px;
        pointer-events: none;
        font-weight: 500;
      }
      .bili-guard-feed-blocked {
        opacity: 0.18;
        pointer-events: none;
        filter: grayscale(100%);
        transition: opacity 0.2s;
      }
      .bili-guard-feed-blocked:hover {
        opacity: 0.35;
      }
      .bili-guard-feed-blocked-inner {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #888;
        font-size: 13px;
        z-index: 5;
        pointer-events: none;
        background: rgba(255,255,255,0.65);
        border-radius: inherit;
      }
      .bili-guard-feed-blocked-inner span {
        background: rgba(255,255,255,0.9);
        padding: 4px 10px;
        border-radius: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  function isHomePage(url) {
    try {
      const u = new URL(url);
      return u.hostname === 'www.bilibili.com' && (u.pathname === '/' || u.pathname === '');
    } catch (e) {
      return false;
    }
  }

  function findFeedCards(root) {
    const cards = [];
    for (const selector of FEED_CARD_SELECTORS) {
      try {
        cards.push(...root.querySelectorAll(selector));
      } catch (e) {
        // 忽略非法选择器
      }
    }
    // 去重
    return [...new Set(cards)];
  }

  function isFeedCard(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    const className = node.className || '';
    if (typeof className !== 'string') return false;
    return FEED_CARD_SELECTORS.some(sel => {
      if (sel.startsWith('[class*="')) {
        const needle = sel.slice(9, -2);
        return className.includes(needle);
      }
      if (sel.startsWith('[data-')) {
        return node.hasAttribute(sel.slice(1, -1));
      }
      return node.matches(sel);
    });
  }

  function extractUidFromFeedCard(card) {
    // 优先在作者信息区域查找
    for (const authorSel of FEED_AUTHOR_SELECTORS) {
      const authorEl = card.querySelector(authorSel);
      if (authorEl) {
        const link = authorEl.querySelector('a[href*="space.bilibili.com"]');
        if (link) {
          const href = link.getAttribute('href') || link.href;
          const match = href.match(/space\.bilibili\.com\/(\d+)/);
          if (match) return match[1];
        }
      }
    }

    // 兜底：卡片内任意 UP 主链接
    const links = card.querySelectorAll('a[href*="space.bilibili.com"]');
    for (const link of links) {
      const href = link.getAttribute('href') || link.href;
      const match = href.match(/space\.bilibili\.com\/(\d+)/);
      if (match) return match[1];
    }

    // 从 data-report 等属性解析
    const reportData = card.getAttribute('data-report');
    if (reportData) {
      try {
        const parsed = JSON.parse(reportData);
        if (parsed.mid) return String(parsed.mid);
      } catch (e) {}
    }

    return null;
  }

  function markFeedCardSafe(card) {
    if (card.classList.contains('bili-guard-feed-safe')) return;
    card.classList.add('bili-guard-feed-card', 'bili-guard-feed-safe');
    const badge = document.createElement('div');
    badge.className = 'bili-guard-feed-badge';
    badge.textContent = '白名单';
    card.appendChild(badge);
  }

  function markFeedCardBlocked(card) {
    if (card.classList.contains('bili-guard-feed-blocked')) return;
    card.classList.add('bili-guard-feed-card', 'bili-guard-feed-blocked');
    const inner = document.createElement('div');
    inner.className = 'bili-guard-feed-blocked-inner';
    inner.innerHTML = '<span>🛡️ 已过滤</span>';
    card.appendChild(inner);
  }

  async function processFeedCard(card, whitelist) {
    if (card.dataset.biliGuardFeedProcessed) return;
    card.dataset.biliGuardFeedProcessed = 'true';

    const uid = extractUidFromFeedCard(card);
    if (!uid) return;

    const currentWhitelist = whitelist || await getWhitelist();
    if (currentWhitelist.upIds.includes(uid)) {
      markFeedCardSafe(card);
    } else {
      markFeedCardBlocked(card);
    }
  }

  async function scheduleFeedCheck() {
    if (feedCheckTimer) return;
    feedCheckTimer = setTimeout(async () => {
      feedCheckTimer = null;
      if (!isHomePage(location.href)) return;
      const whitelist = await getWhitelist();
      const cards = findFeedCards(document.body);
      for (const card of cards) {
        if (!card.dataset.biliGuardFeedProcessed) {
          processFeedCard(card, whitelist);
        }
      }
    }, 100);
  }

  function clearFeedCardMarks() {
    document.querySelectorAll('.bili-guard-feed-card').forEach(card => {
      card.classList.remove('bili-guard-feed-safe', 'bili-guard-feed-blocked', 'bili-guard-feed-card');
      card.querySelectorAll('.bili-guard-feed-badge, .bili-guard-feed-blocked-inner').forEach(el => el.remove());
      delete card.dataset.biliGuardFeedProcessed;
    });
  }

  async function refreshFeedFilter() {
    if (!isHomePage(location.href)) return;
    clearFeedCardMarks();
    const whitelist = await getWhitelist();
    const cards = findFeedCards(document.body);
    for (const card of cards) {
      await processFeedCard(card, whitelist);
    }
  }

  function startFeedObserver() {
    stopFeedObserver();
    injectFeedStyles();

    // 先处理已存在的卡片
    getWhitelist().then(whitelist => {
      const cards = findFeedCards(document.body);
      for (const card of cards) processFeedCard(card, whitelist);
    });

    // 监听推荐容器变化
    const target = document.querySelector('.recommended-container')
      || document.querySelector('.feed2')
      || document.querySelector('#app')
      || document.body;

    feedObserver = new MutationObserver((mutations) => {
      let hasNewCard = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (isFeedCard(node)) {
            hasNewCard = true;
            processFeedCard(node);
          } else if (node.querySelectorAll) {
            const innerCards = findFeedCards(node);
            if (innerCards.length) {
              hasNewCard = true;
              for (const card of innerCards) processFeedCard(card);
            }
          }
        }
      }
      // 兜底：有时 B站会复用节点只换内容
      if (!hasNewCard) {
        scheduleFeedCheck();
      }
    });

    feedObserver.observe(target, { childList: true, subtree: true });
  }

  function stopFeedObserver() {
    if (feedObserver) {
      feedObserver.disconnect();
      feedObserver = null;
    }
    if (feedCheckTimer) {
      clearTimeout(feedCheckTimer);
      feedCheckTimer = null;
    }
  }

  function initFeedFilter() {
    if (!isHomePage(location.href)) return;
    startFeedObserver();
  }

  function handleFeedRouteChange() {
    if (isHomePage(location.href)) {
      startFeedObserver();
    } else {
      stopFeedObserver();
    }
  }

  function init() {
    console.log('[哔哩护苗] init() 被调用，readyState:', document.readyState);
    // 初始检查
    if (document.readyState === 'loading') {
      console.log('[哔哩护苗] 等待 DOMContentLoaded 后检查');
      document.addEventListener('DOMContentLoaded', checkAndBlock);
    } else {
      console.log('[哔哩护苗] 立即检查');
      checkAndBlock();
    }

    // 页面加载完成后启动 MutationObserver
    if (document.body) {
      initMutationObserver();
      initFeedFilter();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        initMutationObserver();
        initFeedFilter();
      });
    }

    // URL 变化监听（SPA 路由变化）
    let lastUrl = location.href;
    function onUrlChange() {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        removeOverlay();
        stopCurrentTracking();
        handleFeedRouteChange();
        setTimeout(() => {
          checkAndBlock();
        }, 500);
      }
    }
    // 监听 history API 调用
    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;
    history.pushState = function (...args) {
      origPushState.apply(this, args);
      onUrlChange();
    };
    history.replaceState = function (...args) {
      origReplaceState.apply(this, args);
      onUrlChange();
    };
    window.addEventListener('popstate', onUrlChange);

    // 监听白名单变化，自动刷新推荐流过滤
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      const hasWhitelistChange = Object.keys(changes).some(key => key.startsWith('whitelist'));
      if (hasWhitelistChange) {
        console.log('[哔哩护苗] 检测到白名单变化，刷新推荐流过滤');
        refreshFeedFilter();
      }
    });

    // 监听 video 元素的 play 事件
    document.addEventListener('play', (e) => {
      if (e.target.tagName === 'VIDEO') {
        checkAndBlock();
      }
    }, true);
  }

  console.log('[哔哩护苗] 即将调用 init()');
  init();
  console.log('[哔哩护苗] init() 调用完成');
})();
