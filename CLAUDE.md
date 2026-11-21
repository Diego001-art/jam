# CLAUDE.md

Перед работой прочитайте `AGENTS.md` (правила контента и безопасности) и `ТЗ.md`.

Быстрые команды:
- `npm run dev` — локальный сервер (http://localhost:3000/jam/)
- `npm run validate` — проверка данных и публикационного шлюза
- `npm test` — модульные тесты
- `npm run build` — статическая сборка в `out/` + SEO-проверка

Данные: `data/*.json`, тексты: `content/texts.json`, материалы гида: `content/guides/*.json`.
Админка: `public/admin/index.html` (правит JSON в репозитории через GitHub API; сайт пересобирается GitHub Actions).
