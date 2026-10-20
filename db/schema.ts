import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const entries=sqliteTable('entries',{
 id:text('id').primaryKey(),date:text('date').notNull(),title:text('title').notNull(),
 startDate:text('start_date'),endDate:text('end_date'),priority:text('priority'),success:text('success'),version:integer('version').notNull().default(0),
 planned:integer('planned').notNull(),actual:integer('actual'),done:text('done').notNull().default(''),review:text('review').notNull().default(''),next:text('next').notNull().default(''),parent:text('parent').notNull().default('')
});
export const planHistory=sqliteTable('plan_history',{entryId:text('entry_id').notNull(),version:integer('version').notNull(),snapshot:text('snapshot').notNull(),savedAt:text('saved_at').notNull()},t=>[primaryKey({columns:[t.entryId,t.version]})]);
