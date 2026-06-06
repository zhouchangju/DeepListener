import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const exportClients = [
  {
    file: "../app/vault/ExportButtons.tsx",
    expectedChecks: 2,
  },
  {
    file: "../app/practice/[id]/PracticeClient.tsx",
    expectedChecks: 1,
  },
  {
    file: "../app/review/ReviewClient.tsx",
    expectedChecks: 1,
  },
  {
    file: "../app/library/LibraryManager.tsx",
    expectedChecks: 1,
  },
];

test("export clients delegate failed response parsing to the shared helper", () => {
  for (const { file, expectedChecks } of exportClients) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");

    assert.match(source, /@\/lib\/client-response/, file);
    assert.doesNotMatch(
      source,
      /const error = await response\.json\(\);\s*throw new Error\(error\.error \|\| ['"]Export failed['"]\);/,
      file,
    );
    assert.equal(
      source.match(/requireOkResponse\(response,\s*['"]Export failed['"]\)/g)?.length ?? 0,
      expectedChecks,
      file,
    );
  }
});
