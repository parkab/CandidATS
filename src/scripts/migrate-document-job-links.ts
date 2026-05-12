import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Migration script to populate DocumentJob junction table with existing document-job links.
 * This migrates documents that have job_id set to the new DocumentJob table.
 * 
 * This script should be run once after deploying the schema changes.
 * Usage: npx tsx src/scripts/migrate-document-job-links.ts
 */
async function migrateDocumentJobLinks() {
  try {
    logger.info('Starting document-job link migration...');

    // Get all documents that have a job_id set (generated documents)
    const documentsWithJobId = await prisma.document.findMany({
      where: {
        job_id: {
          not: null,
        },
      },
      select: {
        id: true,
        job_id: true,
        type: true,
      },
    });

    logger.info(`Found ${documentsWithJobId.length} documents with job_id set`);

    if (documentsWithJobId.length === 0) {
      logger.info('No documents to migrate');
      return { migrated: 0, skipped: 0, failed: 0 };
    }

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    // Create DocumentJob records for each document with job_id
    for (const doc of documentsWithJobId) {
      try {
        // Use upsert to handle any existing records gracefully
        const result = await prisma.documentJob.upsert({
          where: {
            documentId_jobId: {
              documentId: doc.id,
              jobId: doc.job_id as string,
            },
          },
          update: {}, // If already exists, do nothing
          create: {
            documentId: doc.id,
            jobId: doc.job_id as string,
          },
        });

        logger.info(`Migrated document ${doc.id} to job ${doc.job_id}`, {
          documentType: doc.type,
        });
        migrated++;
      } catch (error) {
        if (error instanceof Error && error.message.includes('Unique constraint failed')) {
          logger.info(`Skipped duplicate link for document ${doc.id} to job ${doc.job_id}`);
          skipped++;
        } else {
          logger.error(`Failed to migrate document ${doc.id}`, 
            error instanceof Error ? error : new Error(String(error)),
          );
          failed++;
        }
      }
    }

    logger.info('Document-job link migration complete', {
      migrated,
      skipped,
      failed,
    });

    return { migrated, skipped, failed };
  } catch (error) {
    logger.error('Migration failed', 
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}

// Execute migration
migrateDocumentJobLinks()
  .then((result) => {
    console.log('\nMigration Result:');
    console.log(`  Migrated: ${result.migrated}`);
    console.log(`  Skipped: ${result.skipped}`);
    console.log(`  Failed: ${result.failed}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
