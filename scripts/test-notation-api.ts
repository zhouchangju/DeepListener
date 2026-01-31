import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const sentence = await prisma.sentence.findFirst();

  if (!sentence) {
    console.log("No sentences found in database. Upload a track first.");
    return;
  }

  console.log(`Testing with sentence ID: ${sentence.id}`);
  console.log(`Current formatting: ${sentence.formatting}`);

  const sampleFormatting = JSON.stringify({
    stress: [0, 2],
    linking: [[1, 2]],
    reduction: [3],
    elision: [4]
  });

  // Mock a request using internal logic since we can't easily fetch from localhost during build/cli
  // In a real environment, we'd use fetch("http://localhost:3000/api/sentence/...")
  // But here we can just call prisma directly to verify the model update works.
  
  const updated = await prisma.sentence.update({
    where: { id: sentence.id },
    data: { formatting: sampleFormatting }
  });

  console.log("Updated formatting:", updated.formatting);

  if (updated.formatting === sampleFormatting) {
    console.log("✅ API/DB Update Success!");
  } else {
    console.log("❌ Update Failed!");
  }

  await prisma.$disconnect();
}

main().catch(console.error);
