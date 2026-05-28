import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReminders1748400000000 implements MigrationInterface {
  name = 'AddReminders1748400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "timezone" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "events"
      ADD COLUMN "reminderMinutesBefore" integer DEFAULT 15
    `);

    await queryRunner.query(`
      ALTER TABLE "routines"
      ADD COLUMN "reminderMinutesBefore" integer DEFAULT 15
    `);

    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "endpoint" text NOT NULL,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_subscriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_push_subscriptions_endpoint" UNIQUE ("endpoint"),
        CONSTRAINT "FK_push_subscriptions_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sent_reminders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "sourceType" character varying(16) NOT NULL,
        "sourceId" uuid NOT NULL,
        "fireAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "sentAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sent_reminders_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sent_reminders_dedup" UNIQUE ("userId", "sourceType", "sourceId", "fireAt")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sent_reminders_fireAt" ON "sent_reminders" ("fireAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sent_reminders"`);
    await queryRunner.query(`DROP TABLE "push_subscriptions"`);
    await queryRunner.query(
      `ALTER TABLE "routines" DROP COLUMN "reminderMinutesBefore"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP COLUMN "reminderMinutesBefore"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "timezone"`);
  }
}
