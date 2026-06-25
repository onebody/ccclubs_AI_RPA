import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSetup1700000000001 implements MigrationInterface {
  name = 'InitialSetup1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建租户表
    await queryRunner.query(`
      CREATE TABLE "tenant" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "status" VARCHAR(20) DEFAULT 'active',
        "concurrent_limit" INT DEFAULT 5,
        "expire_time" TIMESTAMP,
        "api_token" VARCHAR(255),
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tenant_status" ON "tenant" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tenant_expire" ON "tenant" ("expire_time")
    `);

    // 创建流程模板表
    await queryRunner.query(`
      CREATE TABLE "rpa_process" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "tenant_id" UUID NOT NULL REFERENCES "tenant" ("id"),
        "status" VARCHAR(20) DEFAULT 'active',
        "session_cache_enable" BOOLEAN DEFAULT true,
        "session_ttl" INT DEFAULT 3600,
        "delay_mode" VARCHAR(20) DEFAULT 'balance',
        "login_config" JSONB,
        "scene_list" JSONB,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_process_tenant" ON "rpa_process" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_process_status" ON "rpa_process" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_process_deleted" ON "rpa_process" ("deleted_at")
    `);

    // 创建API数据源表
    await queryRunner.query(`
      CREATE TABLE "api_data_source" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "tenant_id" UUID NOT NULL REFERENCES "tenant" ("id"),
        "method" VARCHAR(10) DEFAULT 'GET',
        "url" VARCHAR(500) NOT NULL,
        "headers" JSONB,
        "params" JSONB,
        "data_path" VARCHAR(100) DEFAULT 'data.list',
        "pagination_config" JSONB,
        "batch_size" INT DEFAULT 50,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_api_source_tenant" ON "api_data_source" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_api_source_deleted" ON "api_data_source" ("deleted_at")
    `);

    // 创建任务调度表
    await queryRunner.query(`
      CREATE TABLE "rpa_task" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL REFERENCES "tenant" ("id"),
        "process_id" UUID NOT NULL REFERENCES "rpa_process" ("id"),
        "scene_id" VARCHAR(50),
        "api_source_id" UUID REFERENCES "api_data_source" ("id"),
        "task_data" JSONB,
        "status" VARCHAR(20) DEFAULT 'pending',
        "progress" INT DEFAULT 0,
        "result" JSONB,
        "error_msg" TEXT,
        "retry_count" INT DEFAULT 0,
        "start_time" TIMESTAMP,
        "end_time" TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_task_tenant" ON "rpa_task" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_task_status" ON "rpa_task" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_task_process" ON "rpa_task" ("process_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_task_time" ON "rpa_task" ("created_at")
    `);

    // 创建沙箱会话缓存表
    await queryRunner.query(`
      CREATE TABLE "sandbox_session" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL REFERENCES "tenant" ("id"),
        "session_dir" VARCHAR(255) NOT NULL,
        "proxy_ip" VARCHAR(100),
        "user_agent" VARCHAR(500),
        "fingerprint" JSONB,
        "expire_time" TIMESTAMP,
        "status" VARCHAR(20) DEFAULT 'active',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_session_tenant" ON "sandbox_session" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_session_status" ON "sandbox_session" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_session_expire" ON "sandbox_session" ("expire_time")
    `);

    // 创建用户表
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL REFERENCES "tenant" ("id"),
        "username" VARCHAR(50) NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "email" VARCHAR(100),
        "phone" VARCHAR(20),
        "status" VARCHAR(20) DEFAULT 'active',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_tenant" ON "user" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_username" ON "user" ("username")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_deleted" ON "user" ("deleted_at")
    `);

    // 创建角色表
    await queryRunner.query(`
      CREATE TABLE "role" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL REFERENCES "tenant" ("id"),
        "name" VARCHAR(50) NOT NULL,
        "description" VARCHAR(200),
        "status" VARCHAR(20) DEFAULT 'active',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_role_tenant" ON "role" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_role_deleted" ON "role" ("deleted_at")
    `);

    // 创建权限表
    await queryRunner.query(`
      CREATE TABLE "permission" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL REFERENCES "tenant" ("id"),
        "name" VARCHAR(50) NOT NULL,
        "resource" VARCHAR(100) NOT NULL,
        "action" VARCHAR(50) NOT NULL,
        "description" VARCHAR(200),
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_permission_tenant" ON "permission" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_permission_resource" ON "permission" ("resource")
    `);

    // 创建用户角色关联表
    await queryRunner.query(`
      CREATE TABLE "user_role" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "user" ("id"),
        "role_id" UUID NOT NULL REFERENCES "role" ("id"),
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_role_user" ON "user_role" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_role_role" ON "user_role" ("role_id")
    `);

    // 创建角色权限关联表
    await queryRunner.query(`
      CREATE TABLE "role_permission" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "role_id" UUID NOT NULL REFERENCES "role" ("id"),
        "permission_id" UUID NOT NULL REFERENCES "permission" ("id"),
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_role_permission_role" ON "role_permission" ("role_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_role_permission_permission" ON "role_permission" ("permission_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "role_permission"`);
    await queryRunner.query(`DROP TABLE "user_role"`);
    await queryRunner.query(`DROP TABLE "permission"`);
    await queryRunner.query(`DROP TABLE "role"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "sandbox_session"`);
    await queryRunner.query(`DROP TABLE "rpa_task"`);
    await queryRunner.query(`DROP TABLE "api_data_source"`);
    await queryRunner.query(`DROP TABLE "rpa_process"`);
    await queryRunner.query(`DROP TABLE "tenant"`);
  }
}