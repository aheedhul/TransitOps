import { pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const healthz = pgTable('healthz', {
  id: varchar('id', { length: 36 }).primaryKey(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
});
