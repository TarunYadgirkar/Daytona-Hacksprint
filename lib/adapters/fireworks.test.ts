import assert from "node:assert/strict";
import test from "node:test";
import { collectUniqueTestDrafts } from "./fireworks";

const valid = {
  name: "Null cart",
  hypothesis: "The guard dereferences null before it can return.",
  code: "const target = require('./target.js');\ntarget.cartTotal(null);",
};

test("collectUniqueTestDrafts keeps only runnable, distinct tests", () => {
  const collected = collectUniqueTestDrafts(
    [],
    [
      valid,
      { ...valid, name: "Same code, new name" },
      { ...valid, name: "null cart", code: "const target = require('./target.js');\nthrow new Error();" },
      { name: "No target", hypothesis: "Invalid harness", code: "process.exit(0);" },
      {
        name: "Empty array",
        hypothesis: "The empty collection path may return the wrong type.",
        code: 'const target = require("./target.js");\ntarget.cartTotal([]);',
      },
      {
        name: "Uppercase SKU",
        hypothesis: "Case-sensitive identifiers may take a different path.",
        code: "const target = require('./target.js');\ntarget.lookup('A');",
      },
      {
        name: "Lowercase SKU",
        hypothesis: "Case-sensitive identifiers may take a different path.",
        code: "const target = require('./target.js');\ntarget.lookup('a');",
      },
    ],
    4,
  );

  assert.deepEqual(
    collected.map((draft) => draft.name),
    ["Null cart", "Empty array", "Uppercase SKU", "Lowercase SKU"],
  );
});

test("collectUniqueTestDrafts respects the requested limit", () => {
  const collected = collectUniqueTestDrafts(
    [],
    [
      valid,
      {
        name: "Negative quantity",
        hypothesis: "Negative quantities may corrupt the total.",
        code: "const target = require('./target.js');\ntarget.cartTotal([{ price: 2, qty: -1 }]);",
      },
    ],
    1,
  );

  assert.equal(collected.length, 1);
  assert.equal(collected[0]?.name, "Null cart");
});
