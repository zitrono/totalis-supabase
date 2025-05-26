# Supabase Storage Buckets Documentation

This document serves as the single source of truth for all Supabase storage buckets in the Totalis project.

## Overview

The Totalis application uses Supabase Storage for managing various types of files including user images, coach photos, category icons, and voice recordings. Each bucket has specific access policies and file type restrictions.

## Buckets Configuration

### 1. coach-images (Public)

**Purpose**: Stores coach profile images in multiple sizes for performance optimization

**Structure**:
```
coach-images/
├── main/         # Full-size images
├── 30/          # 30px thumbnails
├── 45/          # 45px thumbnails
└── 60/          # 60px thumbnails
```

**Configuration**:
- Public: `true`
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- File size limit: 5MB
- Access: Anyone can view, only service role can upload/modify

**RLS Policies**:
- Public read access for all users
- Service role only for write operations

### 2. category-icons (Public)

**Purpose**: Stores wellness category icon images

**Structure**:
```
category-icons/
├── main/         # Primary icons
└── secondary/    # Secondary/alternate icons (optional)
```

**Configuration**:
- Public: `true`
- Allowed MIME types: `image/svg+xml`, `image/png`, `image/jpeg`, `image/webp`
- File size limit: 5MB
- Access: Anyone can view, only service role can upload/modify

**RLS Policies**:
- Public read access for all users
- Service role only for write operations

### 3. voice-recordings (Private)

**Purpose**: Stores user audio recordings from check-ins for AI transcription

**Structure**:
```
voice-recordings/
└── [user-id]/
    └── [timestamp]-[checksum].{mp3|wav|webm|ogg}
```

**Configuration**:
- Public: `false`
- Allowed MIME types: `audio/mp3`, `audio/wav`, `audio/webm`, `audio/ogg`
- File size limit: 15MB (approximately 60 seconds of audio)
- Access: Users can only access their own recordings

**RLS Policies**:
- Users can upload to their own folder
- Users can read/update/delete their own recordings
- Service role has full access

### 4. user-images (Public)

**Purpose**: Stores user-uploaded images including profile photos

**Structure**:
```
user-images/
├── [user-id]/           # User's personal folder
│   ├── profile/        # Profile photos
│   └── uploads/        # Other uploads
└── test-*/             # Test upload folders
```

**Configuration**:
- Public: `true`
- Allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- File size limit: 5MB
- Access: Public read, authenticated users can manage their own images

**RLS Policies** (from migration `20250527000001_fix_user_images_policies.sql`):
1. **Upload Policy**: Users can upload to:
   - Their own folder: `user-images/[user-id]/...`
   - Test folders: `user-images/test-*/...`
   - Test files: `user-images/test-*.png`

2. **View Policy**: 
   - Authenticated users can view all images
   - Public/anonymous users can view all images

3. **Update Policy**: Users can update:
   - Images they own
   - Images in their folder
   - Test images

4. **Delete Policy**: Users can delete:
   - Images they own
   - Images in their folder
   - Test images

5. **Service Role**: Full access to all operations

## Usage Examples

### Uploading a User Profile Image
```typescript
const { data, error } = await supabase.storage
  .from('user-images')
  .upload(`${userId}/profile/avatar.jpg`, file, {
    contentType: 'image/jpeg',
    upsert: true
  });
```

### Uploading a Test Image
```typescript
const { data, error } = await supabase.storage
  .from('user-images')
  .upload(`test-${testRunId}/test-image.png`, file, {
    contentType: 'image/png'
  });
```

### Getting a Public URL
```typescript
const { data } = supabase.storage
  .from('user-images')
  .getPublicUrl(`${userId}/profile/avatar.jpg`);
```

## Migrations

All bucket configurations and RLS policies are managed through SQL migrations:
- `20250527000000_create_storage_buckets.sql` - Creates user-images bucket
- `20250527000001_fix_user_images_policies.sql` - Fixes RLS policies for user-images

## Testing

Storage operations are tested in:
- `src/tests/integration/sdk-operations.test.ts` - SDK storage operations
- `src/tests/setup-storage.test.ts` - Bucket setup verification

## Future Considerations

1. **Image Processing**: Consider implementing automatic thumbnail generation for user-images similar to coach-images
2. **Cleanup Strategy**: Implement automated cleanup for orphaned files and old test data
3. **Voice Transcription**: Complete the voice-transcribe edge function to process recordings
4. **Monitoring**: Add storage usage monitoring and alerts

## Security Notes

- Never expose service role key in client applications
- Always validate file types and sizes before upload
- Use folder-based organization for better RLS policy management
- Test uploads should always use `test-` prefix for easy identification and cleanup