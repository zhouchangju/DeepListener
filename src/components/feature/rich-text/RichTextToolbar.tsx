"use client";

import { Button } from "@/components/ui/button";
import { Bold, Copy } from "lucide-react";
import { useTranslations } from "next-intl";

export interface RichTextColor {
  c: string;
  label: string;
}

export const DEFAULT_RICH_TEXT_COLORS: RichTextColor[] = [
  { c: "#000000", label: "Black" },
  { c: "#EF4444", label: "Red" },
  { c: "#3B82F6", label: "Blue" },
  { c: "#10B981", label: "Green" },
  { c: "#F59E0B", label: "Amber" },
  { c: "#8B5CF6", label: "Purple" },
];

export const RED_FIRST_RICH_TEXT_COLORS: RichTextColor[] = [
  { c: "#EF4444", label: "Red" },
  ...DEFAULT_RICH_TEXT_COLORS.filter((color) => color.c !== "#EF4444"),
];

interface RichTextToolbarProps {
  label?: string;
  colors?: RichTextColor[];
  variant?: "compact" | "comfortable";
  isSaving?: boolean;
  showSavingStatus?: boolean;
  onCommand: (command: string, value?: string) => void;
  onCopy?: () => void;
}

export function RichTextToolbar({
  label,
  colors = DEFAULT_RICH_TEXT_COLORS,
  variant = "compact",
  isSaving = false,
  showSavingStatus = false,
  onCommand,
  onCopy,
}: RichTextToolbarProps) {
  const t = useTranslations("feature.richText");
  const resolvedLabel = label ?? t("noteLabel");
  const isComfortable = variant === "comfortable";
  const iconButtonClassName = isComfortable ? "h-8 w-8" : "h-7 w-7";
  const iconClassName = isComfortable ? "w-4 h-4" : "w-3.5 h-3.5";
  const normalSizeClassName = isComfortable ? "h-8 text-xs font-normal" : "h-7 text-xs font-normal px-2";
  const largeSizeClassName = isComfortable ? "h-8 text-lg font-bold" : "h-7 text-base font-bold px-2";
  const colorButtonClassName = isComfortable
    ? "w-5 h-5 rounded-full border border-border hover:scale-110 transition-transform shadow-sm"
    : "w-4 h-4 rounded-full border border-border hover:scale-110 transition-transform shadow-sm";

  return (
    <div className="bg-muted/60 border-b border-border p-2 flex gap-2 items-center flex-wrap">
      <span className="text-xs font-semibold text-muted-foreground uppercase mr-2 select-none">{resolvedLabel}</span>

      <Button
        size="icon"
        variant="ghost"
        className={iconButtonClassName}
        onClick={() => onCommand("bold")}
        title={t("bold")}
      >
        <Bold className={iconClassName} />
      </Button>

      <div className="h-4 w-px bg-border mx-1" />

      <div className="flex gap-1 items-center">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onCommand("fontSize", "3")}
          className={normalSizeClassName}
          title={t("normalSize")}
        >
          Aa
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onCommand("fontSize", "5")}
          className={largeSizeClassName}
          title={t("largeSize")}
        >
          Aa
        </Button>
      </div>

      <div className="h-4 w-px bg-border mx-1" />

      <div className="flex gap-1 items-center">
        {colors.map(({ c, label: colorLabel }) => (
          <button
            key={c}
            className={colorButtonClassName}
            style={{ backgroundColor: c }}
            onClick={() => onCommand("foreColor", c)}
            title={colorLabel}
          />
        ))}
      </div>

      {onCopy && (
        <>
          <div className="h-4 w-px bg-border mx-1" />
          <Button size="icon" variant="ghost" className={iconButtonClassName} onClick={onCopy} title={t("copyText")}>
            <Copy className={iconClassName} />
          </Button>
        </>
      )}

      {showSavingStatus && (
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving ? <span className="animate-pulse">{t("saving")}</span> : <span>{t("saved")}</span>}
        </div>
      )}
    </div>
  );
}
