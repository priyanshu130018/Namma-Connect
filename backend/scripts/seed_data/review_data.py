"""Authentic Review Comments and Rating Distributions for Karnataka Agritourism & Experiences."""

REVIEW_COMMENTS = [
    "Unforgettable plantation walk! The hosts were exceptionally warm and the home-cooked Malnad food was divine.",
    "Loved the morning plantation walk. Learning how cardamom and coffee are harvested was truly educational and peaceful.",
    "Peaceful atmosphere, spotless facilities, and spectacular views of the Western Ghats mist. Will visit again with family!",
    "Authentic village dining cooked over firewood. The flavors were extraordinary and genuinely traditional.",
    "Great naturalist guide who pointed out rare birds and taught us so much about indigenous trees and medicinal plants.",
    "A refreshing escape from Bengaluru traffic. Clean air, starry skies, and delicious filter coffee straight from the estate.",
    "The coracle ride was exhilarating yet serene. The boatman shared fascinating local folklore about the river.",
    "Outstanding hands-on pottery session! Making our own terracotta pots with the master artisan was a highlight of our trip.",
    "The trekking trail was well organized. Safety gear was in top condition and the peak sunrise view was worth every step.",
    "The coffee roasting workshop changed how I brew my morning cup. So much passion and deep agricultural knowledge.",
    "Exceptional hospitality! The host family treated us like personal guests and the herbal bath was so rejuvenating.",
    "Our kids loved feeding the farm animals and picking organic vegetables for our lunch. True rural connection.",
    "The drone footage delivered for our estate property was breathtaking. Incredible 4K resolution and fast turnaround.",
    "Spectacular photos! The photographer knew exactly where the golden hour light hit the coffee plants.",
    "The river rafting rapids were thrilling and the safety team was thoroughly professional throughout.",
    "Delicious Neer Dosa and fresh river fish curry. We could not get enough of the local coastal flavours.",
    "Loved the quiet solitude. Sitting on the veranda watching the rain pour over the arecanut groves was bliss.",
    "Very knowledgeable guide at the heritage monuments. Learned historical nuances that are never written in guidebooks.",
    "The honey extraction experience was unforgettable. Tasting raw comb honey right in the forest was surreal.",
    "Well organized, clean amenities, and respectful guides. Proud to see such authentic Karnataka rural tourism.",
    "The night frog walk in Agumbe was otherworldly. Spotting glowing mushrooms and endemic frogs was magical.",
    "Professional travel reels delivered right on time. Our Instagram engagement exploded after posting the video!",
    "Waking up to bird calls and freshly brewed estate Arabica coffee is an experience everyone must have once in life.",
    "The off-road jeep drive up the mountain was pure adrenaline. Highly recommended for adventure seekers.",
    "Genuine farm-to-table dining where every single ingredient came from within a 100-meter radius of the kitchen table.",
]

def generate_rating(idx: int) -> float:
    """Generate realistic ratings: 70% 4.8-5.0, 25% 4.4-4.7, 5% 4.0-4.3."""
    modulo = idx % 20
    if modulo < 14:
        return round(4.8 + (idx % 3) * 0.1, 1)  # 4.8, 4.9, 5.0
    elif modulo < 19:
        return round(4.4 + (idx % 4) * 0.1, 1)  # 4.4, 4.5, 4.6, 4.7
    else:
        return round(4.0 + (idx % 3) * 0.1, 1)  # 4.0, 4.1, 4.2
