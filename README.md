# 悦境 MALL

面向商业综合体的五层 3D 数字导览概念原型。包含 30 家店铺、程序化店型模型、全场搜索、逛购清单、本机运营概览和可下载游逛小票。

## 启动

需要 Node.js 22 或更新版本。Three.js 已随项目提供，无需安装依赖。

```sh
cd /Users/liciyan/Desktop/supermarket
npm run dev
```

打开 http://127.0.0.1:5173/ 。macOS 也可双击 `启动商场.command`；终端按 Control+C 停止服务。

不要直接双击 index.html，ES Modules 需要 HTTP 服务。

## 体验

- 切换 B1 至 4F，或打开整栋总览点击楼板。
- 拖动场景旋转，滚轮或双指缩放，点击走廊让小人移动。
- 点击 3D 店铺或目录卡片查看详情、加入清单。
- 搜索支持全场店名、品类和商品。
- 清单支持数量调整、清空和 PNG 小票导出。
- 运营概览只展示当前浏览器的体验数据。

## 文档

- [产品文档](docs/产品文档.md)
- [技术文档](docs/技术文档.md)
- [验证记录](docs/验证记录.md)

## 检查

```sh
npm run check
```

静态托管只需 index.html、src/ 和 vendor/。所有模型与招牌由代码生成，不依赖远程图片或模型服务。vendor 为 Three.js 官方 r180 构建，许可见 vendor/THREE-LICENSE.txt。

手机打开 https://leeciyan62-ai.github.io/yuejing-mall/ 。街道场景沿用 [KoriIku/night-market](https://github.com/KoriIku/night-market) 的街区。商场、商品、价格、营业时间、设施位置均为概念演示，不提供支付、预约或真实导航。外婆家、海底捞、新发现仅作示例品牌名称，不代表入驻或合作。
