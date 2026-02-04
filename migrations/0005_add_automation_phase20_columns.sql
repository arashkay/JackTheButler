-- Migration: Add Phase 20 columns to automation_rules
-- These columns support action chaining and retry configuration

-- Add actions column for chained actions (JSON array of ActionDefinition[])
ALTER TABLE automation_rules ADD COLUMN actions TEXT;

-- Add retry_config column for retry configuration (JSON: RetryConfig)
ALTER TABLE automation_rules ADD COLUMN retry_config TEXT;

-- Add consecutive_failures column for tracking failures
ALTER TABLE automation_rules ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0;
