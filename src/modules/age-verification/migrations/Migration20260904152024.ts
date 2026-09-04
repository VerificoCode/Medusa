import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260904152024 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "age_verification" ("id" text not null, "order_id" text not null, "status" text check ("status" in ('not_required', 'pending', 'verified', 'low_risk', 'high_risk', 'failed')) not null default 'pending', "provider" text not null default 'verifico', "provider_reference" text null, "verified_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "age_verification_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_age_verification_deleted_at" ON "age_verification" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "age_verification" cascade;`);
  }

}
