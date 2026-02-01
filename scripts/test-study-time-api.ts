import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const today = new Date(dateStr);
  const type = "TEST_TYPE";
  const duration = 10;

  console.log(`Upserting study session for ${dateStr} type ${type}...`);

  const session = await prisma.studySession.upsert({
    where: {
      date_type: {
        date: today,
        type: type,
      },
    },
    update: {
      duration: { increment: duration },
    },
    create: {
      date: today,
      type: type,
      duration: duration,
    },
  });

  console.log("Session updated:", session);

  if (session.duration >= duration) {
    console.log("✅ Test Passed");
  } else {
    console.log("❌ Test Failed");
  }

  await prisma.$disconnect();
}

main().catch(console.error);
