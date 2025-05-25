-- Seed categories data
INSERT INTO categories (id, name, sort_order, slug) VALUES
  (gen_random_uuid(), 'Physical Health', 1, 'physical'),
  (gen_random_uuid(), 'Mental Health', 2, 'mental'),
  (gen_random_uuid(), 'Nutrition', 3, 'nutrition'),
  (gen_random_uuid(), 'Sleep', 4, 'sleep'),
  (gen_random_uuid(), 'Exercise', 5, 'exercise'),
  (gen_random_uuid(), 'Stress Management', 6, 'stress'),
  (gen_random_uuid(), 'Relationships', 7, 'relationships'),
  (gen_random_uuid(), 'Personal Growth', 8, 'growth')
ON CONFLICT (slug) DO NOTHING;