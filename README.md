# 哔哩护苗（BiliGuard）

一个开源的 Chrome 浏览器扩展，用于 B站（bilibili.com）的内容过滤与家长控制。

由一位 15 年程序员爸爸为自家四年级娃开发，目的是让孩子在 B站上有边界地浏览，而不是被推荐算法牵着走。

---

## 核心功能

### 1. 白名单模式（严格模式）

只有白名单里的 UP 主或 BV 号才能播放，其他内容自动拦截。

适合：小学低年级、刚接触 B站、需要强管控的孩子。

### 2. 黑名单模式（宽松模式）

黑名单里的 UP 主或 BV 号会被拦截，其他内容正常浏览。

适合：小学高年级、有一定判断力、只需要屏蔽特定内容的孩子。

### 3. 时间模式

在指定时间段内启用宽松模式，其他时间恢复严格模式。

适合：想给孩子一定自由，但不想全天放开的家长。

### 4. 观看统计

记录孩子看了什么、看了多久，帮助家长了解兴趣变化。

### 5. 临时解锁

家长可通过一次性密码临时放行，方便特殊情况下使用。

---

## 适用场景

- 孩子历史记录里游戏解说、整蛊视频占比过高
- 不想让孩子被 B站推荐算法无限刷下去
- 希望按年龄段逐步放手，培养自控力
- 需要云端同步配置，多设备一致

---

## 安装方式

### 方式一：Chrome 商店（推荐）

搜索 **「哔哩护苗」** 或 **「BiliGuard」** 安装。

### 方式二：开发者模式加载

1. 下载本仓库代码
2. 替换 `manifest.json`、`storage.js`、`api.js` 中的 `your-api-domain.com` 为你自己的后端域名
3. 打开 Chrome 扩展管理页 `chrome://extensions/`
4. 开启右上角「开发者模式」
5. 点击「加载已解压的扩展程序」，选择本项目文件夹

---

## 后端说明

本仓库只包含浏览器扩展前端代码。后端 API 需要自行搭建，接口规范见 `CLAUDE.md`。

如需独立运行，需要实现：
- 用户注册/登录
- 白名单/黑名单云端同步
- 观看统计存储
- 临时解锁码生成与校验
- 支付相关接口（可选）

---

## 文件结构

```
BiliGuard/
├── manifest.json        # 扩展入口配置
├── background.js        # Service Worker
├── content.js           # 内容脚本：页面注入、播放器控制、DOM解析
├── storage.js           # Chrome Storage 封装与默认配置
├── api.js               # API 客户端
├── options.html/js/css  # 选项页：白名单/黑名单管理、统计
├── dashboard.html       # 控制台弹窗页
├── popup.js / popup.css # 弹窗逻辑与样式
├── icons/               # 扩展图标
├── landing/             # 静态介绍页
└── recommend-ups.json   # 推荐 UP 主列表
```

---

## 配置说明

开源版本已移除真实域名和支付密钥，使用前请替换以下占位符：

| 文件 | 占位符 | 说明 |
|------|--------|------|
| `manifest.json` | `your-api-domain.com` | 后端 API 域名 |
| `storage.js` | `https://your-api-domain.com/7wa` | API base URL |
| `storage.js` | `pk_test_your_stripe_publishable_key` | Stripe 公钥（可选） |
| `options.html` | `your-whatsapp-number` | WhatsApp 联系方式（可选） |
| `options.html` | `your-email@example.com` | 联系邮箱（可选） |
| `dashboard.html` | 同上 | 同上 |

---

## 开发

本地开发无需构建，直接加载扩展即可。

```bash
# 打包扩展
COPYFILE_DISABLE=1 zip -r BiliGuard-extension.zip BiliGuard \
  -x "*/.DS_Store" \
     "*/__MACOSX/*" \
     "*.zip" \
     "BiliGuard/.claude/*" \
     "BiliGuard/README.md" \
     "BiliGuard/CLAUDE.md" \
     "BiliGuard/.gitignore" \
     "BiliGuard/LICENSE"
```

---

## 技术栈

- Chrome Extension Manifest V3
- 原生 JavaScript（无框架，保持轻量）
- Chrome Storage API

---

## 为什么开源

作为家长控制插件，代码公开是对用户的信任承诺。

同时希望更多家长、开发者能参与进来，一起完善黑名单规则、优化体验。

---

## 贡献

欢迎提交 Issue 和 PR：

- 发现 B站 页面改版导致拦截失效
- 有更好的黑名单/白名单管理建议
- 希望增加新功能

---

## License

[MIT](LICENSE)

---

> 更多信息可关注公众号「沪港双城奶爸」或小红书「沪港双城奶爸」。
