import {sqliteTable,text,integer,primaryKey,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const entries=sqliteTable('entries',{
 id:text('id').primaryKey(),date:text('date').notNull(),title:text('title').notNull(),
 startDate:text('start_date'),endDate:text('end_date'),priority:text('priority'),success:text('success'),version:integer('version').notNull().default(0),
 planned:integer('planned').notNull(),actual:integer('actual'),done:text('done').notNull().default(''),review:text('review').notNull().default(''),next:text('next').notNull().default(''),parent:text('parent').notNull().default('')
});
export const planHistory=sqliteTable('plan_history',{entryId:text('entry_id').notNull(),version:integer('version').notNull(),snapshot:text('snapshot').notNull(),savedAt:text('saved_at').notNull()},t=>[primaryKey({columns:[t.entryId,t.version]})]);
export const tasks=sqliteTable('tasks',{
 id:text('id').primaryKey(),planId:text('plan_id').notNull().references(()=>entries.id,{onDelete:'cascade'}),title:text('title').notNull(),dueDate:text('due_date').notNull(),priority:text('priority').notNull(),tags:text('tags').notNull(),estimated:integer('estimated'),completed:integer('completed',{mode:'boolean'}).notNull().default(false),createdAt:text('created_at').notNull(),version:integer('version').notNull().default(0)
});

export const executions=sqliteTable('executions',{id:text('id').primaryKey(),taskId:text('task_id').notNull().references(()=>tasks.id,{onDelete:'cascade'}),startedAt:text('started_at').notNull(),endedAt:text('ended_at').notNull(),minutes:integer('minutes').notNull(),blocked:text('blocked').notNull(),note:text('note').notNull(),createdAt:text('created_at').notNull()},t=>[uniqueIndex('execution_session').on(t.taskId,t.startedAt,t.endedAt)]);
export const completions=sqliteTable('completions',{id:text('id').primaryKey(),taskId:text('task_id').notNull().references(()=>tasks.id,{onDelete:'cascade'}),taskVersion:integer('task_version').notNull(),createdAt:text('created_at').notNull()},t=>[uniqueIndex('completion_cycle').on(t.taskId,t.taskVersion)]);
export const carryovers=sqliteTable('carryovers',{sourcePlanId:text('source_plan_id').primaryKey(),nextPlanId:text('next_plan_id').notNull(),improvement:text('improvement').notNull(),nextDate:text('next_date').notNull().default('2026-10-21'),planned:integer('planned').notNull().default(30),createdAt:text('created_at').notNull()});


