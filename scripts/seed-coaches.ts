import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const coaches = [
  {
    name: 'Daniel',
    bio: 'A compassionate and holistic wellness coach focused on mind-body balance.',
    sex: 'male',
    year_of_birth: 1975,
    prompt: 'You are Daniel, a warm and empathetic wellness coach. Focus on holistic health, mindfulness, and creating sustainable lifestyle changes. Be encouraging and supportive.',
    voice_id: 'alloy',
    is_active: true
  },
  {
    name: 'Sarah',
    bio: 'An energetic fitness and nutrition specialist with a passion for helping people achieve their health goals.',
    sex: 'female',
    year_of_birth: 1982,
    prompt: 'You are Sarah, an enthusiastic and knowledgeable fitness coach. Focus on physical activity, nutrition, and motivation. Be energetic but understanding of individual limitations.',
    voice_id: 'nova',
    is_active: true
  },
  {
    name: 'Michael',
    bio: 'A data-driven health coach who combines science with practical wellness strategies.',
    sex: 'male',
    year_of_birth: 1978,
    prompt: 'You are Michael, an analytical and evidence-based health coach. Focus on measurable improvements, scientific approaches, and systematic progress tracking.',
    voice_id: 'echo',
    is_active: true
  },
  {
    name: 'Emma',
    bio: 'A mental health advocate specializing in stress management and emotional wellness.',
    sex: 'female',
    year_of_birth: 1985,
    prompt: 'You are Emma, a caring mental wellness coach. Focus on emotional health, stress management, and building resilience. Be gentle and non-judgmental.',
    voice_id: 'shimmer',
    is_active: true
  }
];

async function seedCoaches() {
  console.log('🌱 Seeding coaches...\n');

  for (const coach of coaches) {
    try {
      // Check if coach already exists
      const { data: existing } = await supabase
        .from('coaches')
        .select('id, name')
        .eq('name', coach.name)
        .single();

      if (existing) {
        console.log(`✓ Coach "${coach.name}" already exists`);
        continue;
      }

      // Insert new coach
      const { data, error } = await supabase
        .from('coaches')
        .insert([coach])
        .select()
        .single();

      if (error) {
        console.error(`✗ Failed to create coach "${coach.name}":`, error.message);
      } else {
        console.log(`✓ Created coach "${coach.name}"`);
      }
    } catch (error: any) {
      console.error(`✗ Error processing coach "${coach.name}":`, error.message);
    }
  }

  // Set Daniel as default coach
  console.log('\n📌 Setting default coach...');
  
  const { data: daniel } = await supabase
    .from('coaches')
    .select('id')
    .eq('name', 'Daniel')
    .single();

  if (daniel) {
    const { error } = await supabase
      .from('app_config')
      .upsert({
        key: 'default_coach',
        value: { default_coach_id: daniel.id },
        description: 'Default coach for new users',
        is_public: false
      });

    if (error) {
      console.error('✗ Failed to set default coach:', error.message);
    } else {
      console.log('✓ Daniel set as default coach');
    }
  }

  // Verify seeding
  const { data: allCoaches, count } = await supabase
    .from('coaches')
    .select('*', { count: 'exact' });

  console.log(`\n✅ Total coaches in database: ${count}`);
  
  if (allCoaches) {
    console.log('\nActive coaches:');
    allCoaches
      .filter(c => c.is_active)
      .forEach(c => console.log(`  - ${c.name} (${c.sex}, born ${c.year_of_birth})`));
  }
}

seedCoaches().catch(console.error);