require("dotenv").config();

const prisma = require("../lib/prisma");
const { sha256 } = require("../lib/hash");

const DEMO_API_KEY = "sitepulse_demo_key_12345";

async function upsertDemoClient() {
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
      data: demoClientData,
    });
  }

  return prisma.client.create({
    data: demoClientData,
  });
}

async function main() {
  const user = await prisma.user.upsert({
    where: {
      email: "admin@sitepulse.local",
    },
    update: {
      name: "Admin User",
      passwordHash: "demo-password-hash",
      role: "admin",
    },
    create: {
      name: "Admin User",
      email: "admin@sitepulse.local",
      passwordHash: "demo-password-hash",
      role: "admin",
    },
  });

  const client = await upsertDemoClient();

  const site = await prisma.site.upsert({
    where: {
      siteUrl: "https://example.com",
    },
    update: {
      clientId: client.id,
      siteName: "Onset Demo Website",
      status: "unknown",
      apiKeyHash: sha256(DEMO_API_KEY),
    },
    create: {
      clientId: client.id,
      siteName: "Onset Demo Website",
      siteUrl: "https://example.com",
      status: "unknown",
      apiKeyHash: sha256(DEMO_API_KEY),
    },
  });

  console.log("SitePulse seed completed.");
  console.log(`Demo user: ${user.email}`);
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
