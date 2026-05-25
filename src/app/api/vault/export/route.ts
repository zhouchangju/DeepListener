import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, internalServerError, notFound } from "@/lib/api-response";
import { formatZodError, vaultExportSchema } from "@/lib/api-schemas";

/**
 * Export vault notes as text file grouped by tags/categories
 * POST /api/vault/export
 * Body: { tags?: string[], difficulties?: string[], trackIds?: string[], dateFrom?: string, dateTo?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = vaultExportSchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest(formatZodError(parsed.error));
    }

    const { tags, difficulties, trackIds, dateFrom, dateTo } = parsed.data;

    // Build query filter
    const where: {
      isArchived: boolean;
      tags?: { some: { name: { in: string[] } } };
      difficulty?: { in: string[] };
      sentence?: { trackId?: { in: string[] } };
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      isArchived: false,
    };

    // If specific tags requested, filter by them
    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          name: {
            in: tags,
          },
        },
      };
    }

    // Filter by difficulty
    if (difficulties && difficulties.length > 0) {
      where.difficulty = { in: difficulties };
    }

    // Filter by track IDs
    if (trackIds && trackIds.length > 0) {
      where.sentence = {
        trackId: { in: trackIds },
      };
    }

    // Filter by date range
    if (dateFrom) {
      where.createdAt = { ...where.createdAt, gte: new Date(dateFrom) };
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: toDate };
    }

    // Fetch review items with their tags and sentence data
    const items = await prisma.reviewItem.findMany({
      where,
      include: {
        tags: {
          select: {
            name: true,
          },
        },
        sentence: {
          select: {
            text: true,
            track: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (items.length === 0) {
      return notFound("No notes found to export");
    }

    // Group items by tags (items can have multiple tags, so we'll create categories for each)
    const categorizedNotes: Record<string, typeof items> = {};

    for (const item of items) {
      const itemTags = item.tags.map((t) => t.name);

      if (itemTags.length === 0) {
        // Items without tags go to "Uncategorized"
        if (!categorizedNotes["Uncategorized"]) {
          categorizedNotes["Uncategorized"] = [];
        }
        categorizedNotes["Uncategorized"].push(item);
      } else {
        // Add item to each of its tag categories
        for (const tag of itemTags) {
          if (!categorizedNotes[tag]) {
            categorizedNotes[tag] = [];
          }
          categorizedNotes[tag].push(item);
        }
      }
    }

    // Generate text content
    const timestamp = new Date().toLocaleString();
    let textContent = `DeepListener Vault Notes Export\n`;
    textContent += `Generated: ${timestamp}\n`;
    textContent += `Total Notes: ${items.length}\n`;

    // Add filter info if filters were applied
    const filters: string[] = [];
    if (difficulties && difficulties.length > 0) {
      filters.push(`Difficulties: ${difficulties.join(", ")}`);
    }
    if (trackIds && trackIds.length > 0) {
      filters.push(`Tracks: ${trackIds.length} selected`);
    }
    if (dateFrom || dateTo) {
      const dateRange = `${dateFrom || 'beginning'} - ${dateTo || 'now'}`;
      filters.push(`Date Range: ${dateRange}`);
    }
    if (filters.length > 0) {
      textContent += `Filters: ${filters.join(" | ")}\n`;
    }

    textContent += `${"=".repeat(50)}\n\n`;

    // Sort categories alphabetically
    const sortedCategories = Object.keys(categorizedNotes).sort();

    for (const category of sortedCategories) {
      textContent += `\n${"#".repeat(40)}\n`;
      textContent += `CATEGORY: ${category}\n`;
      textContent += `${"#".repeat(40)}\n\n`;

      const categoryItems = categorizedNotes[category];

      for (let i = 0; i < categoryItems.length; i++) {
        const item = categoryItems[i];
        textContent += `[${i + 1}] ${item.sentence.text}\n`;
        textContent += `Track: ${item.sentence.track.title}\n`;

        // Add difficulty badge
        if (item.difficulty && item.difficulty !== "NORMAL") {
          const difficultyLabel =
            item.difficulty === "HARD"
              ? "Hard"
              : item.difficulty === "VERY_HARD"
              ? "Very Hard"
              : item.difficulty;
          textContent += `Difficulty: ${difficultyLabel}\n`;
        }

        // Add tags
        const allTags = item.tags.map((t) => t.name).join(", ");
        if (allTags) {
          textContent += `Tags: ${allTags}\n`;
        }

        // Add note if present
        if (item.userNote) {
          // Strip HTML tags for plain text export
          const plainTextNote = item.userNote
            .replace(/<[^>]+>/g, "") // Remove HTML tags
            .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
            .replace(/&amp;/g, "&") // Replace HTML entities
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .trim();

          if (plainTextNote) {
            textContent += `\nNOTE:\n${plainTextNote}\n`;
          }
        }

        textContent += `\n${"-".repeat(40)}\n\n`;
      }
    }

    // Generate filename
    const dateStr = new Date().toISOString().split("T")[0];
    const tagSuffix = tags && tags.length > 0 ? `_${tags.join("-")}` : "";
    const filename = `DeepListener_Notes_${dateStr}${tagSuffix}.txt`;

    // Return as downloadable file
    return new NextResponse(textContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Export error:", error);
    return internalServerError();
  }
}
