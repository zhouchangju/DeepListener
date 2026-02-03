import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Export vault notes as text file grouped by tags/categories
 * POST /api/vault/export
 * Body: { tags?: string[] } - Optional: specific tags to filter by
 */
export async function POST(req: NextRequest) {
  try {
    const { tags } = await req.json();

    // Build query filter
    const where: any = {
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
      return NextResponse.json(
        { error: "No notes found to export" },
        { status: 404 }
      );
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
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error.message || "Export failed" },
      { status: 500 }
    );
  }
}
