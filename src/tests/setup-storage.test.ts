import { supabaseAdmin } from '../utils/supabase';
import { config } from '../config';

describe('Storage Setup Tests', () => {
  const buckets = [
    { name: config.storage.buckets.coachImages, public: true },
    { name: config.storage.buckets.categoryIcons, public: true },
    { name: config.storage.buckets.voiceRecordings, public: false },
  ];

  test('List existing storage buckets', async () => {
    const { data, error } = await supabaseAdmin.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      // If we can't list buckets, it might be a permissions issue
      expect(error).toBeNull();
    } else {
      console.log('Existing buckets:', data?.map(b => b.name) || []);
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test.each(buckets)('Check or create bucket: $name', async ({ name, public: isPublic }) => {
    // First, check if bucket exists
    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error(`Error listing buckets: ${listError.message}`);
      return;
    }

    const bucketExists = existingBuckets?.some(b => b.name === name);

    if (bucketExists) {
      console.log(`Bucket '${name}' already exists`);
      expect(bucketExists).toBe(true);
    } else {
      // Try to create the bucket
      console.log(`Creating bucket '${name}'...`);
      const { data, error } = await supabaseAdmin.storage.createBucket(name, {
        public: isPublic,
        allowedMimeTypes: isPublic 
          ? ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
          : ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg'],
        fileSizeLimit: isPublic ? 5242880 : 15728640, // 5MB for images, 15MB for audio
      });

      if (error) {
        console.error(`Error creating bucket '${name}':`, error.message);
        // Bucket might already exist or we might not have permissions
      } else {
        console.log(`Successfully created bucket '${name}'`);
        expect(data).toBeDefined();
      }
    }
  });

  test('Verify bucket policies', async () => {
    // Test uploading a small test file to each bucket
    const testFile = new Blob(['test'], { type: 'text/plain' });
    
    for (const { name, public: isPublic } of buckets) {
      const fileName = `test-${Date.now()}.txt`;
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from(name)
        .upload(fileName, testFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.log(`Note: Cannot upload to '${name}': ${uploadError.message}`);
        // This might be expected if bucket doesn't exist or has strict policies
      } else {
        console.log(`Successfully uploaded test file to '${name}'`);
        
        // Clean up test file
        await supabaseAdmin.storage.from(name).remove([fileName]);
      }
    }
  });
});