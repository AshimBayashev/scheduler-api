import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoutines1748360000000 implements MigrationInterface {
  name = 'AddRoutines1748360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "routines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "description" text,
        "startTime" character varying(5) NOT NULL,
        "durationMinutes" integer NOT NULL DEFAULT 30,
        "daysOfWeek" jsonb NOT NULL,
        "color" character varying NOT NULL DEFAULT '#038387',
        "active" boolean NOT NULL DEFAULT true,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_routines_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_routines_userId" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_routines_userId" ON "routines" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "routines"`);
  }
}
