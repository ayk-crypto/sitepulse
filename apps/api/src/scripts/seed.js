require("dotenv").config();

const prisma = require("../lib/prisma");
const { sha256 } = require("../lib/hash");
const bcrypt = require("bcryptjs");

const DEMO_API_KEY = "sitepulse_demo_key_12345";
const DEFAULT_OWNER_EMAIL = "admin@sitepulse.local";
const DEFAULT_OWNER_PASSWORD = "SitePulse@12345";
const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || "onset-media";

async function getDefaultTenant() {
  return prisma.tenant.upsert({
    where: {
      slug: DEFAULT_TENANT_SLUG,
    },
    update: {
      name: "Onset Media",
    },
    create: {
      name: "Onset Media",
      slug: DEFAULT_TENANT_SLUG,
    },
  });
}

async function upsertDemoClient(tenantId) {
  const demoClientData = {
    name: "Onset Media",
    contactPerson: "Asfand Yar",
    email: "freelancer.ayk@gmail.com",
    notes: "Internal agency demo client",
  };

  const existingClient = await prisma.client.findFirst({
    where: {
      name: demoClientData.name,
    },
  });

  if (existingClient) {
    return prisma.client.update({
      where: {
        id: existingClient.id,
      },
      data: {
        ...demoClientData,
        tenantId,
      },
    });
  }

  return prisma.client.create({
    data: {
      ...demoClientData,
      tenantId,
    },
  });
}

async function main() {
  const tenant = await getDefaultTenant();
  const passwordHash = await bcrypt.hash(DEFAULT_OWNER_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: {
      email: DEFAULT_OWNER_EMAIL,
    },
    update: {
      name: "Asfand Yar",
      tenantId: tenant.id,
      passwordHash,
      role: "owner",
      isActive: true,
    },
    create: {
      name: "Asfand Yar",
      tenantId: tenant.id,
      email: DEFAULT_OWNER_EMAIL,
      passwordHash,
      role: "owner",
      isActive: true,
    },
  });

  const client = await upsertDemoClient(tenant.id);

  const site = await prisma.site.upsert({
    where: {
      siteUrl: "https://example.com",
    },
    update: {
      clientId: client.id,
      tenantId: tenant.id,
      siteName: "Onset Demo Website",
      status: "unknown",
      apiKeyHash: sha256(DEMO_API_KEY),
    },
    create: {
      clientId: client.id,
      tenantId: tenant.id,
      siteName: "Onset Demo Website",
      siteUrl: "https://example.com",
      status: "unknown",
      apiKeyHash: sha256(DEMO_API_KEY),
    },
  });

  console.log("SitePulse seed completed.");
  console.log(`Default tenant: ${tenant.slug}`);
  console.log(`Login email: ${user.email}`);
  console.log(`Login password: ${DEFAULT_OWNER_PASSWORD}`);
  console.log("Change this default password before production use.");
  console.log(`Demo client: ${client.name}`);
  console.log(`Demo site: ${site.siteUrl}`);
  console.log(`Demo API key: ${DEMO_API_KEY}`);
}

main()
  .catch((error) => {
    console.error("SitePulse seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
