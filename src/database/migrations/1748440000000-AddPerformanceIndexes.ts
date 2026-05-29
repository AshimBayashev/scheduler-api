import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1748440000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1748440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_events_userId_start" ON "events" ("userId", "start")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_push_subscriptions_userId" ON "push_subscriptions" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_push_subscriptions_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_events_userId_start"`);
  }
}
