import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFamily1748430000000 implements MigrationInterface {
  name = 'AddFamily1748430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "families" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(100) NOT NULL,
        "ownerId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_families_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_families_owner" FOREIGN KEY ("ownerId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "family_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "familyId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" character varying(16) NOT NULL DEFAULT 'member',
        "joinedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_family_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_family_members_family_user" UNIQUE ("familyId", "userId"),
        CONSTRAINT "UQ_family_members_user" UNIQUE ("userId"),
        CONSTRAINT "FK_family_members_family" FOREIGN KEY ("familyId")
          REFERENCES "families"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_family_members_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "family_invitations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "familyId" uuid NOT NULL,
        "inviterId" uuid NOT NULL,
        "inviteeEmail" character varying NOT NULL,
        "inviteeId" uuid,
        "status" character varying(16) NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "respondedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_family_invitations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_family_invitations_family" FOREIGN KEY ("familyId")
          REFERENCES "families"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_family_invitations_inviter" FOREIGN KEY ("inviterId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_family_invitations_invitee" FOREIGN KEY ("inviteeId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_family_invitations_pending"
      ON "family_invitations" ("familyId", "inviteeEmail")
      WHERE "status" = 'pending'
    `);

    await queryRunner.query(`
      ALTER TABLE "events"
      ADD COLUMN "hiddenFromFamily" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "routines"
      ADD COLUMN "hiddenFromFamily" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "routines" DROP COLUMN "hiddenFromFamily"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP COLUMN "hiddenFromFamily"`,
    );
    await queryRunner.query(`DROP INDEX "UQ_family_invitations_pending"`);
    await queryRunner.query(`DROP TABLE "family_invitations"`);
    await queryRunner.query(`DROP TABLE "family_members"`);
    await queryRunner.query(`DROP TABLE "families"`);
  }
}
