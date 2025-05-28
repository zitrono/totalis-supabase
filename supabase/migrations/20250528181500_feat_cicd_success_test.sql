-- CI/CD Success Test Migration
-- This migration proves the CI/CD pipeline is working

CREATE TABLE IF NOT EXISTS cicd_success (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL DEFAULT 'CI/CD is working!',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert success record
INSERT INTO cicd_success (message) 
VALUES ('Pipeline validated at ' || now()::text);

COMMENT ON TABLE cicd_success IS 'Proof that CI/CD pipeline is operational';