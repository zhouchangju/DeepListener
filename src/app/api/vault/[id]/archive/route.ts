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

    // Toggle isArchived status
    const reviewItem = await prisma.reviewItem.findUnique({
      where: { id },
    });

    if (!reviewItem) {
      return notFound('Review item not found');
    }

    const updatedItem = await prisma.reviewItem.update({
      where: { id },
      data: {
        isArchived: !reviewItem.isArchived,
      },
    });

    return NextResponse.json({
      success: true,
      isArchived: updatedItem.isArchived,
    });
  } catch (error) {
    console.error('Archive toggle error:', error);
    return internalServerError();
  }
}
