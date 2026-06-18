-- CreateTable
CREATE TABLE "tenant" (
    "tenantId" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "quota" INTEGER NOT NULL DEFAULT 10,
    "aesKey" VARCHAR(256) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "browser_session" (
    "sessionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proxyId" VARCHAR(64),
    "status" VARCHAR(32) NOT NULL,
    "startTime" TIMESTAMP(3),
    "destroyTime" TIMESTAMP(3),
    "memoryLimit" VARCHAR(16) NOT NULL DEFAULT '2Gi',
    "cpuLimit" VARCHAR(16) NOT NULL DEFAULT '1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "browser_session_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "task_record" (
    "taskId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "taskType" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "duration" INTEGER,
    "resultPath" VARCHAR(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_record_pkey" PRIMARY KEY ("taskId")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "logId" SERIAL NOT NULL,
    "operatorId" VARCHAR(36) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" VARCHAR(36),
    "actionType" VARCHAR(64) NOT NULL,
    "actionTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("logId")
);

-- CreateTable
CREATE TABLE "script_template" (
    "templateId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "dslContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "script_template_pkey" PRIMARY KEY ("templateId")
);

-- AddForeignKey
ALTER TABLE "browser_session" ADD CONSTRAINT "browser_session_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_record" ADD CONSTRAINT "task_record_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "browser_session"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "browser_session"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_template" ADD CONSTRAINT "script_template_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
