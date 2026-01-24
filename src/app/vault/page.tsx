import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import VaultListClient from "./VaultListClient";

export default async function VaultPage() {
  const items = await prisma.reviewItem.findMany({
    include: {
      sentence: {
        include: { track: true },
      },
      tags: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Sentence Vault</h1>
          <p className="text-gray-500 text-sm mt-1">
            Total {items.length} captured sentences
          </p>
        </div>
        <Link href="/review">
          <Badge className="px-4 py-2 cursor-pointer bg-indigo-600 hover:bg-indigo-700">
            Start SRS Review
          </Badge>
        </Link>
      </div>

      <VaultListClient initialItems={items} />
    </div>
  );
}
