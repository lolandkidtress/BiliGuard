# 哔哩护苗（BiliGuard）

Chrome 浏览器扩展，用于 B 站内容过滤与家长控制。

## 插件端打包成 zip

在项目根目录执行：

```bash
cd /Users/James/Documents/git-repo
rm -f BiliGuard-extension.zip
COPYFILE_DISABLE=1 zip -r BiliGuard-extension.zip BiliGuard \
  -x "*/.DS_Store" \
     "*/__MACOSX/*" \
     "*.zip" \
     "BiliGuard/.claude/*" \
     "BiliGuard/README.md" \
     "BiliGuard/CLAUDE.md" \
     "BiliGuard/.gitignore"
```

输出文件：`/Users/James/Documents/git-repo/BiliGuard-extension.zip`

说明：
- `COPYFILE_DISABLE=1` 用于避免 macOS 在 zip 中生成 `__MACOSX` 资源分支。
- `-x` 排除了开发/系统文件，保持插件包干净。
