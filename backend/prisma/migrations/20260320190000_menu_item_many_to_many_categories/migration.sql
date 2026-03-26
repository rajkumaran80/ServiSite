-- Create the implicit many-to-many join table (Prisma convention: _CategoryToMenuItem)
CREATE TABLE "_CategoryToMenuItem" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Migrate existing single-category relationships into the join table
INSERT INTO "_CategoryToMenuItem" ("A", "B")
SELECT "categoryId", "id"
FROM "menu_items"
WHERE "categoryId" IS NOT NULL;

-- Unique index required by Prisma for implicit M2M
CREATE UNIQUE INDEX "_CategoryToMenuItem_AB_unique" ON "_CategoryToMenuItem"("A" ASC, "B" ASC);
CREATE INDEX "_CategoryToMenuItem_B_index" ON "_CategoryToMenuItem"("B");

-- Drop the old FK constraint and column
ALTER TABLE "menu_items" DROP CONSTRAINT IF EXISTS "menu_items_categoryId_fkey";
ALTER TABLE "menu_items" DROP COLUMN IF EXISTS "categoryId";
