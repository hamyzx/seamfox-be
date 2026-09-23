import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAdminJobFields1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'jobs',
      new TableColumn({
        name: 'createdByType',
        type: 'enum',
        enum: ['company', 'admin'],
        default: "'company'",
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'jobs',
      new TableColumn({
        name: 'createdByAdminId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'jobs',
      new TableColumn({
        name: 'companyName',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'jobs',
      new TableColumn({
        name: 'companyLogo',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'jobs',
      new TableColumn({
        name: 'hideCompanyName',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    await queryRunner.changeColumn(
      'jobs',
      'companyId',
      new TableColumn({
        name: 'companyId',
        type: 'int',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('jobs', 'hideCompanyName');
    await queryRunner.dropColumn('jobs', 'companyLogo');
    await queryRunner.dropColumn('jobs', 'companyName');
    await queryRunner.dropColumn('jobs', 'createdByAdminId');
    await queryRunner.dropColumn('jobs', 'createdByType');

    await queryRunner.changeColumn(
      'jobs',
      'companyId',
      new TableColumn({
        name: 'companyId',
        type: 'int',
        isNullable: false,
      }),
    );
  }
}
