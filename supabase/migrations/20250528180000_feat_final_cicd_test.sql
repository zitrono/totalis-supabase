-- Final CI/CD test migration
CREATE TABLE IF NOT EXISTS cicd_final_test (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO cicd_final_test (test_status) VALUES ('success');