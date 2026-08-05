import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("theme provider uses class-based light mode without system preference", () => {
  const source = readFileSync(new URL("./ThemeProvider.tsx", import.meta.url), "utf8");

  assert.match(source, /attribute="class"/);
  assert.match(source, /defaultTheme="light"/);
  assert.match(source, /enableSystem=\{false\}/);
  assert.match(source, /disableTransitionOnChange/);
});

test("root layout mounts theme provider and delegates the top-bar controls to the app shell", () => {
  const source = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
  const shellSource = readFileSync(new URL("../app-shell/AppShell.tsx", import.meta.url), "utf8");

  assert.match(source, /<ThemeProvider>/);
  assert.match(source, /<AppShell>\{children\}<\/AppShell>/);
  assert.match(shellSource, /<ThemeToggle \/>/);
  assert.match(shellSource, /bg-background\/90/);
});

test("theme toggle switches between resolved dark and light themes after mount", () => {
  const source = readFileSync(new URL("./ThemeToggle.tsx", import.meta.url), "utf8");

  assert.match(source, /const \{ resolvedTheme, setTheme \} = useTheme\(\)/);
  assert.match(source, /const nextTheme = isDark \? "light" : "dark"/);
  assert.match(source, /setTheme\(nextTheme\)/);
  assert.match(source, /<Sun className="h-4 w-4" \/>/);
  assert.match(source, /<Moon className="h-4 w-4" \/>/);
});

test("global styles keep recharts legible in dark mode", () => {
  const source = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /\.dark \.recharts-default-tooltip/);
  assert.match(source, /\.dark \.recharts-tooltip-label/);
});

test("global styles do not force a grayscale filter on the document", () => {
  const source = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

  assert.doesNotMatch(source, /filter:\s*grayscale/);
});

test("global styles honor reduced-motion preferences", () => {
  const source = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(source, /transition-duration:\s*0\.01ms\s*!important/);
  assert.match(source, /scroll-behavior:\s*auto\s*!important/);
});

test("primary brand token carries an indigo hue so accent work is visible", () => {
  const source = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
  // Slice from the :root block to the .dark { block (the selector, not the
  // `@custom-variant dark` declaration which also contains ".dark").
  const rootStart = source.indexOf(":root");
  const darkBlockStart = source.indexOf(".dark {", rootStart);
  const rootBlock = source.slice(rootStart, darkBlockStart);
  const primaryLine = rootBlock.match(/--primary:\s*([^;]+);/);

  assert.ok(primaryLine, "--primary token must be defined in :root");
  // Indigo-600 sits around hue 277 in oklch; chroma must be non-zero (not grayscale).
  // Hue may carry a fractional part (e.g. 276.97), so match the integer degrees.
  assert.match(primaryLine[1], /oklch\([\d.]+ 0\.\d+ 2[67]\d(?:\.\d+)?/);
});
