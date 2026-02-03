import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Toggle isArchived status
    const reviewItem = await prisma.reviewItem.findUnique({
      where: { id },
    });

    if (!reviewItem) {
      return new Response(
        JSON.stringify({ error: 'Review item not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updatedItem = await prisma.reviewItem.update({
      where: { id },
      data: {
        isArchived: !reviewItem.isArchived,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        isArchived: updatedItem.isArchived,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Archive toggle error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
