import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260907102921 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "age_verification_settings" ("id" text not null, "domain" text null, "widget_base_url" text null, "widget_version" text null, "mode" text check ("mode" in ('all', 'category', 'product')) null, "category_ids" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "age_verification_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_age_verification_settings_deleted_at" ON "age_verification_settings" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "age_verification_settings" cascade;`);
  }

}
