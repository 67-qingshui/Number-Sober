# ADR-0001: 本地优先的桌面架构(Electron + Next.js + SQLite)

- 日期:2026-08-25
- 状态:已接受

## 背景

Number Sober 是个人记账/分账工具,需打包为 macOS dmg(兼容 M5/arm64),数据本地保存,云端仅作备份。

## 决策

- **Next.js(App Router)+ TypeScript** 作为应用框架,Electron 壳内嵌本地 server(localhost),渲染进程加载本地 URL;electron-builder 打 dmg(arm64)。
- **SQLite(better-sqlite3)直连 + 自制版本化 SQL 迁移** 作为本地数据存储,单文件置于用户数据目录(迁移只增不改、幂等、事务化,见 `src/server/migrate.ts`)。
- **备份**:应用内一键导出 + 定时自动备份,写入用户指定的 **Google Drive 同步文件夹**,由 Google 桌面客户端自动上云;不引入 OAuth/API。

## 权衡

| 备选 | 放弃原因 |
|---|---|
| Tauri | 本机无 Rust 工具链;Web 技术栈下 Electron 更省事 |
| 纯前端(IndexedDB) | 无 server 侧事务能力,记账数据需要强一致性与单文件备份 |
| 云数据库(Postgres 等) | 违背本地优先;数据隐私敏感 |
| Google Drive API(OAuth) | 需要用户申请云凭据,复杂度高;同步文件夹方案零配置 |

## 后果

- 数据完全本地,备份=复制文件,可离线使用。
- Electron 体积较大、内存占用偏高(可接受)。
- 多设备同步依赖 Google Drive 冲突处理,不做实时协同(明确非目标)。
