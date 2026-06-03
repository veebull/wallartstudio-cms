import {
  pgTable, uuid, text, integer, boolean,
  timestamp, jsonb, pgEnum, date, real,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────
export const articleStatusEnum  = pgEnum('article_status',  ['draft','review','published','archived'])
export const authorTypeEnum     = pgEnum('author_type',     ['human','ai'])
export const userRoleEnum       = pgEnum('user_role',       ['admin','editor'])
export const jobStatusEnum      = pgEnum('job_status',      ['idle','running','paused','done','failed'])

// ─── Cities ───────────────────────────────────────────────────────────────────
export const cities = pgTable('cities', {
  id:              uuid('id').primaryKey().defaultRandom(),
  name:            text('name').notNull(),
  slug:            text('slug').notNull().unique(),
  region:          text('region').notNull(),
  federalDistrict: text('federal_district').notNull(),
  population:      integer('population'),
  hasArticle:      boolean('has_article').notNull().default(false),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
})

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        text('email').notNull().unique(),
  name:         text('name').notNull(),
  role:         userRoleEnum('role').notNull().default('editor'),
  passwordHash: text('password_hash').notNull(),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
})

// ─── Article templates (master copy that gets multiplied) ─────────────────────
export const articleTemplates = pgTable('article_templates', {
  id:         uuid('id').primaryKey().defaultRandom(),
  authorId:   uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  title:      text('title').notNull(),
  // blocks: array of { id, type, content, style, cols? }
  blocks:     jsonb('blocks').notNull().$type<Block[]>().default([]),
  status:     articleStatusEnum('status').notNull().default('draft'),
  nicheTopic: text('niche_topic').notNull().default('печать на стенах'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
})

// ─── Articles (city-specific instances) ───────────────────────────────────────
export const articles = pgTable('articles', {
  id:              uuid('id').primaryKey().defaultRandom(),
  cityId:          uuid('city_id').notNull().references(() => cities.id, { onDelete: 'cascade' }),
  templateId:      uuid('template_id').references(() => articleTemplates.id, { onDelete: 'set null' }),
  authorId:        uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  title:           text('title').notNull(),
  slug:            text('slug').notNull().unique(),
  blocks:          jsonb('blocks').notNull().$type<Block[]>().default([]),
  metaTitle:       text('meta_title'),
  metaDescription: text('meta_description'),
  status:          articleStatusEnum('status').notNull().default('draft'),
  authorType:      authorTypeEnum('author_type').notNull().default('ai'),
  wordCount:       integer('word_count').notNull().default(0),
  publishedAt:     timestamp('published_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
})

// ─── Agent jobs ────────────────────────────────────────────────────────────────
export const agentJobs = pgTable('agent_jobs', {
  id:           uuid('id').primaryKey().defaultRandom(),
  templateId:   uuid('template_id').references(() => articleTemplates.id, { onDelete: 'set null' }),
  status:       jobStatusEnum('status').notNull().default('idle'),
  citiesTotal:  integer('cities_total').notNull().default(0),
  citiesDone:   integer('cities_done').notNull().default(0),
  citiesFailed: integer('cities_failed').notNull().default(0),
  currentCity:  text('current_city'),
  settings:     jsonb('settings').$type<JobSettings>(),
  startedAt:    timestamp('started_at'),
  finishedAt:   timestamp('finished_at'),
})

export const agentLogs = pgTable('agent_logs', {
  id:        uuid('id').primaryKey().defaultRandom(),
  jobId:     uuid('job_id').notNull().references(() => agentJobs.id, { onDelete: 'cascade' }),
  cityId:    uuid('city_id').references(() => cities.id, { onDelete: 'set null' }),
  event:     text('event').notNull(), // started|generated|published|error|skipped
  message:   text('message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── Analytics ────────────────────────────────────────────────────────────────
export const pageViews = pgTable('page_views', {
  id:         uuid('id').primaryKey().defaultRandom(),
  articleId:  uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  visitorId:  text('visitor_id').notNull(), // anonymous fingerprint
  referrer:   text('referrer'),
  device:     text('device'),       // mobile|desktop|tablet
  timeOnPage: integer('time_on_page'), // seconds
  viewedAt:   timestamp('viewed_at').notNull().defaultNow(),
})

export const articleStats = pgTable('article_stats', {
  id:             uuid('id').primaryKey().defaultRandom(),
  articleId:      uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  statDate:       date('stat_date').notNull(),
  views:          integer('views').notNull().default(0),
  uniqueVisitors: integer('unique_visitors').notNull().default(0),
  avgTimeSec:     integer('avg_time_sec').notNull().default(0),
  ctaClicks:      integer('cta_clicks').notNull().default(0),
  bounceRate:     real('bounce_rate').notNull().default(0),
})

// ─── Relations ────────────────────────────────────────────────────────────────
export const citiesRelations = relations(cities, ({ many }) => ({
  articles: many(articles),
}))
export const usersRelations = relations(users, ({ many }) => ({
  articles: many(articles),
  templates: many(articleTemplates),
}))
export const articleTemplatesRelations = relations(articleTemplates, ({ one, many }) => ({
  author: one(users, { fields: [articleTemplates.authorId], references: [users.id] }),
  articles: many(articles),
  jobs: many(agentJobs),
}))
export const articlesRelations = relations(articles, ({ one, many }) => ({
  city: one(cities, { fields: [articles.cityId], references: [cities.id] }),
  template: one(articleTemplates, { fields: [articles.templateId], references: [articleTemplates.id] }),
  author: one(users, { fields: [articles.authorId], references: [users.id] }),
  pageViews: many(pageViews),
  stats: many(articleStats),
}))
export const agentJobsRelations = relations(agentJobs, ({ one, many }) => ({
  template: one(articleTemplates, { fields: [agentJobs.templateId], references: [articleTemplates.id] }),
  logs: many(agentLogs),
}))
export const agentLogsRelations = relations(agentLogs, ({ one }) => ({
  job: one(agentJobs, { fields: [agentLogs.jobId], references: [agentJobs.id] }),
  city: one(cities, { fields: [agentLogs.cityId], references: [cities.id] }),
}))
export const pageViewsRelations = relations(pageViews, ({ one }) => ({
  article: one(articles, { fields: [pageViews.articleId], references: [articles.id] }),
}))
export const articleStatsRelations = relations(articleStats, ({ one }) => ({
  article: one(articles, { fields: [articleStats.articleId], references: [articles.id] }),
}))

// ─── Types ────────────────────────────────────────────────────────────────────
export type Block = {
  id: string
  type: 'heading'|'text'|'cta'|'price'|'gallery'|'slider'|'divider'|'review'|'columns'
  content?: string
  style?: Record<string, string>
  cols?: Block[][]  // for columns block
  items?: Array<{ name: string; value: string }> // for price block
  images?: string[] // for gallery/slider
}

export type JobSettings = {
  batchSize: number
  delayMs: number
  autoPublish: boolean
  mode: 'adapt'|'variables_only'|'full_rewrite'
  district?: string
}
