import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("theme provider uses class-based system-aware dark mode", () => {
  const source = readFileSync(new URL("./ThemeProvider.tsx", import.meta.url), "utf8");

  assert.match(source, /attribute="class"/);
  assert.match(source, /defaultTheme="system"/);
  assert.match(source, /enableSystem/);
  assert.match(source, /disableTransitionOnChange/);
});

test("root layout mounts theme provider and top-right theme toggle", () => {
  const source = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");

  assert.match(source, /<ThemeProvider>/);
  assert.match(source, /<ThemeToggle \/>/);
  assert.match(source, /bg-background\/90/);
});

test("theme toggle switches between resolved dark and light themes after mount", () => {
  const source = readFileSync(new URL("./ThemeToggle.tsx", import.meta.url), "utf8");

  assert.match(source, /const \{ resolvedTheme, setTheme \} = useTheme\(\)/);
  assert.match(source, /const nextTheme = isDark \? "light" : "dark"/);
  assert.match(source, /setTheme\(nextTheme\)/);
  assert.match(source, /<Sun className="h-4 w-4" \/>/);
  assert.match(source, /<Moon className="h-4 w-4" \/>/);
});

test("global styles provide a dark compatibility bridge for legacy light utilities", () => {
  const source = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /\.dark \.bg-white/);
  assert.match(source, /\.dark \.text-gray-800/);
  assert.match(source, /\.dark \.border-gray-200/);
  assert.match(source, /\.dark input,/);
});
