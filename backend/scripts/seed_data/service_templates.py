"""Rich Service Templates across all 10 Official Marketplace Categories for Namma Connect."""

IMAGE_POOLS = {
    "farm": [
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
        "https://images.unsplash.com/photo-1587061949409-02df41d5e562",
        "https://images.unsplash.com/photo-1592417817098-8f3d6eb2250d",
        "https://images.unsplash.com/photo-1625246333195-78d9c38ad449",
        "https://images.unsplash.com/photo-1500937386664-56d1dfef3854",
    ],
    "adventure": [
        "https://images.unsplash.com/photo-1551632811-561732d1e306",
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
        "https://images.unsplash.com/photo-1501555088652-021faa106b9b",
        "https://images.unsplash.com/photo-1533240332313-0db49b459ad6",
    ],
    "water-sports": [
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
        "https://images.unsplash.com/photo-1519046904884-53103b34b206",
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    ],
    "wildlife": [
        "https://images.unsplash.com/photo-1534567153574-2b12153a87f0",
        "https://images.unsplash.com/photo-1564349683136-77e08dba1ef6",
        "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6",
        "https://images.unsplash.com/photo-1575550959106-5a7defe28b56",
    ],
    "food": [
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d",
        "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb",
        "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91",
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
    ],
    "cultural-historical": [
        "https://images.unsplash.com/photo-1609137144813-7d9921338f24",
        "https://images.unsplash.com/photo-1582510003544-4d00b7f74220",
        "https://images.unsplash.com/photo-1600100397608-f010f443a758",
        "https://images.unsplash.com/photo-1548013146-72479768bada",
    ],
    "photography": [
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32",
        "https://images.unsplash.com/photo-1452587925148-ce544e77e70d",
        "https://images.unsplash.com/photo-1502920917128-1aa500764cbd",
    ],
    "videography": [
        "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119",
        "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4",
        "https://images.unsplash.com/photo-1518173946687-a4c8a383392e",
    ],
    "drone-aerial": [
        "https://images.unsplash.com/photo-1508614589041-895b88991e3e",
        "https://images.unsplash.com/photo-1473968512647-3e447244af8f",
        "https://images.unsplash.com/photo-1527977966376-1c8408f9f108",
    ],
    "travel-reels": [
        "https://images.unsplash.com/photo-1611162617474-5b21e879e113",
        "https://images.unsplash.com/photo-1512436991641-6745cdb1723f",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
    ],
}

CROPS = ["Arabica Coffee", "Robusta Coffee", "Green Cardamom", "Black Pepper", "Arecanut", "Vanilla", "Ginger", "Organic Turmeric", "Clove", "Honey Bee Apiculture", "Coconut & Betel"]
LANDSCAPES = ["Western Ghats Mist Valley", "Brahmagiri Ridge", "Coffee Estate Canopy", "Shola Grasslands", "Sacred Groves", "Riverbank Forest", "Malnad Rain Forest"]
CUISINES = ["Kodava Pandi Curry & Akki Oti", "Malnad Kadubu & Bamboo Shoot", "Udupi Sattvic Banana Leaf Feast", "Mangalorean Ghee Roast & Neer Dosa", "North Karnataka Jolada Rotti & Ennegai", "Kaveri River Fresh Catch Fish Curry"]
CRAFTS = ["Channapatna Wooden Toys", "Bidri Metal Inlay Work", "Mysore Silk Weaving", "Terracotta Pottery Wheel", "Traditional Cane & Bamboo Weaving"]
WILDLIFE_TARGETS = ["Great Indian Hornbill & Malabar Pied Hornbill", "Western Ghats Endemic Frogs & Flying Lizards", "Wild Elephant Herd Tracking", "Butterflies of Malnad Forest", "Sloth Bear & Leopard Safari"]

CATEGORY_CONFIGS = {
    "farm": {
        "name": "Farm Tours & Experiences",
        "type": "ACTIVITY",
        "units": ["person", "couple", "group"],
        "price_range": (450, 1500),
        "duration_range": (2.0, 5.0),
        "capacity_range": (6, 25),
        "templates": [
            {
                "title_fmt": "Organic {crop} Harvesting & Estate Walk in {location}",
                "desc_fmt": "Immerse yourself in lush zero-chemical {crop} orchards in {location}, {district}. Walk with hereditary growers, hand-harvest seasonal crops, and savor freshly prepared artisanal farm beverages under the shade canopy.",
                "inclusions": ["Guided plantation exploration", "Fresh harvest tasting", "Estate herbal tea/filter coffee", "Farm gate sample pack"],
                "amenities": ["Organic Farm Shop", "Clean Restrooms", "Secure Parking", "Shaded Gazebo", "Drinking Water"],
            },
            {
                "title_fmt": "Hands-On {crop} Processing & Agro-Workshop at {location}",
                "desc_fmt": "Learn traditional and modern sustainable processing techniques for {crop} directly from master planters in {location}, {district}. Perfect for agriculture enthusiasts, families, and eco-travelers.",
                "inclusions": ["Interactive workshop session", "Safety gear & harvest tools", "Traditional planter lunch", "Certificate of participation"],
                "amenities": ["Processing Demonstration Shed", "Restrooms", "Water Dispensers", "Farm Cafe"],
            },
            {
                "title_fmt": "Apiculture & Forest Honey Harvesting Experience in {location}",
                "desc_fmt": "Suit up with safety mesh gear and inspect thriving Italian and indigenous bee boxes tucked inside {crop} plantations in {location}, {district}. Extract raw, unpasteurized forest honey directly from the comb.",
                "inclusions": ["Bee suit protective gear", "Honey extraction demo", "Raw honey tasting session", "100g sample honey jar"],
                "amenities": ["First Aid Station", "Clean Restrooms", "Washing Facility", "Parking"],
            },
        ],
    },
    "adventure": {
        "name": "Adventure & Trekking",
        "type": "ACTIVITY",
        "units": ["person", "group"],
        "price_range": (800, 3200),
        "duration_range": (3.5, 9.0),
        "capacity_range": (6, 20),
        "templates": [
            {
                "title_fmt": "Sunrise Ridge Peak Trek & Cloud Walk near {location}",
                "desc_fmt": "Scale majestic peaks overlooking the {landscape} starting before dawn in {location}, {district}. Watch the golden sunrise break through dense sea of clouds with certified Western Ghats mountaineering leads.",
                "inclusions": ["Certified mountaineering guide", "Packed trail breakfast & energy fruits", "First aid & safety escort", "Forest entry permits"],
                "amenities": ["Basecamp Resting Area", "Walking Sticks", "Emergency First Aid Kit", "Parking"],
            },
            {
                "title_fmt": "Hidden Waterfalls Jungle Trail & Canyon Walk in {location}",
                "desc_fmt": "Hike through pristine evergreen forest streams to reach secret cascading natural plunge pools in {location}, {district}. Experience natural hydro-massages and scenic rocky terrain.",
                "inclusions": ["Local naturalist trek lead", "Stream wading footwear tips", "Refreshment kit", "Life jackets for deep pools"],
                "amenities": ["Changing Tents", "Luggage Storage at Base", "First Aid"],
            },
            {
                "title_fmt": "Off-Road 4x4 Jeep Safari through {landscape} in {location}",
                "desc_fmt": "Buckle up for a rugged 4WD expedition navigating boulders, muddy plantation inclines, and panoramic viewpoint passes across {location}, {district}.",
                "inclusions": ["4x4 expedition vehicle with driver", "Viewpoint halt tickets", "Chilled refreshments", "Photography stops"],
                "amenities": ["Covered Cabin", "Safety Harnesses", "Base Lounge"],
            },
        ],
    },
    "water-sports": {
        "name": "Water Sports & Activities",
        "type": "ACTIVITY",
        "units": ["person", "group", "session"],
        "price_range": (600, 2800),
        "duration_range": (1.5, 4.0),
        "capacity_range": (4, 16),
        "templates": [
            {
                "title_fmt": "Kali River White Water Rafting & Rapids in {location}",
                "desc_fmt": "Conquer exhilarating Grade II & Grade III river rapids surrounded by dense jungle riverbanks in {location}, {district}. Complete safety brief and international standard buoyancy vests provided.",
                "inclusions": ["Grade certified river guide", "CE-certified helmet & life vest", "Paddling technique briefing", "High-res action photos"],
                "amenities": ["Locker Rooms", "Showers & Changing Area", "First Aid Station", "Canteen"],
            },
            {
                "title_fmt": "Backwater Mangrove Kayaking & Paddle Tour at {location}",
                "desc_fmt": "Glide silently through tranquil coastal estuaries, listening to kingfishers and exploring lush mangrove corridors in {location}, {district}.",
                "inclusions": ["Single/tandem sea kayak rental", "Lightweight carbon paddle", "Safety flotation jacket", "Nature guide escort"],
                "amenities": ["Docking Slip", "Dry Bags for Phones", "Fresh Water Rinsing Area"],
            },
            {
                "title_fmt": "Traditional Round Coracle Boat River Ride in {location}",
                "desc_fmt": "Experience Karnataka's ancient circular coracle navigation along gentle river bends and ancient rocky gorges in {location}, {district}.",
                "inclusions": ["30-min scenic boat spin", "Life jacket per passenger", "Local boatman folklore tales"],
                "amenities": ["Boarding Jetty", "Lifebuoys", "Waiting Shed"],
            },
        ],
    },
    "wildlife": {
        "name": "Wildlife Tours",
        "type": "ACTIVITY",
        "units": ["person", "group"],
        "price_range": (900, 3500),
        "duration_range": (3.0, 6.0),
        "capacity_range": (6, 15),
        "templates": [
            {
                "title_fmt": "Birdwatching Trail & Endemic Species Walk in {location}",
                "desc_fmt": "Search for {target} in pristine biodiversity hotspots around {location}, {district}. Led by senior ornithologists with spotting scopes and field guidebooks.",
                "inclusions": ["Expert birding naturalist", "High-power spotting scope access", "Checklist booklet", "Morning tea & snack"],
                "amenities": ["Binocular Rental", "Library of Flora/Fauna Books", "Base Parking"],
            },
            {
                "title_fmt": "Nocturnal Rainforest Herping & Frog Trail in {location}",
                "desc_fmt": "Step into the night rainforest with headlamps to discover bioluminescent fungi, endemic bush frogs, and arboreal reptiles around {location}, {district}.",
                "inclusions": ["Headlamp loaner", "Leech socks", "Certified field biologist guide", "Field safety escort"],
                "amenities": ["Field Station Restrooms", "Rehydration Station", "First Aid"],
            },
            {
                "title_fmt": "Guided Forest Safari & Sanctuary Nature Watch at {location}",
                "desc_fmt": "Journey through deciduous and semi-evergreen forest corridors tracking wildlife signs, pugmarks, and spotted deer herds in {location}, {district}.",
                "inclusions": ["Safari vehicle pass", "Forest department permit", "Naturalist guide narration"],
                "amenities": ["Sanctuary Reception Lounge", "Restrooms", "Canteen"],
            },
        ],
    },
    "food": {
        "name": "Food Tours & Cooking",
        "type": "ACTIVITY",
        "units": ["person", "couple"],
        "price_range": (500, 1800),
        "duration_range": (2.0, 4.5),
        "capacity_range": (4, 18),
        "templates": [
            {
                "title_fmt": "Authentic Village {cuisine} Cooking Masterclass in {location}",
                "desc_fmt": "Step into a rustic tile-roof kitchen in {location}, {district} and cook authentic regional dishes over firewood earthenware stoves with local family chefs.",
                "inclusions": ["All fresh spices & farm produce", "Hands-on guided cooking", "Full traditional sit-down feast", "Recipe booklet"],
                "amenities": ["Traditional Kitchen Workstations", "Dining Hall", "Wash basins", "Filtered Water"],
            },
            {
                "title_fmt": "Plantation-to-Plate Traditional Banana Leaf Lunch Trail in {location}",
                "desc_fmt": "Harvest vegetables from the backyard and sit down for an opulent multi-course traditional meal served on fresh plantain leaves in {location}, {district}.",
                "inclusions": ["12+ traditional delicacies", "Fresh payasam/dessert", "Herbal digestive drink", "Farm tour stroll"],
                "amenities": ["Spacious Dining Veranda", "Restrooms", "Ample Parking"],
            },
            {
                "title_fmt": "Regional Spice & Filter Coffee Brewing Workshop in {location}",
                "desc_fmt": "Master the art of roasting, blending chicory ratios, and slow decoction brewing for authentic South Indian filter coffee in {location}, {district}.",
                "inclusions": ["Coffee tasting flight (3 blends)", "Brass filter brewing kit demo", "Fresh hot snacks", "Freshly ground 250g coffee pack"],
                "amenities": ["Tasting Bar", "Air-cooled Workshop Room", "Wi-Fi"],
            },
        ],
    },
    "cultural-historical": {
        "name": "Cultural & Historical Tours",
        "type": "ACTIVITY",
        "units": ["person", "group"],
        "price_range": (400, 2200),
        "duration_range": (2.5, 6.0),
        "capacity_range": (6, 25),
        "templates": [
            {
                "title_fmt": "Hoysala & Vijayanagara Ancient Architecture Walk at {location}",
                "desc_fmt": "Unravel stone carvings, intricate temple friezes, and engineering marvels dating back centuries in {location}, {district} with government-approved heritage scholars.",
                "inclusions": ["Licensed heritage historian lead", "Monument access guidance", "Illustrated architecture booklet", "Bottled water"],
                "amenities": ["Audio Assist Headphones", "Umbrellas for Sun Protection", "Parking"],
            },
            {
                "title_fmt": "Traditional {craft} Artisan Workshop & Pottery in {location}",
                "desc_fmt": "Sit alongside multi-generational master craftsmen in {location}, {district}. Shape raw clay on the potter's wheel or carve seasoned wood into artistic keepsakes.",
                "inclusions": ["All crafting raw materials", "Hands-on instructor time", "Take-home personal handcrafted item", "Artisan honorarium"],
                "amenities": ["Artisan Studio Shed", "Handwash Sinks", "Gift Counter"],
            },
            {
                "title_fmt": "Yakshagana & Folk Folklore Theatre Immersion in {location}",
                "desc_fmt": "Witness the vibrant headgear, face painting, and powerful dance-drama traditions of Coastal Karnataka backstage and onstage in {location}, {district}.",
                "inclusions": ["Costume & makeup observation session", "Folk drama storytelling narration", "Traditional snacks"],
                "amenities": ["Traditional Performance Courtyard", "Restrooms", "Seating Mats"],
            },
        ],
    },
    "photography": {
        "name": "Photography",
        "type": "CONTENT_CREATOR",
        "units": ["session", "hour", "day"],
        "price_range": (1500, 7500),
        "duration_range": (2.0, 8.0),
        "capacity_range": (2, 8),
        "templates": [
            {
                "title_fmt": "High-Res Farm & Plantation Portrait Shoot at {location}",
                "desc_fmt": "Professional candid and editorial photography for couples, families, and solo travelers set against lush tea, spice, and coffee greenery in {location}, {district}.",
                "inclusions": ["25 professionally color-graded photos", "Online private gallery link", "High-res raw files download", "Outfit change guidance"],
                "amenities": ["Mobile Changing Tent", "Reflector & Lighting Gear", "Fast turnaround"],
            },
            {
                "title_fmt": "Landscape & Golden Hour Wildlife Photo Expedition in {location}",
                "desc_fmt": "Learn landscape composition, ND filter exposure, and Western Ghats mist photography with an award-winning travel photographer in {location}, {district}.",
                "inclusions": ["1-on-1 composition coaching", "Tripod & filter sharing", "Post-processing Lightroom workflow guide"],
                "amenities": ["Lounge for Editing Review", "Battery Charging Hub"],
            },
        ],
    },
    "videography": {
        "name": "Videography",
        "type": "CONTENT_CREATOR",
        "units": ["session", "project", "day"],
        "price_range": (2500, 8500),
        "duration_range": (3.0, 8.0),
        "capacity_range": (2, 6),
        "templates": [
            {
                "title_fmt": "Cinematic Agro-Estate Travel Film Production in {location}",
                "desc_fmt": "Full 4K documentary-style promotional video shoot capturing farm stays, rural hosts, local harvests, and guest experiences in {location}, {district}.",
                "inclusions": ["4K 60fps cinematic footage", "Gimbal stabilized camera work", "Professional sound recording & music licensing", "2 rounds of revisions"],
                "amenities": ["Pro Sony/Canon Cine Rigs", "Wireless Lav Mics", "Cloud Delivery"],
            },
            {
                "title_fmt": "Homestay & Experience Brand Promo Video in {location}",
                "desc_fmt": "Targeted 60-90 second promotional showcase highlighting heritage architecture, farm-to-table cuisine, and host hospitality in {location}, {district}.",
                "inclusions": ["Storyboarding & scripting", "Full day shoot", "Licensed background soundtrack", "Vertical & horizontal exports"],
                "amenities": ["Fast Delivery in 5 Days", "Color Graded Master"],
            },
        ],
    },
    "drone-aerial": {
        "name": "Drone & Aerial",
        "type": "CONTENT_CREATOR",
        "units": ["session", "acre", "tour"],
        "price_range": (3000, 8000),
        "duration_range": (2.0, 5.0),
        "capacity_range": (1, 5),
        "templates": [
            {
                "title_fmt": "4K Aerial Drone Estate Mapping & Scenic Showcase in {location}",
                "desc_fmt": "Licensed DGCA-compliant aerial cinematography mapping property boundaries, hill contours, and canopy views across {location}, {district}.",
                "inclusions": ["4K 60fps drone footage", "High-res aerial orthomosaic stills", "Color grading in D-Log", "Digital delivery in 48 hours"],
                "amenities": ["DGCA Certified Pilot", "Dual Battery Redundancy", "ND Filter Kit"],
            },
            {
                "title_fmt": "Spectacular Western Ghats Drone Photography Shoot at {location}",
                "desc_fmt": "Breathtaking bird's-eye perspective captures of waterfalls, mist-covered valleys, and winding plantation roads around {location}, {district}.",
                "inclusions": ["15 edited aerial master photos", "3 short 15-second cinematic flyovers", "Full copyright clearance for marketing"],
                "amenities": ["Portable Power Station", "Weather Sensor Checks"],
            },
        ],
    },
    "travel-reels": {
        "name": "Travel Reels",
        "type": "CONTENT_CREATOR",
        "units": ["reel", "package", "session"],
        "price_range": (1200, 5000),
        "duration_range": (2.0, 6.0),
        "capacity_range": (2, 6),
        "templates": [
            {
                "title_fmt": "Trending Viral Instagram Travel Reel Package in {location}",
                "desc_fmt": "Craft 3 engaging, fast-paced vertical video reels (9:16) capturing farm aesthetics, local cuisine, and secret travel spots in {location}, {district}.",
                "inclusions": ["3 edited reels with trending audio", "Subtitles & catchy hook captions", "Color correction", "Delivered within 72 hours"],
                "amenities": ["iPhone Pro / Gimbal Kit", "Dynamic Lighting", "Fast Turnaround"],
            },
            {
                "title_fmt": "Creator Collaboration & Storytelling Reels in {location}",
                "desc_fmt": "Work with local travel content creators to tell authentic stories about agro-hosts, rural heritage, and off-beat treks in {location}, {district}.",
                "inclusions": ["Scripting & voiceover support", "2 polished micro-documentary reels", "Tagging & collab post assistance"],
                "amenities": ["Wireless Microphones", "Multi-angle Shoots"],
            },
        ],
    },
}
