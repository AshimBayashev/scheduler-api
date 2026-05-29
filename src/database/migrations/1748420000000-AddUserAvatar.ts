import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAvatar1748420000000 implements MigrationInterface {
  name = 'AddUserAvatar1748420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "avatarUrl" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatarUrl"`);
  }
}
