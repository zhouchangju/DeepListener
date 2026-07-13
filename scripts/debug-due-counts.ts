import { PrismaClient, type ReviewItem } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  console.log('Current time:', now.toISOString());

  const dueCount = await prisma.reviewItem.count({
    where: {
      due: { lte: now },
      isArchived: false,
    }
  });

  const nextReviewCount = await prisma.reviewItem.count({
    where: {
      nextReview: { lte: now },
      isArchived: false,
    }
  });

  const bothCount = await prisma.reviewItem.count({
    where: {
      due: { lte: now },
      nextReview: { lte: now },
      isArchived: false,
    }
  });

  const dueOnlyCount = await prisma.reviewItem.count({
    where: {
      due: { lte: now },
      nextReview: { gt: now },
      isArchived: false,
    }
  });

  const nextReviewOnlyCount = await prisma.reviewItem.count({
    where: {
      due: { gt: now },
      nextReview: { lte: now },
      isArchived: false,
    }
  });

  console.log('Items due (due <= now):', dueCount);
  console.log('Items due (nextReview <= now):', nextReviewCount);
  console.log('Items due in both:', bothCount);
  console.log('Items due ONLY in "due":', dueOnlyCount);
  console.log('Items due ONLY in "nextReview":', nextReviewOnlyCount);

  if (dueOnlyCount > 0) {
    const samples = await prisma.reviewItem.findMany({
      where: {
        due: { lte: now },
        nextReview: { gt: now },
        isArchived: false,
      },
      take: 5
    });
    console.log('\nSamples of "due only" items:');
    samples.forEach((s: ReviewItem) => {
      console.log(`ID: ${s.id}, due: ${s.due.toISOString()}, nextReview: ${s.nextReview.toISOString()}`);
    });
  }

  if (nextReviewOnlyCount > 0) {
    const samples = await prisma.reviewItem.findMany({
      where: {
        due: { gt: now },
        nextReview: { lte: now },
        isArchived: false,
      },
      take: 5
    });
    console.log('\nSamples of "nextReview only" items:');
    samples.forEach((s: ReviewItem) => {
      console.log(`ID: ${s.id}, due: ${s.due.toISOString()}, nextReview: ${s.nextReview.toISOString()}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());