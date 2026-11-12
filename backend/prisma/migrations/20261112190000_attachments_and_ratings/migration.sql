-- Attachments are now stored in the database (no external file storage needed),
-- and each ticket can have at most one satisfaction rating.
-- Both tables were unused before this migration; the cleanup statements below
-- only guard against stray rows that would block the new constraints.

DELETE FROM "ticket_attachments";

DELETE FROM "satisfaction_ratings" a
USING "satisfaction_ratings" b
WHERE a."ticketId" = b."ticketId" AND a."createdAt" < b."createdAt";

-- AlterTable
ALTER TABLE "ticket_attachments" DROP COLUMN "fileUrl",
ADD COLUMN     "data" BYTEA NOT NULL,
ADD COLUMN     "uploadedById" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ticket_attachments_ticketId_idx" ON "ticket_attachments"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "satisfaction_ratings_ticketId_key" ON "satisfaction_ratings"("ticketId");

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
