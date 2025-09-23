import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRealTimeApiMetrics1737454000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Creating real-time API metrics tables...');

    // 1. Recent API Calls (last 20 requests - rolling window)
    await queryRunner.query(`
      CREATE TABLE api_recent_calls (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider ENUM('itunes','spotify','youtube','google','facebook','twitter','gemini') NOT NULL,
        endpoint_type ENUM('search','detail','image_generation','authentication','social_post','other') NOT NULL,
        status_code INT NOT NULL,
        response_time_ms INT NOT NULL,
        success BOOLEAN NOT NULL,
        rate_limited BOOLEAN DEFAULT FALSE,
        error_type VARCHAR(100) NULL,
        timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
        
        INDEX idx_provider_timestamp (provider, timestamp),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB;
    `);

    // 2. Real-time counters (minute-level granularity)
    await queryRunner.query(`
      CREATE TABLE api_realtime_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider ENUM('itunes','spotify','youtube','google','facebook','twitter','gemini') NOT NULL,
        minute_timestamp DATETIME NOT NULL, -- Truncated to minute (2025-09-22 14:35:00)
        
        -- Counters for this minute
        total_requests INT DEFAULT 0,
        successful_requests INT DEFAULT 0,
        failed_requests INT DEFAULT 0,
        rate_limited_requests INT DEFAULT 0,
        
        -- Response time stats for this minute
        total_response_time_ms BIGINT DEFAULT 0,
        min_response_time_ms INT DEFAULT NULL,
        max_response_time_ms INT DEFAULT NULL,
        
        -- Timestamps
        created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        
        UNIQUE KEY unique_provider_minute (provider, minute_timestamp),
        INDEX idx_minute_timestamp (minute_timestamp),
        INDEX idx_provider (provider)
      ) ENGINE=InnoDB;
    `);

    // 3. Rate limit status (current state)
    await queryRunner.query(`
      CREATE TABLE api_rate_limit_status (
        provider ENUM('itunes','spotify','youtube','google','facebook','twitter','gemini') PRIMARY KEY,
        
        -- Current rate limit info
        max_requests_per_minute INT NOT NULL DEFAULT 300,
        current_minute_count INT DEFAULT 0,
        current_minute_start DATETIME NULL,
        
        -- Status flags
        is_rate_limited BOOLEAN DEFAULT FALSE,
        circuit_breaker_open BOOLEAN DEFAULT FALSE,
        
        -- Last request info
        last_request_at TIMESTAMP(3) NULL,
        last_success_at TIMESTAMP(3) NULL,
        last_error_at TIMESTAMP(3) NULL,
        
        -- Timestamps
        updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB;
    `);

    // 4. Insert default rate limit configurations
    await queryRunner.query(`
      INSERT INTO api_rate_limit_status (provider, max_requests_per_minute) VALUES
      ('itunes', 300),
      ('spotify', 100),
      ('youtube', 200),
      ('google', 500),
      ('facebook', 150),
      ('twitter', 180),
      ('gemini', 60)
      ON DUPLICATE KEY UPDATE max_requests_per_minute = VALUES(max_requests_per_minute);
    `);

    console.log('✅ Real-time API metrics tables created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Dropping real-time API metrics tables...');

    await queryRunner.query('DROP TABLE IF EXISTS api_rate_limit_status');
    await queryRunner.query('DROP TABLE IF EXISTS api_realtime_metrics');
    await queryRunner.query('DROP TABLE IF EXISTS api_recent_calls');

    console.log('✅ Real-time API metrics tables dropped');
  }
}
