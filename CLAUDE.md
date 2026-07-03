# 哔哩护苗 — Claude 协作上下文

## 项目概述

哔哩护苗 是一个 Chrome 浏览器扩展（Manifest V3），用于 B站（bilibili.com）的内容过滤和播放控制。核心场景是家长控制：通过配置白名单（UP主ID 或 BV号）来限制可观看的视频内容，非白名单视频自动阻止播放。

## 技术栈

- Chrome Extension Manifest V3
- 原生 JavaScript（无框架，保持轻量）
- Chrome Storage API（`chrome.storage.local`）
- 后端为 Java 程序（开发阶段使用 Mock API）

## 文件结构

```
BiliGuard/
├── manifest.json        # 扩展入口配置
├── background.js        # Service Worker，消息路由与状态管理
├── content.js           # 内容脚本：页面注入、播放器控制、DOM解析、视频统计
├── storage.js           # Chrome Storage API 封装
├── api.js               # API 客户端（Mock/真实接口）
├── dashboard.html       # 控制台页面（点击扩展图标打开）
├── popup.js / popup.css # 控制台逻辑与样式
├── options.html         # 选项页（白名单管理、观看统计）
├── options.js / options.css
└── icons/               # 扩展图标（16/48/128）
```

## 核心设计决策

### 1. 拦截逻辑（content.js）

**核心模型**：内容能用 BV/ep/ss 精细控制的，一律走白名单（默认拦截，命中才放行）；无法做白名单的内容类型，才用频道开关整类拦/放。

**优先级（从高到低）**：
1. **临时解锁期**：处于解锁期内全部放行，无需后续判断
2. **频道级拦截**：仅保留 11 个无法做白名单的频道（直播/漫画/赛事/课堂/专栏/图文动态/活动/公益/新歌热榜/会员购演出/游戏中心），匹配且开关=拦截则拦
3. **视频页面白名单检查**：
   - 普通视频（`/video/BVxxx`）：BV号 或 UP主ID 任一匹配即放行，否则拦截
   - 番剧/影视 PGC（`/bangumi/play/epXXX|ssXXX`）：反查 ss 号，命中 ss 白名单则放行，否则拦截
   - 其余非视频页（首页/搜索/空间等）：放行

**关键约束**：番剧/国创/电影/电视剧/综艺/纪录片 都属 PGC，播放页统一是 `/bangumi/play/`，URL 无法区分类型，**不设独立频道开关**，全部由 ss 白名单控制。曾有 bug：番剧无 BV 号时无条件放行（绕过白名单），已修复为走 ss 白名单判断。

**播放器控制方式**：
- 查找 `<video>` 元素，调用 `video.pause()` + `video.muted = true`
- 移除 `autoplay` 属性
- 通过 `document` 捕获阶段的 `play` 事件监听，防止 JS 触发的自动播放
- `MutationObserver` 监视 video 元素动态加载

**遮罩层设计**：
- 全屏 `fixed` 半透明黑色覆盖（`rgba(0,0,0,0.85)`，`z-index: 9999999`）
- **无关闭按钮**，被拦截时一直显示，只有进入白名单视频或离开页面才消失
- 遮罩层 DOM 直接挂载到 `document.documentElement`

**SPA 路由兼容**：
- 拦截 `history.pushState` / `history.replaceState` 监听 B站单页应用跳转
- 同时监听 `popstate` 事件

### 2. 白名单提取逻辑

- **BV号**：URL 路径正则 `\/video\/(BV[0-9A-Za-z]+)`
- **UP主ID/名字**：
  - 普通视频页：优先在视频信息区域（`.video-info`、`.up-info`、`.owner` 等）查找 `a[href*="space.bilibili.com"]`，正则提取 `space\.bilibili\.com\/(\d+)`，避免匹配到评论区用户链接
  - 番剧/国创/影视等 PGC 页（`/bangumi/`）：没有传统 UP主，作者链接指向 `/bangumi/media/mdXXX`。`getUpIdFromDom`/`getUpNameFromDom` 在 `/bangumi/` 路径下**提前 return**，取 md 号作 upId（带 `md` 前缀，不会误匹配数字 UP主白名单）、md 链接文本作番剧名，杜绝 fallback 抓到评论区用户
- **番剧白名单（ssIds 列表）**：录入框接受 **md 号**、**ss 号**、**ep 号**三种格式，最终都归一化成 md/ss 存进 `ssIds`（字段名不改，语义为"番剧 ID"）。
  - md/ss：直接存
  - ep：录入时反查成 ss/md 再存（**ep 是单集，不能直接存**）。反查环境不同：扩展 options 走 background 调 B站接口；管理端网页有 CORS 限制，走后端代理接口 `GET /bg/bangumi/resolve?epId=`（Java 调 B站，需登录 token；只转发公开 ep_id，不外传本地数据）
  - 录入必须带 `md`/`ss`/`ep` 前缀（纯数字无法区分）
  - **ep 录入是刚需**：番剧未进白名单时整页被遮罩，用户点不到标题拿 md，只能复制地址栏的 ep 号
  - 拦截判定时 background 调 `pgc/view/web/season?ep_id=XXX`（或 `season_id=`）反查，返回 `{ss, md}` 两个号（缓存），当前页 ss/md 任一命中白名单即放行

### 3. 视频观看统计（content.js）

- `VideoStatsTracker` 类追踪每个视频的实际播放时间
- 通过 `play`/`pause`/`ended`/`timeupdate` 事件计算观看时长
- `visibilitychange` 事件处理：页面不可见时暂停计时
- 每 30 秒自动保存到 Storage
- 收集字段：视频标题、UP主名字、UP主ID、BV号、观看时长（秒）、视频总时长、观看百分比
- 同 BV 号自动合并观看时长，最多保留 200 条记录

### 4. Storage 数据结构

业务数据按 userId 命名空间隔离：实际 key 为 `<原始key>:<userId>`（如 `whitelist:abc123`），与用户无关的系统配置（`auth`、`apiBaseUrl`、`stripeConfig`）保留单 key。

```json
{
  "auth": { "token": "jwt", "username": "xxx", "userId": "..." },
  "whitelist:<userId>": { "upIds": [], "upNames": [], "bvIds": [] },
  "domainRules:<userId>": { "anime": false, "live": false, "manga": false, "match": false },
  "tempUnlockUntil:<userId>": 0,
  "videoStats:<userId>": []
}
```

- `domainRules` 中 `false` = 拦截，`true` = 放行
- `tempUnlockUntil` 为毫秒时间戳，过期后 `isTempUnlocked()` 自动返回 false，不需要定时清理

### 5. 临时解锁机制

- 不复用配置密码，由后端独立生成的一次性数字密码授权
- 管理页面（后续实现）调用 `POST /bg/temp-unlock/generate` 生成 6 位密码，Redis TTL 1 小时
- 扩展弹窗输入密码后调用 `POST /bg/temp-unlock/verify`：成功则后端删除密码并返回 `durationSeconds`
- 扩展把 `Date.now() + durationSeconds * 1000` 写入本地 `tempUnlockUntil`，到期自然失效

### 6. API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/bg/auth/register` | POST | 注册（密码 SHA-256 hash） |
| `/bg/auth/login` | POST | 登录，返回 token |
| `/bg/auth/logout` | POST | 登出 |
| `/bg/whitelist` | GET / POST | 获取/保存白名单 |
| `/bg/settings` | GET / POST | 获取/保存频道规则 |
| `/bg/stats` | GET / POST | 观看统计 |
| `/bg/config-password/set` | POST | 首次设置配置密码 |
| `/bg/config-password/verify` | POST | 校验配置密码 |
| `/bg/config-password/send-reset-email` | POST | 发送重置邮件 |
| `/bg/config-password/reset` | POST | 邮箱验证码重置配置密码 |
| `/bg/temp-unlock/generate` | POST | 管理页面生成临时解锁码 |
| `/bg/temp-unlock/verify` | POST | 扩展输入码校验解锁 |

## 关键代码约定

- **无关闭按钮的遮罩层**：`createOverlay()` 中只添加标题和描述，不添加任何按钮。被拦截内容必须一直显示提示。
- **频道拦截不叫域名拦截**：UI 文案统一使用"频道拦截"。
- **options 页面开关状态**：开关旁边直接显示"拦截"（粉色）或"放行"（蓝色）文字，直观明了。
- **content.js 使用 IIFE**：避免污染页面全局作用域。
- **background.js 使用 `importScripts('storage.js')`**：Service Worker 中全局引入 storage 函数。
- **跨脚本通信**：popup/options 通过 `chrome.runtime.sendMessage` 与 background 通信，不直接操作 storage。

## 已知注意事项

1. **B站 DOM 结构变化**：UP主ID 和名字提取依赖特定 CSS 选择器（`.video-info`、`.up-name` 等），B站改版后可能需要调整。
2. **content.js `run_at: "document_start"`**：DOM 可能尚未就绪，所有 DOM 操作都需做存在性检查。

## 用户偏好

- 响应语言：简体中文
- 代码风格：无多余注释，只保留非显而易见的 WHY；不写多行 docstring
- 拦截强度：严格，遮罩层不可关闭，只能通过白名单或临时解锁码放行



后端项目是
/Users/James/Documents/git-repo/PromptManager
是java项目
后端需要先切换jdk版本和maven版本
sdk use maven 3.9.9
sdk use java 17.0.17-ms

后端项目是和其他项目共享的
所以在开发时，需要特别注意区分，不要修改原有的项目逻辑


在/Users/James/Documents/git-repo/BiliGuard-page
目录下面 做网页版
网页版就是一个远端的控制endpoint，方便用户远程操作
有以下几个功能
1.登录/注册/充值密码
2.收费付款
3.修改白名单
4.可以临时开关
5.查看统计数据

本地开发启动（推荐）
在项目目录下起一个本地静态服务器即可。
cd /Users/James/Documents/git-repo/BiliGuard-page
# Python 3
python3 -m http.server 8080