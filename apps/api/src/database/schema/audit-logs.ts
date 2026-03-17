import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Nullable: system-initiated actions (seed, migrations) have no actor.
    actorId: uuid('actor_id').references(() => users.id),
    // Examples: CREATE, UPDATE, DELETE
    action: varchar('action', { length: 50 }).notNull(),
    targetId: uuid('target_id'),
    entityName: varchar('entity_name', { length: 100 }).notNull(),
    // Snapshot of the request body (omitted for DELETE).
    changes: jsonb('changes'),
    ipAddress: varchar('ip_address', { length: 45 }),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_actor_id_idx').on(table.actorId),
    index('audit_logs_entity_name_idx').on(table.entityName),
    index('audit_logs_timestamp_idx').on(table.timestamp),
  ],
);
