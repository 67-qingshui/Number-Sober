<div align="center">

# Number Sober <sub>明算</sub>

**本地优先的个人记账与资产管理工具**

AA 分账 · 资产摊销 · AI 成本追踪 · 积分体系 · 数据自主

[![Release](https://img.shields.io/github/v/release/67-qingshui/Number-Sober?style=flat-square)](https://github.com/67-qingshui/Number-Sober/releases)
[![Tests](https://img.shields.io/badge/tests-281%20passing-brightgreen?style=flat-square)]()
[![Platform](https://img.shields.io/badge/platform-macOS%20Apple%20Silicon-lightgrey?style=flat-square)]()
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

[下载安装包](#-安装) · [功能总览](#-功能) · [技术架构](#-技术架构) · [开发](#-开发)

</div>

---

## ✨ 为什么做这个

市面上的记账工具要么把数据存在云端,要么塞满你用不到的功能。

**Number Sober** 反其道而行:

- 🔒 **数据 100% 本地** — SQLite 单文件存储,不联网、不上传、无账号体系
- 🧾 **为真实场景而生** — AA 分账、物品摊销、AI Token 成本,都是日常真实需求
- 💴 **日元原生支持** — 为在日生活设计,积分即现金(1 积分 = 1 日元,可配置)
- 📦 **一个 dmg 搞定** — 双击安装,开箱即用,无需配置环境

## 📦 安装

从 [Releases](https://github.com/67-qingshui/Number-Sober/releases/latest) 下载 `Number.Sober-x.x.x-arm64.dmg`:

1. 打开 dmg,将 **Number Sober** 拖入 **Applications**
2. 首次启动会引导你设置管理员密码
3. 完成 — 所有数据存储在本机应用数据目录

> 需要 macOS 12+ / Apple Silicon(M 系列芯片)

## 📖 功能

### 🧾 AA 账单
- 三种分摊方式:**均分**(自动处理除不尽的余数)、**自定义金额**(精确到日元)、**比例权重**
- 多条目账单,每个条目独立设置参与人与分摊规则
- 自动计算每人的**应还 / 应收**,一键结算,支持反结算纠错

### 📦 物品使用
- **资产摊销**:直线摊销法,实时显示月摊销额与当前剩余价值
- **使用时长**:记录每次使用的时间段,自动计算时长
- **消耗品库存**:墨盒、耗材等库存增减,完整变更流水

### ⚡ Token 利用
- 手动录入或 **CSV 批量导入** AI 用量(输入 / 缓存命中 / 输出)
- 按**天**、按**模型**两个维度的成本统计
- 内置模型单价表,Token 成本自动换算成美元

### 🎁 积分
- 消费返现:可配置返现比例,**立即到账 + 延迟到账**灵活拆分
- **待入账日历**:未来每天的到账金额一目了然
- 抵扣消费、转账、手动调整,全流程闭环
- 积分即日元:汇率可调,默认 1 积分 = 1 日元

### ⚙️ 管理员
- 单管理员密码保护,scrypt 加密存储
- 一键备份 / 还原(SQLite 快照),**启动时自动定时备份**,保留最近 7 份
- 总览仪表盘:参与人、进行中账单、应收合计、积分余额、资产现值,一屏尽览

## 🏗️ 技术架构

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16 (App Router) + React 19 + TypeScript |
| 后端 | Next.js Route Handlers(Node runtime) |
| 数据库 | SQLite(better-sqlite3)+ 自制版本化迁移(v13) |
| 桌面壳 | Electron 43 + electron-builder(dmg) |
| 测试 | Vitest 4 + Testing Library,**281 个测试**覆盖四层 |

```
src/
├── lib/          # 纯函数算法层(分摊、结算、摊销、统计)— 100% 可测
├── server/       # 业务服务层(SQLite 读写、校验、事务)
├── app/api/      # REST API 路由(31 个端点)
├── components/   # React 组件
└── app/(main)/   # 页面(AA / 物品 / Token / 积分 / 设置)
```

**分层测试策略**:纯函数单测 → service 层内存库集成测 → API 路由 handler 测 → React 组件渲染测,层层递进互为防线。

## 🛠️ 开发

```bash
# 克隆
git clone https://github.com/67-qingshui/Number-Sober.git
cd Number-Sober

# 安装依赖
npm install

# 启动开发服务器
npm run dev              # http://localhost:3000

# 运行测试
npm test

# 打包桌面应用(dmg)
npm run make             # 产物在 release/
```

环境要求:Node.js 22+,macOS 打包需 Apple Silicon。

## 🗺️ Roadmap

- [ ] 数据可视化图表(支出趋势、模型成本曲线)
- [ ] CSV / JSON 全量数据导出
- [ ] 多币种支持
- [ ] Windows 版本

## 📄 License

[MIT](LICENSE) © [67-qingshui](https://github.com/67-qingshui)

---

<div align="center">

**明算者,不糊涂。**

</div>
