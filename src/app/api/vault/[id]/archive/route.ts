import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { internalServerError, notFound } from '@/lib/api-response';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Atomic read-then-flip inside a transaction. The previous findUnique +
    // update pair raced under double-clicks / concurrent requests (both read
    // isArchived=false, both wrote true, so the toggle stuck). Wrapping the
    // read and update in a transaction serializes concurrent toggles.
    const result = await prisma.$transaction(async (tx) => {
      const reviewItem = await tx.reviewItem.findUnique({
        where: { id },
      });

      if (!reviewItem) {
        return { kind: 'notFound' as const };
      }

      const updatedItem = await tx.reviewItem.update({
        where: { id },
        data: {
          isArchived: !reviewItem.isArchived,
        },
      });

      return { kind: 'ok' as const, isArchived: updatedItem.isArchived };
    });

    if (result.kind === 'notFound') {
      return notFound('Review item not found');
    }

    return NextResponse.json({
      success: true,
      isArchived: result.isArchived,
    });
  } catch (error) {
    console.error('Archive toggle error:', error);
    return internalServerError();
  }
}
