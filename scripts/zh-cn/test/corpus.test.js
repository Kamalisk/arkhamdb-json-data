const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { alignCorpora, loadCards } = require("../lib/corpus");

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zh-cn-corpus-"));
  for (const [relativePath, data] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
  }
  return root;
}

test("loadCards recursively loads and sorts card records", () => {
  const root = fixture({
    "z.json": [{ code: "00002", name: "Second" }],
    "nested/a.json": [{ code: "00001", name: "First" }],
  });

  assert.deepEqual([...loadCards(root).keys()], ["00001", "00002"]);
});

test("loadCards rejects duplicate card codes", () => {
  const root = fixture({
    "a.json": [{ code: "00001", name: "First" }],
    "b.json": [{ code: "00001", name: "Duplicate" }],
  });

  assert.throws(() => loadCards(root), /Duplicate card code 00001/);
});

test("loadCards can exclude known aggregate files", () => {
  const root = fixture({
    "cards.json": [{ code: "00001", name: "Canonical" }],
    "aggregate.json": [{ code: "00001", name: "Stale aggregate" }],
  });

  assert.deepEqual(
    loadCards(root, { excludedRelativePaths: ["aggregate.json"] }).get("00001"),
    { code: "00001", name: "Canonical" },
  );
});

test("alignCorpora reports translated and missing cards in code order", () => {
  const english = new Map([
    ["00002", { code: "00002", name: "Second" }],
    ["00001", { code: "00001", name: "First" }],
  ]);
  const chinese = new Map([
    ["00002", { code: "00002", name: "第二张" }],
  ]);

  assert.deepEqual(alignCorpora(english, chinese), [
    {
      code: "00001",
      english: english.get("00001"),
      zhCn: null,
      status: "missing",
    },
    {
      code: "00002",
      english: english.get("00002"),
      zhCn: chinese.get("00002"),
      status: "translated",
    },
  ]);
});
