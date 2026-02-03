/**
 * FSRS Migration Script
 *
 * Converts legacy level-based system to FSRS (Free Spaced Repetition Scheduler)
 *
 * Mapping strategy:
 * - level 0 (immediate) -> stability: 0 (new card)
 * - level 1 (4h) -> stability: 0.17 days
 * - level 2 (12h) -> stability: 0.5 days
 * - level 3 (1d) -> stability: 1 day
 * - level 4 (3d) -> stability: 3 days
 * - level 5 (7d) -> stability: 7 days
 *
 * Difficulty rating mapping:
 * - EASY -> dr: 1-3
 * - NORMAL -> dr: 4-7
 * - HARD -> dr: 8-9
 * - VERY_HARD -> dr: 10
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Legacy interval mapping (hours)
const LEGACY_INTERVALS = [0, 4, 12, 24, 72, 168];

// Stability mapping (convert hours to days)
function levelToStability(level: number): number {
  const hours = LEGACY_INTERVALS[Math.min(level, LEGACY_INTERVALS.length - 1)];
  return hours / 24; // Convert to days
}

// Difficulty rating mapping (0-10 scale)
function difficultyToDr(difficulty: string): number {
  switch (difficulty) {
    case 'EASY':
      return 2.5;
    case 'NORMAL':
      return 5.0;
    case 'HARD':
      return 8.0;
    case 'VERY_HARD':
      return 10.0;
    default:
      return 5.0;
  }
}

async function migrate() {
  console.log('🔄 Starting FSRS migration...\n');

  // Get all review items
  const items = await prisma.reviewItem.findMany({});
  console.log(`📊 Found ${items.length} review items to migrate\n`);

  let migrated = 0;
  let skipped = 0;

  for (const item of items) {
    // Skip if already migrated (has non-zero stability)
    if (item.stability > 0) {
      skipped++;
      continue;
    }

    const stability = levelToStability(item.level);
    const dr = difficultyToDr(item.difficulty);

    // Get retrieval and lapse counts from logs
    const logs = await prisma.reviewLog.findMany({
      where: { reviewItemId: item.id },
      orderBy: { createdAt: 'asc' },
    });

    const retrieval = logs.filter(log => log.rating >= 3).length;
    const lapse = logs.filter(log => log.rating < 3).length;

    // Update the item
    await prisma.reviewItem.update({
      where: { id: item.id },
      data: {
        stability,
        dr,
        due: item.nextReview, // Copy nextReview to due
        retrieval,
        lapse,
      },
    });

    migrated++;
    console.log(`✅ Migrated item ${item.id}: level=${item.level} → stability=${stability.toFixed(2)} days`);
  }

  console.log(`\n✨ Migration complete!`);
  console.log(`   - Migrated: ${migrated} items`);
  console.log(`   - Skipped: ${skipped} items (already migrated)`);
  console.log(`   - Total: ${items.length} items\n`);
}

// Main execution
migrate()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
