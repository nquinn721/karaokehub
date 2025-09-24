import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApiMonitoringTables1736531800000 implements MigrationInterface {
  name = 'CreateApiMonitoringTables1736531800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create api_metrics_daily table (if not exists)
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS api_metrics_daily (
                id CHAR(36) NOT NULL DEFAULT (UUID()),
                date VARCHAR(10) NOT NULL,
                provider ENUM('itunes', 'spotify', 'youtube', 'google', 'facebook', 'twitter', 'gemini') NOT NULL,
                endpointType ENUM('search', 'detail', 'image_generation', 'authentication', 'social_post', 'other') NOT NULL,
                totalCalls INT NOT NULL DEFAULT 0,
                successCount INT NOT NULL DEFAULT 0,
                errorCount INT NOT NULL DEFAULT 0,
                rateLimitHits INT NOT NULL DEFAULT 0,
                avgResponseTime DECIMAL(10,2) NOT NULL DEFAULT 0,
                minResponseTime DECIMAL(10,2) NOT NULL DEFAULT 0,
                maxResponseTime DECIMAL(10,2) NOT NULL DEFAULT 0,
                totalResponseTime BIGINT NOT NULL DEFAULT 0,
                createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (id),
                UNIQUE KEY unique_date_provider_endpoint (date, provider, endpointType),
                INDEX idx_date (date),
                INDEX idx_provider (provider),
                INDEX idx_endpoint_type (endpointType)
            ) ENGINE=InnoDB
        `);

    // Create api_issues table (if not exists)
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS api_issues (
                id CHAR(36) NOT NULL DEFAULT (UUID()),
                timestamp TIMESTAMP(6) NOT NULL,
                provider ENUM('itunes', 'spotify', 'youtube', 'google', 'facebook', 'twitter', 'gemini') NOT NULL,
                endpointType ENUM('search', 'detail', 'image_generation', 'authentication', 'social_post', 'other') NOT NULL,
                issueType ENUM('error', 'rate_limit', 'timeout', 'invalid_response') NOT NULL,
                errorCode VARCHAR(50) NULL,
                errorMessage TEXT NULL,
                requestDetails JSON NULL,
                responseDetails JSON NULL,
                responseTime DECIMAL(10,2) NOT NULL,
                isResolved BOOLEAN NOT NULL DEFAULT false,
                resolvedAt TIMESTAMP(6) NULL,
                resolvedBy VARCHAR(255) NULL,
                resolutionNotes TEXT NULL,
                createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (id),
                INDEX idx_timestamp (timestamp),
                INDEX idx_provider (provider),
                INDEX idx_issue_type (issueType),
                INDEX idx_resolved (isResolved),
                INDEX idx_provider_issue_type (provider, issueType),
                INDEX idx_unresolved (isResolved, createdAt)
            ) ENGINE=InnoDB
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS api_issues`);
    await queryRunner.query(`DROP TABLE IF EXISTS api_metrics_daily`);
  }
}
