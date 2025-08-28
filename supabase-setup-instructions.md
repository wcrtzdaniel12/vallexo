# Supabase Background Images Setup Instructions

## 1. Create Storage Bucket

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Create the storage bucket for memory background images
INSERT INTO storage.buckets (id, name, public)
VALUES ('memory-backgrounds', 'memory-backgrounds', true);

-- Set up RLS policy to allow public access to images
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'memory-backgrounds');

-- Allow public uploads (optional - you can remove this after uploading images)
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'memory-backgrounds');
```

## 2. Upload Your Images

Upload these images to the `memory-backgrounds` bucket with these exact filenames:

- `school-hallway.jpg` - School hallway/corridor scenes
- `school-canteen.jpg` - Cafeteria/lunch room scenes  
- `classroom.jpg` - Classroom scenes
- `playground.jpg` - Playground/outdoor play scenes
- `chuck-e-cheese.jpg` - Chuck E. Cheese/arcade scenes
- `birthday-party.jpg` - Birthday party scenes
- `living-room.jpg` - Living room/home scenes
- `cousins-house.jpg` - Visiting relatives' house scenes

### Upload Methods:

**Option A: Supabase Dashboard**
1. Go to Storage in your Supabase dashboard
2. Open the `memory-backgrounds` bucket
3. Upload each image with the exact filename above

**Option B: Using Supabase CLI**
```bash
# Upload all images at once
supabase storage cp ./school-hallway.jpg storage/memory-backgrounds/school-hallway.jpg
supabase storage cp ./school-canteen.jpg storage/memory-backgrounds/school-canteen.jpg
supabase storage cp ./classroom.jpg storage/memory-backgrounds/classroom.jpg
supabase storage cp ./playground.jpg storage/memory-backgrounds/playground.jpg
supabase storage cp ./chuck-e-cheese.jpg storage/memory-backgrounds/chuck-e-cheese.jpg
supabase storage cp ./birthday-party.jpg storage/memory-backgrounds/birthday-party.jpg
supabase storage cp ./living-room.jpg storage/memory-backgrounds/living-room.jpg
supabase storage cp ./cousins-house.jpg storage/memory-backgrounds/cousins-house.jpg
```

## 3. Verify Setup

After uploading, your images will be accessible at:
```
https://[your-project-ref].supabase.co/storage/v1/object/public/memory-backgrounds/[filename]
```

Example:
```
https://yhnsuovqpewwyqofrtaz.supabase.co/storage/v1/object/public/memory-backgrounds/school-hallway.jpg
```

## 4. Deploy the New Function

```bash
# Deploy the background image matcher function
supabase functions deploy getBackgroundImageV2
```

## 5. Test the System

The system will automatically:
1. Analyze the generated memory text
2. Match it to the most appropriate background image
3. Return the Supabase storage URL
4. Use that image as the background during narration and video recording

## Image Matching Logic

The system matches memories based on keywords:

- **School Hallway**: "school hallway", "corridor", "lockers", "fluorescent light"
- **Classroom**: "classroom", "school desk", "blackboard", "teacher"
- **Playground**: "playground", "swing", "slide", "recess"
- **Chuck E. Cheese**: "chuck e cheese", "arcade", "pizza place", "ball pit"
- **Birthday Party**: "birthday party", "cake", "balloons", "party hat"
- **Living Room**: "living room", "couch", "tv", "carpet"
- **School Canteen**: "cafeteria", "lunch room", "food tray"
- **Cousin's House**: "cousin's house", "relative house", "family visit"

## Troubleshooting

- If images don't load, check the bucket is public and policies are set correctly
- Verify filenames match exactly (case-sensitive)
- Check Supabase function logs for any errors
- The system falls back to local images if Supabase images aren't found


