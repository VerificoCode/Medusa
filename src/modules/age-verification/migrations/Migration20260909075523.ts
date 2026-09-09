import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260909075523 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "age_verification" drop constraint if exists "age_verification_status_check";`);

    this.addSql(`alter table if exists "age_verification" add constraint "age_verification_status_check" check("status" in ('not_required', 'pending', 'pending_age_verification', 'verified', 'low_risk', 'high_risk', 'failed'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "age_verification" drop constraint if exists "age_verification_status_check";`);

    this.addSql(`alter table if exists "age_verification" add constraint "age_verification_status_check" check("status" in ('not_required', 'pending', 'verified', 'low_risk', 'high_risk', 'failed'));`);
  }

}
