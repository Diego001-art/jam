# Словарь данных

Схемы с проверками — `src/lib/schemas.ts`. Даты — `ГГГГ-ММ-ДД`.

## data/products.json
| Поле | Тип | Смысл |
|---|---|---|
| id | строка | уникальный id, латиница |
| lenderId | строка | id кредитора из `lenders.json` |
| productName | строка | название продукта у банка |
| productType | cash · card · mortgage · auto · refi · debit · pledge · deposit | вид (для `deposit` ПСК не требуется; ставка — доходность вклада) |
| url | URL или null | официальная страница продукта |
| affiliateUrl | URL или null | партнёрская ссылка; требует `disclosure` |
| amountMin/Max | ₽ | сумма (для карт — кредитный лимит) |
| termMin/Max | месяцы | срок |
| rateMin/Max | % годовых | процентная ставка |
| pskMin/Max | % годовых | полная стоимость кредита; обязательна, если указана ставка |
| gracePeriodDays | дни | льготный период карты |
| downPaymentMin | % | первоначальный взнос (ипотека) |
| cashback, depositRate | % | для дебетовых карт |
| fee | текст | обслуживание/комиссии |
| eligibility | список | требования к заёмщику |
| conditions | текст | прочие условия |
| pros, cons | списки | преимущества и недостатки; только факты из источника |
| image | путь в `public/` или null | изображение продукта; только при наличии права использования, файл должен существовать |
| regionIds | список | где доступен: `["*"]` — вся Россия |
| hidden.districts/regions/cities | списки id | где не показывать |
| sourceUrl, checkedAt, validUntil | URL, даты | источник, дата проверки, до какой даты актуально |
| status | draft · review · published · archived | публикационный статус |
| approvedBy | строка | кто подтвердил |
| disclosure | текст | раскрытие для партнёрской ссылки |

## data/offers.json (публичная часть партнёрского оффера)
Репозиторий публичный, поэтому здесь нет ссылок, сетей, сумм вознаграждения и условий выплат — они в базе бэкенда (`docs/decisions/0004-backend.md`).
| Поле | Смысл |
|---|---|
| id | id оффера; кнопка на сайте ведёт на `/go/{id}` |
| productId | продукт из `products.json` |
| status | draft · published · archived |
| advertiser | рекламодатель для маркировки |
| erid | токен маркировки, если требуется |
| disclosure | текст раскрытия партнёрского характера |
| approvedBy | кто подтвердил |

Поле `affiliateUrl` у продукта устарело: оставлено для совместимости, валидатор предупреждает, если оно заполнено.

## data/lenders.json
id, slug, name, legalName, cbrLicense, officialUrl, domain, colors, logo, partnership (none · affiliate · contract), status, checkedAt, approvedBy, sources[], notes.

## data/cities.json
id (служебный), slug (в адресе), name, nameIn (предложный падеж), regionId, geoMatch (шаблон для определения по IP), banner, thumb, indexStatus (draft · review · published · noindex · archived), indexable, population (со ссылкой на источник), searchEvidence, localFacts[] (текст + источник + дата), contentVersion, editor, reviewedAt. `published` не означает `indexable`.

## data/regions.json
districts[] (федеральные округа) и regions[] (id, slug, name, districtId).

## data/site.json
siteName, siteUrl, mode (preview · production), indexing, geoLookup, goBaseUrl (адрес бэкенда `/go/`; null — кнопки ведут на официальные сайты банков), metrikaId (номер счётчика Яндекс Метрики; загружается только после согласия посетителя), operator{type: ООО · ИП · АО · ПАО · самозанятый, …}, commercial{model, affiliateLinks, disclosure}, conditionsCheckedAt, calculator{source, sourceUrl, rates}.

## content/faq.json
Вопросы и ответы: `q`, `a`, `types` (виды продуктов или `"*"`). Только о работе сервиса и общих понятиях, без условий конкретных банков и обещаний. Выводятся на страницах видов продуктов и на `/voprosy/` с разметкой FAQPage.
