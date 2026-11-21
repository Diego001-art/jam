# Сайт подбора кредитных предложений

Статический сайт на Next.js (App Router, TypeScript strict, Zod). Каждая страница собирается в готовый HTML — основной текст доступен роботу без выполнения скриптов. Хостинг на этапе подготовки — GitHub Pages (`https://diego001-art.github.io/jam/`), сайт закрыт от индексации до запуска.

## Установка и команды

```bash
npm ci
npm run dev        # http://localhost:3000/jam/
npm run validate   # проверка данных
npm test           # тесты
npm run build      # сборка в out/ и SEO-проверка
```

Node.js 22 LTS. Префикс адресов задаёт `NEXT_PUBLIC_BASE_PATH` (по умолчанию `/jam`; для собственного домена — пусто).

## Где что лежит

| Что | Где |
|---|---|
| Настройки, реквизиты оператора, флаг индексации | `data/site.json` |
| Кредиторы | `data/lenders.json` |
| Продукты и условия | `data/products.json` |
| Федеральные округа и регионы | `data/regions.json` |
| Города и статус публикации | `data/cities.json` |
| Тексты страниц | `content/texts.json` |
| Материалы гида | `content/guides/*.json` |
| Схемы и инварианты | `src/lib/schemas.ts`, `src/lib/eligibility.ts` |
| Админка | `public/admin/index.html` → `/admin/` |

## Публикационный процесс

1. Редактор вносит условие продукта в админке: источник, дата проверки, срок актуальности, кто подтвердил.
2. Статус `published` выставляется только после проверки. Валидатор не даст собрать сайт, если у опубликованного продукта нет обязательных полей или истёк срок.
3. «Опубликовать» в админке делает коммит в `main`; GitHub Actions проверяет данные, собирает и выкладывает сайт (1–2 минуты).
4. Индексация включается в `data/site.json` (`indexing: true`, `mode: "production"`) только после заполнения реквизитов оператора и юридической проверки — см. `docs/release-checklist.md`.

## Адреса

`/`, `/kredity/`, `/kredity/{вид}/`, `/banki/`, `/banki/{slug}/`, `/goroda/`, `/goroda/{регион}/`, `/goroda/{регион}/{город}/`, `/gid/`, `/gid/{slug}/`, `/kalkulyator/`, `/o-proekte/`, `/kontakty/`, `/pravovaya-informatsiya/` (+ `privacy`, `consent`, `cookies`). Старые адреса `/kazan/` ведут на новые.
