import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  const dueItems = await prisma.reviewItem.findMany({
    where: {
      due: { lte: now },
      isArchived: false,
    },
    select: { due: true },
    orderBy: { due: 'desc' },
    take: 20
  });

  console.log('Top 20 most recently due items:');
  dueItems.forEach(item => {
    console.log(item.due.toISOString());
  });

  const exactMatches = await prisma.reviewItem.count({
    where: {
      due: {
        equals: dueItems[0]?.due
      }
    }
  });
  console.log(`
Items with exact same timestamp as the latest one: ${exactMatches}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
