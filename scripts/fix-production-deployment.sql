-- Fix production deployment by marking old migrations as complete
-- and new consolidated migration as already applied

-- First, mark all the old migrations as complete (not reverted)
UPDATE supabase_migrations.schema_migrations 
SET executed_at = NOW() 
WHERE version IN (
  '20240526000000', '20240526000001', '20240526000002', '20240527000000',
  '20240528000000', '20240528000004', '20240529000001', '20240529000002',
  '20240529000003', '20240529000004', '20240529000005', '20240529000006',
  '20240529000007', '20240529000008', '20250526120917', '20250527000000',
  '20250527000001', '20250527000002', '20250527000003', '20250527000004',
  '20250527000006', '20250527182540', '20250527184018', '20250527185230',
  '20250527190501', '20250527191502', '20250528095452', '20250528150000',
  '20250528160000', '20250528161000', '20250528170000', '20250528171000',
  '20250528172000', '20250528172603', '20250528173000', '20250528180000',
  '20250528180133', '20250528183000', '20250528185000', '20250528190000',
  '20250528191000', '20250528192000', '20250529142736'
);

-- Mark the consolidated migration as already applied
-- since the schema already exists
INSERT INTO supabase_migrations.schema_migrations (version, name, hash, executed_at)
VALUES 
  ('20250529154547', '20250529154547_refactor_consolidated_base_schema', 'consolidated', NOW())
ON CONFLICT (version) DO UPDATE SET executed_at = NOW();

-- The other migrations are actual changes that need to be applied
-- We'll let db push handle those