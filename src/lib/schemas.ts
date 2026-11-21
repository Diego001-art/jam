import { z } from "zod";

/** Дата в формате ГГГГ-ММ-ДД. */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "дата в формате ГГГГ-ММ-ДД");
const url = z.string().url();
const nullableStr = z.string().min(1).nullable();

export const StatusSchema = z.enum(["draft", "review", "published", "archived"]);
export const CityIndexStatusSchema = z.enum(["draft", "review", "published", "noindex", "archived"]);
export const ProductTypeIdSchema = z.enum(["cash", "card", "mortgage", "auto", "refi", "debit", "pledge", "deposit"]);

export const SourceSchema = z.object({
  url,
  title: z.string().min(1),
  checkedAt: isoDate,
});

export const SiteSchema = z.object({
  siteName: z.string().min(1),
  siteUrl: url,
  mode: z.enum(["preview", "production"]),
  /** Пока false — на всех страницах noindex, robots.txt закрыт, sitemap пустой. */
  indexing: z.boolean(),
  /** Определение города по IP через сторонний сервис. */
  geoLookup: z.boolean(),
  /** Адрес бэкенда /go/ (например https://go.example.ru). Пока null — кнопки ведут на официальные сайты. */
  goBaseUrl: url.nullable().default(null),
  operator: z.object({
    type: z.enum(["ООО", "ИП", "АО", "ПАО", "самозанятый"]).nullable(),
    name: nullableStr,
    inn: z.string().regex(/^\d{10}(\d{2})?$/, "ИНН — 10 или 12 цифр").nullable(),
    ogrn: z.string().regex(/^\d{13}(\d{2})?$/, "ОГРН/ОГРНИП — 13 или 15 цифр").nullable(),
    address: nullableStr,
    email: z.string().email().nullable(),
    phone: nullableStr,
    pdResponsible: nullableStr,
    pdEmail: z.string().email().nullable(),
  }),
  commercial: z.object({
    model: nullableStr,
    affiliateLinks: z.boolean(),
    disclosure: nullableStr,
  }),
  conditionsCheckedAt: isoDate.nullable(),
  calculator: z.object({
    source: z.string().min(1),
    sourceUrl: url,
    /** [порог суммы или null, среднерыночная ПСК, предельная ПСК] */
    rates: z.record(z.array(z.tuple([z.number().nullable(), z.number(), z.number()])).min(1)),
  }),
});

export const ProductTypeSchema = z.object({
  id: ProductTypeIdSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  one: z.string().min(1),
  title: z.string().min(1),
});

export const RegionsSchema = z.object({
  districts: z.array(z.object({ id: z.string().min(1), short: z.string().min(1), name: z.string().min(1) })),
  regions: z.array(
    z.object({
      id: z.string().min(1),
      slug: z.string().regex(/^[a-z0-9-]+$/),
      name: z.string().min(1),
      districtId: z.string().min(1),
    }),
  ),
});

export const LocalFactSchema = z.object({ text: z.string().min(1), source: SourceSchema });

export const CitySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  nameIn: z.string().min(1),
  regionId: z.string().min(1),
  geoMatch: z.string().min(1),
  banner: z.string().min(1),
  thumb: z.string().min(1),
  indexStatus: CityIndexStatusSchema,
  /** «Опубликовано» ещё не значит «индексируется» — флаг ставит редактор после шлюза. */
  indexable: z.boolean(),
  population: z.object({ value: z.number().int().positive(), source: SourceSchema }).nullable(),
  searchEvidence: z.string().min(1).nullable(),
  localFacts: z.array(LocalFactSchema),
  contentVersion: z.number().int().positive(),
  editor: nullableStr,
  reviewedAt: isoDate.nullable(),
});

export const LenderSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  legalName: nullableStr,
  cbrLicense: nullableStr,
  officialUrl: url,
  domain: z.string().min(1),
  colors: z.object({ c1: z.string().regex(/^#[0-9A-Fa-f]{6}$/), c2: z.string().regex(/^#[0-9A-Fa-f]{6}$/) }),
  logo: nullableStr,
  partnership: z.enum(["none", "affiliate", "contract"]),
  status: StatusSchema,
  checkedAt: isoDate.nullable(),
  approvedBy: nullableStr,
  sources: z.array(SourceSchema),
  notes: z.string().nullable(),
});

const num = z.number().nonnegative().nullable();

export const ProductSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  lenderId: z.string().min(1),
  productName: z.string().min(1),
  productType: ProductTypeIdSchema,
  url: url.nullable(),
  affiliateUrl: url.nullable(),
  /** Сумма, ₽ */
  amountMin: num,
  amountMax: num,
  /** Срок, месяцев */
  termMin: num,
  termMax: num,
  /** Ставка, % годовых */
  rateMin: num,
  rateMax: num,
  /** Полная стоимость кредита, % годовых */
  pskMin: num,
  pskMax: num,
  gracePeriodDays: num,
  /** Первоначальный взнос, % */
  downPaymentMin: num,
  /** Кешбэк, % */
  cashback: num,
  /** Процент на остаток, % годовых */
  depositRate: num,
  fee: nullableStr,
  /** Преимущества и недостатки — только подтверждённые источником факты. */
  pros: z.array(z.string().min(1)).default([]),
  cons: z.array(z.string().min(1)).default([]),
  /** Изображение продукта: файл в public/ (только при наличии права использования). */
  image: nullableStr.default(null),
  eligibility: z.array(z.string().min(1)),
  conditions: nullableStr,
  tags: z.array(z.string().min(1)),
  /** Где продукт доступен: ["*"] — вся Россия, иначе id регионов. */
  regionIds: z.array(z.string().min(1)).min(1),
  /** Где не показывать: федеральные округа, регионы, города. */
  hidden: z.object({
    districts: z.array(z.string()),
    regions: z.array(z.string()),
    cities: z.array(z.string()),
  }),
  sourceUrl: url.nullable(),
  checkedAt: isoDate.nullable(),
  validUntil: isoDate.nullable(),
  status: StatusSchema,
  disclosure: nullableStr,
  approvedBy: nullableStr,
  sortOrder: z.number().int(),
});

/**
 * Публичная часть партнёрского оффера. Репозиторий публичный, поэтому здесь НЕТ
 * партнёрских ссылок, сетей, сумм вознаграждения и условий выплат — они хранятся
 * в базе бэкенда (docs/decisions/0004-backend.md). Кнопка на сайте ведёт на /go/{id}.
 */
export const OfferSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  productId: z.string().min(1),
  status: z.enum(["draft", "published", "archived"]),
  /** Рекламодатель для маркировки рекламы (наименование и ИНН/сведения). */
  advertiser: nullableStr,
  /** Токен маркировки (ERID), если он требуется и получен через ОРД. */
  erid: nullableStr,
  /** Текст раскрытия партнёрского характера ссылки. */
  disclosure: nullableStr,
  approvedBy: nullableStr,
});

export const GuideBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), text: z.string().min(1) }),
  z.object({ type: z.literal("h2"), text: z.string().min(1) }),
  z.object({ type: z.literal("ul"), items: z.array(z.string().min(1)).min(1) }),
]);

export const GuideSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  description: z.string().min(1),
  status: StatusSchema,
  indexable: z.boolean(),
  author: nullableStr,
  editor: nullableStr,
  publishedAt: isoDate.nullable(),
  updatedAt: isoDate.nullable(),
  reviewDue: isoDate.nullable(),
  blocks: z.array(GuideBlockSchema).min(1),
  sources: z.array(SourceSchema),
});

export const AuthorsSchema = z.array(
  z.object({ id: z.string().min(1), name: z.string().min(1), role: z.string().min(1), bio: z.string().nullable() }),
);

export const TextsSchema = z.record(z.string());

export type Site = z.infer<typeof SiteSchema>;
export type ProductType = z.infer<typeof ProductTypeSchema>;
export type Regions = z.infer<typeof RegionsSchema>;
export type Region = Regions["regions"][number];
export type District = Regions["districts"][number];
export type City = z.infer<typeof CitySchema>;
export type Lender = z.infer<typeof LenderSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Offer = z.infer<typeof OfferSchema>;
export type Guide = z.infer<typeof GuideSchema>;
export type Source = z.infer<typeof SourceSchema>;
