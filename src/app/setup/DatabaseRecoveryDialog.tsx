"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PlatformGuideProps {
  title: string;
  openInstruction: string;
  folderInstruction: string;
  folderCommand: string;
  databaseInstruction: string;
  databaseCommand: string;
  migrateInstruction: string;
  migrateCommand: string;
}

function PlatformGuide({
  title,
  openInstruction,
  folderInstruction,
  folderCommand,
  databaseInstruction,
  databaseCommand,
  migrateInstruction,
  migrateCommand,
}: PlatformGuideProps) {
  return (
    <section className="rounded-lg border bg-background/70 p-4">
      <h3 className="font-semibold">{title}</h3>
      <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
        <li>{openInstruction}</li>
        <li>
          {folderInstruction}
          <code className="mt-1 block overflow-x-auto rounded bg-muted px-3 py-2 text-xs text-foreground whitespace-pre">
            {folderCommand}
          </code>
        </li>
        <li>
          {databaseInstruction}
          <code className="mt-1 block overflow-x-auto rounded bg-muted px-3 py-2 text-xs text-foreground whitespace-pre">
            {databaseCommand}
          </code>
        </li>
        <li>
          {migrateInstruction}
          <code className="mt-1 block overflow-x-auto rounded bg-muted px-3 py-2 text-xs text-foreground whitespace-pre">
            {migrateCommand}
          </code>
        </li>
      </ol>
    </section>
  );
}

export default function DatabaseRecoveryDialog() {
  const t = useTranslations("setup");
  const commonT = useTranslations("common");
  const prefix = "readiness.database";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">
          {t("readiness.database.serverMissingOpenGuide")} <ArrowRight />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] sm:max-w-3xl overflow-y-auto"
        closeLabel={commonT("close")}
      >
        <DialogHeader>
          <DialogTitle>{t("readiness.database.serverMissingDialogTitle")}</DialogTitle>
          <DialogDescription>{t("readiness.database.serverMissingDialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="font-semibold">{t(`${prefix}.serverMissingStepsTitle`)}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <PlatformGuide
              title={t(`${prefix}.serverMissingWindowsTitle`)}
              openInstruction={t(`${prefix}.serverMissingWindowsOpen`)}
              folderInstruction={t(`${prefix}.serverMissingFolder`)}
              folderCommand={t(`${prefix}.serverMissingWindowsCommand`)}
              databaseInstruction={t(`${prefix}.serverMissingDatabase`)}
              databaseCommand={t(`${prefix}.serverMissingWindowsDatabaseCommand`)}
              migrateInstruction={t(`${prefix}.serverMissingMigrate`)}
              migrateCommand={t(`${prefix}.serverMissingMigrateCommand`)}
            />
            <PlatformGuide
              title={t(`${prefix}.serverMissingMacTitle`)}
              openInstruction={t(`${prefix}.serverMissingMacOpen`)}
              folderInstruction={t(`${prefix}.serverMissingFolder`)}
              folderCommand={t(`${prefix}.serverMissingMacCommand`)}
              databaseInstruction={t(`${prefix}.serverMissingDatabase`)}
              databaseCommand={t(`${prefix}.serverMissingMacDatabaseCommand`)}
              migrateInstruction={t(`${prefix}.serverMissingMigrate`)}
              migrateCommand={t(`${prefix}.serverMissingMigrateCommand`)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {t(`${prefix}.serverMissingAfter`)}
          </p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{commonT("close")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
