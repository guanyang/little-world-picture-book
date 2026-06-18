import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookCategories } from "../src/content/bookData.js";

const expectedNewCategories = [
  "vehicles",
  "daily-items",
  "weather-nature",
  "body-parts",
  "jobs-tools",
];

describe("book category expansion", () => {
  it("includes the new categories with complete content and pipeline-safe paths", () => {
    const ids = bookCategories.map((category) => category.id);
    assert.equal(bookCategories.length, 9, "project should have 9 categories");

    for (const id of expectedNewCategories) {
      assert.ok(ids.includes(id), `missing category: ${id}`);
    }

    for (const category of bookCategories.filter((item) =>
      expectedNewCategories.includes(item.id),
    )) {
      assert.equal(category.items.length, 20, `${category.id} should have 20 items`);
      assert.match(category.image, new RegExp(`/media/optimized/scene-${category.id}.webp`));

      for (const item of category.items) {
        assert.ok(item.name, `${item.slug} needs a name`);
        assert.ok(item.pinyin, `${item.slug} needs pinyin`);
        assert.ok(item.cue, `${item.slug} needs a cue`);
        assert.ok(item.color, `${item.slug} needs a color`);
        assert.ok(item.shape, `${item.slug} needs a shape`);
        assert.match(
          item.image,
          new RegExp(`/media/optimized/${category.id}-[a-z0-9-]+.webp`),
        );
      }
    }
  });

  it("keeps category and item slugs unique", () => {
    const categoryIds = bookCategories.map((category) => category.id);
    assert.equal(new Set(categoryIds).size, categoryIds.length);

    const itemSlugs = bookCategories.flatMap((category) =>
      category.items.map((item) => item.slug),
    );
    assert.equal(new Set(itemSlugs).size, itemSlugs.length);
  });
});
