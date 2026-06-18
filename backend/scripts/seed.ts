import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const superAdminPassword = await bcrypt.hash('admin123', 10);
  const tenantAdminPassword = await bcrypt.hash('tenant123', 10);

  const defaultTenant = await prisma.tenant.upsert({
    where: { name: 'default' },
    update: {},
    create: {
      name: 'default',
      quota: 10,
      aesKey: crypto.randomBytes(32).toString('base64'),
    },
  });

  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      password: superAdminPassword,
      role: 'super_admin',
      tenantId: defaultTenant.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'tenantadmin' },
    update: {},
    create: {
      username: 'tenantadmin',
      password: tenantAdminPassword,
      role: 'tenant_admin',
      tenantId: defaultTenant.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'operator' },
    update: {},
    create: {
      username: 'operator',
      password: await bcrypt.hash('operator123', 10),
      role: 'operator',
      tenantId: defaultTenant.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'readonly' },
    update: {},
    create: {
      username: 'readonly',
      password: await bcrypt.hash('readonly123', 10),
      role: 'readonly',
      tenantId: defaultTenant.id,
    },
  });

  console.log('Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });