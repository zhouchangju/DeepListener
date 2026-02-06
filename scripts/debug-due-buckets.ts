import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  // Count items by hour for the next 24 hours
  console.log('--- Items becoming due in the next 24 hours ---');
  for (let i = 0; i < 24; i++) {
    const start = new Date(now);
    start.setHours(now.getHours() + i, 0, 0, 0);
    const end = new Date(now);
    end.setHours(now.getHours() + i + 1, 0, 0, 0);

    const count = await prisma.reviewItem.count({
      where: {
        due: {
          gt: start,
          lte: end,
        },
        isArchived: false,
      }
    });
    if (count > 0) {
      console.log(`${start.toISOString()} to ${end.toISOString()}: ${count}`);
    }
  }

  console.log('\n--- Items already due (by day) ---');
  const pastItems = await prisma.reviewItem.findMany({
    where: {
      due: { lte: now },
      isArchived: false,
    },
    select: { due: true }
  });

  const buckets: Record<string, number> = {};
  pastItems.forEach(item => {
    const day = item.due.toISOString().split('T')[0];
    buckets[day] = (buckets[day] || 0) + 1;
  });

  Object.keys(buckets).sort().forEach(day => {
    console.log(`${day}: ${buckets[day]}`);
  });
  
  console.log('\n--- Zero Stability items ---');
  const zeroStability = await prisma.reviewItem.count({
    where: { stability: 0 }
  });
  console.log('Items with stability = 0:', zeroStability);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());