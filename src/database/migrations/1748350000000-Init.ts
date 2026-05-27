import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1748350000000 implements MigrationInterface {
  name = 'Init1748350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "name" character varying,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "description" text,
        "start" TIMESTAMPTZ NOT NULL,
        "end" TIMESTAMPTZ NOT NULL,
        "allDay" boolean NOT NULL DEFAULT false,
        "color" character varying NOT NULL DEFAULT '#6264A7',
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_events_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_events_userId" ON "events" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
