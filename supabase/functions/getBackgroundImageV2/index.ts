/* global Deno */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const { memoryText } = await req.json();

    if (!memoryText) {
      return new Response(JSON.stringify({ error: "Memory text is required" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
        },
      });
    }

    // Shared keyword sets for each location type
    // All 3 variations of each location share identical keywords for true random selection
    const locationKeywords = {
      'school-hallway': [
        'school hallway', 'hallway', 'corridor', 'school corridor', 'lockers', 'school locker',
        'classroom door', 'between classes', 'fluorescent light', 'school wall', 'tile floor',
        'school passage', 'walking down the hall', 'hallway echo', 'empty hallway', 'school hall',
        'school entrance', 'main hallway', 'long corridor', 'school building', 'principal office'
      ],
      'school-canteen': [
        'school canteen', 'cafeteria', 'lunch room', 'school lunch', 'lunch tray', 'food line',
        'lunch lady', 'school meal', 'dining hall', 'cafeteria table', 'lunch break', 'school food',
        'milk carton', 'lunch money', 'school kitchen', 'food court', 'lunch period'
      ],
      'classroom': [
        'classroom', 'school desk', 'blackboard', 'whiteboard', 'teacher desk', 'student chair',
        'school lesson', 'math class', 'reading class', 'science class', 'classroom window',
        'bulletin board', 'classroom poster', 'pencil sharpener', 'classroom door', 'school bell',
        'homework', 'test paper', 'school assignment', 'classroom rules', 'alphabet chart'
      ],
      'school-gym': [
        'school gym', 'gymnasium', 'basketball court', 'gym class', 'physical education',
        'PE teacher', 'gym equipment', 'sports class', 'volleyball net', 'gym floor',
        'bleachers', 'climbing rope', 'gym shoes', 'locker room', 'sports uniform'
      ],
      'library-reading-corner': [
        'library', 'reading corner', 'book shelf', 'library books', 'reading nook', 'quiet zone',
        'librarian', 'study area', 'reading table', 'library chair', 'story time', 'book corner',
        'children section', 'picture books', 'reading lamp', 'cozy corner', 'library card'
      ],
      'tutorial-center': [
        'tutorial center', 'after school', 'tutoring', 'study center', 'homework help',
        'learning center', 'academic support', 'extra class', 'study group', 'tutor',
        'supplementary education', 'enrichment class', 'learning lab', 'study hall'
      ],
      'living-room': [
        'living room', 'family room', 'couch', 'sofa', 'television', 'TV', 'coffee table',
        'family time', 'home', 'house', 'carpet', 'curtains', 'family photo', 'lamp',
        'remote control', 'cushion', 'family gathering', 'home comfort', 'relaxing'
      ],
      'cousins-house': [
        'cousin house', 'relative home', 'family visit', 'sleepover', 'family gathering',
        'extended family', 'cousin bedroom', 'visiting family', 'family reunion', 'guest room',
        'family friend', 'different house', 'cousin sleepover', 'family bond'
      ],
      'grandparents-kitchen': [
        'grandparents kitchen', 'grandma kitchen', 'grandpa kitchen', 'grandmother cooking',
        'grandfather helping', 'family recipe', 'traditional cooking', 'home cooking',
        'kitchen table', 'family meal', 'grandparent home', 'old kitchen', 'warm kitchen',
        'family tradition', 'cooking together', 'kitchen wisdom', 'family stories'
      ],
      'backyard': [
        'backyard', 'back yard', 'garden', 'outdoor play', 'grass', 'tree', 'fence',
        'outdoor games', 'family barbecue', 'backyard party', 'swing set', 'sandbox',
        'outdoor fun', 'yard work', 'gardening', 'outdoor space', 'patio', 'deck'
      ],
      'sleepover-bedroom': [
        'sleepover', 'sleepover bedroom', 'friend bedroom', 'pajama party', 'sleepover night',
        'friend house', 'overnight stay', 'sleepover fun', 'bedroom party', 'friend visit',
        'sleepover games', 'pillow fight', 'late night', 'friend bonding', 'bedroom sleepover'
      ],
      'chuck-e-cheese': [
        'chuck e cheese', 'chuck e. cheese', 'pizza place', 'arcade restaurant', 'birthday party',
        'kid restaurant', 'family restaurant', 'game tokens', 'arcade games', 'pizza party',
        'mascot', 'kid entertainment', 'family fun center', 'birthday celebration'
      ],
      'birthday-party-venue': [
        'birthday party', 'party venue', 'birthday celebration', 'party room', 'birthday cake',
        'party decorations', 'birthday balloons', 'party games', 'birthday fun', 'celebration',
        'party hall', 'birthday entertainment', 'festive venue', 'party space'
      ],
      'playground': [
        'playground', 'play ground', 'swing', 'slide', 'monkey bars', 'see saw', 'sandbox',
        'outdoor play', 'children playing', 'park', 'playground equipment', 'recess',
        'outdoor fun', 'climbing frame', 'play area', 'kid zone', 'recreational area'
      ],
      'toy-store': [
        'toy store', 'toy shop', 'toy aisle', 'action figures', 'dolls', 'board games',
        'toy shopping', 'toy display', 'children toys', 'play store', 'toy section',
        'toy counter', 'stuffed animals', 'toy shelves', 'toy collection', 'kid store'
      ],
      'arcade': [
        'arcade', 'game arcade', 'video games', 'arcade games', 'game tokens', 'game room',
        'arcade machines', 'gaming center', 'pinball', 'arcade cabinet', 'game hall',
        'electronic games', 'coin games', 'arcade fun', 'gaming venue'
      ],
      'theme-park': [
        'theme park', 'amusement park', 'roller coaster', 'theme park ride', 'carnival',
        'fair', 'theme park attraction', 'ferris wheel', 'theme park fun', 'park rides',
        'adventure park', 'entertainment park', 'family park', 'theme park adventure'
      ],
      'fast-food-play-area': [
        'fast food play area', 'mcdonalds playground', 'restaurant playground', 'indoor playground',
        'fast food restaurant', 'kid meal', 'happy meal', 'restaurant play zone', 'family restaurant',
        'fast food fun', 'restaurant entertainment', 'kid friendly restaurant', 'play area'
      ],
      'ice-cream-parlor': [
        'ice cream parlor', 'ice cream shop', 'ice cream store', 'gelato shop', 'ice cream counter',
        'ice cream flavors', 'ice cream treat', 'frozen yogurt', 'ice cream cone', 'sundae',
        'ice cream social', 'sweet shop', 'dessert parlor', 'ice cream date'
      ],
      'movie-theater-lobby': [
        'movie theater lobby', 'cinema lobby', 'theater entrance', 'movie poster', 'concession stand',
        'movie tickets', 'theater carpet', 'movie theater', 'cinema entrance', 'lobby area',
        'movie night', 'theater visit', 'cinema experience', 'movie outing'
      ],
      'family-van': [
        'family van', 'minivan', 'car trip', 'family car', 'road trip', 'car ride',
        'family travel', 'van interior', 'car seat', 'family vehicle', 'long drive',
        'car journey', 'family vacation', 'travel van', 'passenger van'
      ],
      'field-trip-bus': [
        'field trip bus', 'school bus', 'bus ride', 'school trip', 'educational trip',
        'class trip', 'bus interior', 'school excursion', 'field trip', 'bus journey',
        'school transportation', 'bus seats', 'student trip', 'class outing'
      ],
      'beach-resort': [
        'beach resort', 'beach hotel', 'seaside resort', 'beach vacation', 'ocean resort',
        'beach lobby', 'coastal resort', 'beachfront hotel', 'resort pool', 'beach club',
        'tropical resort', 'vacation resort', 'beach getaway', 'seaside hotel'
      ],
      'airport-family-trip': [
        'airport', 'airport terminal', 'family trip', 'airport waiting', 'flight departure',
        'airport lounge', 'travel terminal', 'airport gate', 'family travel', 'vacation flight',
        'airport check-in', 'boarding gate', 'departure lounge', 'airport journey'
      ],
      'hotel-lobby': [
        'hotel lobby', 'hotel entrance', 'hotel reception', 'hotel check-in', 'vacation hotel',
        'family hotel', 'hotel stay', 'lobby area', 'hotel interior', 'accommodation',
        'travel hotel', 'tourist hotel', 'holiday hotel', 'hotel visit'
      ],
      'public-pool': [
        'public pool', 'swimming pool', 'community pool', 'pool area', 'swimming lesson',
        'pool deck', 'lifeguard', 'pool party', 'swimming', 'water activity', 'pool fun',
        'aquatic center', 'municipal pool', 'recreation pool', 'pool facility'
      ],
      'mall-kids-section': [
        'mall kids section', 'shopping mall', 'kids area', 'toy section', 'children zone',
        'mall playground', 'family mall', 'kid friendly mall', 'shopping center', 'retail therapy',
        'mall visit', 'shopping trip', 'mall entertainment', 'children activities'
      ],
      'dentist-waiting-room': [
        'dentist waiting room', 'dental office', 'dentist office', 'medical waiting room',
        'dental appointment', 'dentist visit', 'oral hygiene', 'dental checkup', 'tooth doctor',
        'dental clinic', 'orthodontist', 'dental care', 'medical office', 'healthcare visit'
      ],
      'rainy-school-pickup': [
        'rainy school pickup', 'school pickup', 'rainy day', 'school dismissal', 'wet weather',
        'umbrella', 'rain coat', 'school gate', 'after school', 'parent pickup', 'school exit',
        'rainy afternoon', 'weather protection', 'school end'
      ],
      'gas-station-store': [
        'gas station store', 'convenience store', 'petrol station shop', 'road trip stop',
        'fuel station', 'travel store', 'highway stop', 'gas station visit', 'convenience shopping',
        'snack stop', 'refuel stop', 'roadside store', 'travel break'
      ],
      'grocery-store': [
        'grocery store', 'supermarket', 'food shopping', 'grocery shopping', 'food store',
        'grocery aisle', 'shopping cart', 'food market', 'family shopping', 'grocery trip',
        'supermarket visit', 'food purchase', 'grocery run', 'market shopping'
      ],
      'church-sunday-school': [
        'church sunday school', 'sunday school', 'church class', 'religious education',
        'church children', 'bible study', 'church lesson', 'faith education', 'church activity',
        'religious class', 'spiritual learning', 'church program', 'christian education'
      ],
      'summer-camp-cabin': [
        'summer camp cabin', 'camp cabin', 'summer camp', 'camp bunk', 'cabin life',
        'outdoor camp', 'camp experience', 'camp dormitory', 'camp accommodation', 'wilderness camp',
        'camp adventure', 'camp facility', 'camp building', 'camp retreat'
      ]
    };

    // Generate the full settings map by creating all 3 variations for each location
    const settingKeywords: Record<string, string[]> = {};
    Object.entries(locationKeywords).forEach(([location, keywords]: [string, string[]]) => {
      // All 3 variations get the exact same keywords for true random selection
      settingKeywords[`${location}-1.jpg`] = keywords;
      settingKeywords[`${location}-2.jpg`] = keywords;
      settingKeywords[`${location}-3.jpg`] = keywords;
    });

    // Normalize text for matching
    const normalizedText = memoryText.toLowerCase();
    
    // Calculate scores for each image with first-mention priority
    const scores: Record<string, number> = {};
    const firstMentionBonus = 50; // High bonus for first-mentioned setting
    
    Object.entries(settingKeywords).forEach(([image, keywords]: [string, string[]]) => {
      let score = 0;
      let firstMentionIndex = -1;
      
      keywords.forEach((keyword: string) => {
        const keywordLower = keyword.toLowerCase();
        if (normalizedText.includes(keywordLower)) {
          // Base score for exact match
          score += 10;
          
          // Bonus for longer, more specific matches
          if (keywordLower.length > 10) score += 5;
          
          // Count multiple occurrences
          const matches = (normalizedText.match(new RegExp(keywordLower, 'g')) || []).length;
          score += (matches - 1) * 3;
          
          // Track the earliest mention position
          const mentionIndex = normalizedText.indexOf(keywordLower);
          if (firstMentionIndex === -1 || mentionIndex < firstMentionIndex) {
            firstMentionIndex = mentionIndex;
          }
        }
      });
      
      if (score > 0) {
        // Add first-mention bonus based on position
        if (firstMentionIndex !== -1) {
          // Earlier mentions get higher bonus (closer to start of text)
          const positionBonus = Math.max(0, firstMentionBonus - (firstMentionIndex * 0.5));
          score += positionBonus;
        }
        scores[image] = score;
      }
    });

    // Find best match and randomly select variation
    let bestMatch = 'school-hallway-1.jpg'; // fallback
    let selectionInfo: Record<string, string | number> = { method: 'fallback' };
    
    if (Object.keys(scores).length > 0) {
      const scoreValues: number[] = Object.values(scores);
      const maxScore = Math.max(...scoreValues);
      const topMatches = Object.entries(scores).filter(([_, score]) => score === maxScore);
      
      if (topMatches.length === 1) {
        bestMatch = topMatches[0][0];
        const baseLocation = bestMatch.replace(/-[123]\.jpg$/, '');
        selectionInfo = { 
          method: 'single-match', 
          variationsConsidered: 1,
          location: baseLocation,
          reason: 'First-mentioned setting with highest score'
        };
      } else {
        // Multiple matches with same score - group by location and randomly select variation
        const locationGroups: Record<string, Array<[string, number]>> = {};
        topMatches.forEach(([image, score]) => {
          const baseLocation = image.replace(/-[123]\.jpg$/, '');
          if (!locationGroups[baseLocation]) locationGroups[baseLocation] = [];
          locationGroups[baseLocation].push([image, score]);
        });
        
        // If all top matches are from the same location (expected behavior)
        const locationNames = Object.keys(locationGroups);
        if (locationNames.length === 1) {
          // All variations of the same location - randomly pick one
          const variations = locationGroups[locationNames[0]];
          const randomIndex = Math.floor(Math.random() * variations.length);
          bestMatch = variations[randomIndex][0];
          selectionInfo = { 
            method: 'random-variation', 
            location: locationNames[0],
            variationsConsidered: variations.length,
            selectedVariation: randomIndex + 1,
            reason: 'First-mentioned location with random variation selection'
          };
        } else {
          // Multiple different locations tied - pick random location, then random variation
          const randomLocation = locationNames[Math.floor(Math.random() * locationNames.length)];
          const variations = locationGroups[randomLocation];
          const randomVariation = Math.floor(Math.random() * variations.length);
          bestMatch = variations[randomVariation][0];
          selectionInfo = { 
            method: 'random-location-and-variation',
            locationsConsidered: locationNames.length,
            selectedLocation: randomLocation,
            variationsConsidered: variations.length
          };
        }
      }
    } else {
      // No matches found - select completely random image
      const allImages = Object.keys(settingKeywords);
      bestMatch = allImages[Math.floor(Math.random() * allImages.length)];
      const baseLocation = bestMatch.replace(/-[123]\.jpg$/, '');
      selectionInfo = { 
        method: 'no-keywords-random', 
        totalImages: allImages.length,
        randomLocation: baseLocation
      };
    }

    // Validate image exists in Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://yhnsuovqpewwyqofrtaz.supabase.co';
    const bucketName = 'memory-backgrounds';
    const imageUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${bestMatch}`;
    
    try {
      console.log(`🔍 Checking if image exists: ${imageUrl}`);
      const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
      
      if (!imageResponse.ok) {
        const errorMessage = imageResponse.status === 404 
          ? `Image '${bestMatch}' not found in storage bucket '${bucketName}'`
          : `Storage access error (${imageResponse.status}): ${imageResponse.statusText}`;
        console.warn(`⚠️ ${errorMessage}`);
        
        return new Response(JSON.stringify({
          backgroundUrl: 'img/hallway1.png', // Local fallback
          matchedSetting: bestMatch,
          confidence: scores[bestMatch] || 0,
          error: errorMessage,
          uploadGuide: {
            message: "Some background images are missing from Supabase Storage",
            bucketName: bucketName,
            requiredImages: "See COMPLETE_IMAGE_LIST_99.md for all 99 required files",
            uploadInstructions: "Upload missing images to Storage bucket with public read access"
          }
        }), {
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
          },
        });
      }
      
      console.log(`✅ Image found successfully: ${bestMatch}`);
    } catch (error) {
      console.error(`❌ Storage validation error:`, error);
      return new Response(JSON.stringify({
        backgroundUrl: 'img/hallway1.png', // Local fallback
        matchedSetting: bestMatch,
        confidence: scores[bestMatch] || 0,
        error: `Storage connection failed: ${error instanceof Error ? error.message : String(error)}`,
        uploadGuide: {
          message: "Cannot access Supabase Storage - check configuration",
          troubleshooting: "Verify SUPABASE_URL environment variable and storage bucket setup",
          fallback: "Using local fallback image"
        }
      }), {
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
        },
      });
    }

    // Return successful match with enhanced debugging
    const baseLocation = bestMatch.replace(/-[123]\.jpg$/, '');
    const allScores = Object.entries(scores)
      .map(([image, score]) => {
        const loc = image.replace(/-[123]\.jpg$/, '');
        return { image, location: loc, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 scores for debugging
    
    return new Response(JSON.stringify({
      backgroundUrl: imageUrl,
      matchedSetting: bestMatch,
      confidence: scores[bestMatch] || 0,
      selectionMethod: selectionInfo,
      totalImages: Object.keys(settingKeywords).length,
      availableCategories: {
        'School & Education': 18,
        'Home & Family': 15, 
        'Entertainment & Fun': 27,
        'Travel & Transportation': 15,
        'Community & Services': 21,
        'Special Experiences': 3
      },
      debug: {
        selectedLocation: baseLocation,
        topScores: allScores,
        firstMentionBonus: firstMentionBonus,
        totalLocationsMatched: Object.keys(scores).length
      }
    }), {
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
      },
    });

  } catch (error) {
    console.error('Background matching error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      backgroundUrl: 'img/hallway1.png' // Local fallback
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info',
      },
    });
  }
});