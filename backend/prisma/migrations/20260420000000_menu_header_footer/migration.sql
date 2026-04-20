-- Add headerText and footerText to menu_groups and categories
ALTER TABLE "menu_groups" ADD COLUMN "headerText" TEXT;
ALTER TABLE "menu_groups" ADD COLUMN "footerText" TEXT;
ALTER TABLE "categories" ADD COLUMN "headerText" TEXT;
ALTER TABLE "categories" ADD COLUMN "footerText" TEXT;
