# AGENTS.md

## Agent skills

### Issue tracker

开发票据在 GitHub Issues(仓库 `67-qingshui/Number-Sober`),发布与更新走 GitHub REST API(本机无 gh CLI,用 osxkeychain 凭据 + curl)。见 `docs/agents/issue-tracker.md`。

### Triage labels

默认词汇表:`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`。见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文布局:根目录 `CONTEXT.md`(术语表)+ `docs/adr/`(架构决策)。见 `docs/agents/domain.md`。
