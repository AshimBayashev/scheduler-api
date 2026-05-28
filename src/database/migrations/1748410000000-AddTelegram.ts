import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelegram1748410000000 implements MigrationInterface {
  name = 'AddTelegram1748410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "telegramChatId" character varying
    `);

    await queryRunner.query(`
      CREATE TABLE "telegram_link_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "token" character varying NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_telegram_link_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_telegram_link_tokens_token" UNIQUE ("token"),
        CONSTRAINT "FK_telegram_link_tokens_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "telegram_link_tokens"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "telegramChatId"`);
  }
}
