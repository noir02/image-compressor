# 图片压缩工具

一个零依赖、双击 `index.html` 就能用的 Web 端图片压缩工具。100% 纯前端，**所有处理都在浏览器本地完成，文件不会上传到任何服务器**。

> 在线 Demo（GitHub Pages）：<https://noir02.github.io/image-compressor/>

![hero](https://placehold.co/1200x600/2563eb/ffffff?text=Image+Compressor)

## 特性

- 支持 **JPEG / PNG / WebP** 三种格式（其他格式会被拒绝）
- 单张 + 批量处理，串行压缩、实时显示进度
- 可调质量滑块（1-100）、输出格式（跟随原图 / 强制 JPEG / 强制 PNG / 强制 WebP）
- PNG 提供三种策略：**无损重压缩**、**有损重编码**、**转 WebP**
- 可选按最长边等比缩放
- 单图下载 + 全部打包 **ZIP** 下载
- 明 / 暗主题切换
- 全部中文界面
- 支持深色 / 浅色主题，跟随系统设置

## 使用方法

1. 双击 `index.html`，在浏览器中打开
2. 把图片拖到顶部虚线框里，或点击该区域选择文件
3. 在「压缩设置」中调整质量、输出格式、PNG 策略、缩放
4. 列表中每张图会显示原大小、压缩后大小、节省百分比
5. 单图点击下载，全部完成后点「下载全部（ZIP）」打包

> 首次打开需要联网加载 `JSZip`（打包 ZIP）和 `UPNG.js`（PNG 无损/有损重编码）这两个第三方库。加载完成后会进入浏览器缓存，断网也能继续使用。

## 工作原理

压缩按输出格式分流：

- **JPEG / WebP**：`Canvas` + `toBlob(type, quality)`，质量滑块 1-100 生效；JPEG 透明区域自动填白底。
- **PNG 无损重压缩**：用 [UPNG.js](https://github.com/photopea/UPNG.js) 解码原始字节后以最高压缩级别重新编码，保证像素级一致；若 UPNG 对当前 PNG 变体抛错则降级到 `Canvas`（视觉相似但不再保证完全一致）。
- **PNG 有损重编码**：直接 `Canvas.toBlob('image/png')`，浏览器内置 PNG 编码器对截图/UI 类图通常已能明显减重。
- **缩放**：按最长边等比缩放后编码，保持纵横比。

所有处理在主线程串行执行，逐项展示「待处理 / 处理中 / 完成 / 失败」状态，参数变化时已完成的项自动重新压缩。

## 隐私

所有压缩、解码、编码、下载都发生在你的浏览器内，文件**不会**离开本机。刷新页面后，已加入的图片不会保留。

## 兼容性

- Chrome / Edge / Firefox / Safari 14+
- 需要支持 `canvas.toBlob` 与 `URL.createObjectURL`
- 不支持 IE

## 文件说明

- `index.html` - 页面骨架，引入 CDN 脚本和样式
- `styles.css` - 全部样式（CSS 变量 + 明暗主题）
- `app.js` - 全部业务逻辑（状态、压缩、渲染、下载）
- `verify.py` - 静态校验器（无依赖），跑 `python verify.py` 校验关键路径
- `README.md` - 本文件

## 已知限制

- 不处理 GIF（动图）、HEIC、TIFF、RAW 等格式
- 单文件 > 50MB 会弹窗确认，避免浏览器 OOM
- WebP 编码在极少数老版浏览器中不可用，工具会自动检测并禁用 WebP 输出选项

## CDN

- JSZip 3.10.1 - ZIP 打包
- UPNG.js 2.1.0 - PNG 解码与重编码

## 部署到 GitHub Pages

1. 在仓库 **Settings → Pages** 里把 Source 设为 `Deploy from a branch`，Branch 选 `main` / `(root)`
2. 几分钟后访问 <https://noir02.github.io/image-compressor/> 即可
3. 由于是纯静态文件，任何静态服务器都能托管（Netlify / Vercel / Cloudflare Pages 都行）

## 开发

```bash
git clone https://github.com/noir02/image-compressor.git
cd image-compressor
python verify.py   # 静态校验：括号、ID、class、必填 feature、回归断言
```

## License

[MIT](./LICENSE)
