import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the tenant's Google Place ID from their contact settings
    // In a real implementation, you'd fetch this from the database
    // For now, we'll use a mock implementation
    
    // This would normally come from the tenant's contact settings
    const mockPlaceId = 'ChIJrTLr-GyuEmsRBfyf1GD_Ee0'; // Example Google Place ID
    
    // Mock Google Reviews data - in production, this would call Google Places API
    const mockReviews = [
      {
        authorName: 'Sarah Johnson',
        rating: 5,
        text: 'Absolutely fantastic experience! The food was delicious and the service was impeccable. Will definitely be coming back soon!',
        time: '2 weeks ago',
        profilePhotoUrl: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=6366f1&color=fff&size=48',
        reviewUrl: `https://search.google.com/local/reviews?place=${mockPlaceId}`
      },
      {
        authorName: 'Michael Chen',
        rating: 4,
        text: 'Great atmosphere and excellent coffee. The pastries are fresh and the staff is very friendly. Only minor issue was the wait time, but overall a wonderful place.',
        time: '1 month ago',
        profilePhotoUrl: 'https://ui-avatars.com/api/?name=Michael+Chen&background=10b981&color=fff&size=48',
        reviewUrl: `https://search.google.com/local/reviews?place=${mockPlaceId}`
      },
      {
        authorName: 'Emily Rodriguez',
        rating: 5,
        text: 'This is my favorite spot in the city! The atmosphere is cozy and the staff always makes me feel welcome. Highly recommend the lavender latte!',
        time: '3 weeks ago',
        profilePhotoUrl: 'https://ui-avatars.com/api/?name=Emily+Rodriguez&background=f59e0b&color=fff&size=48',
        reviewUrl: `https://search.google.com/local/reviews?place=${mockPlaceId}`
      },
      {
        authorName: 'David Kim',
        rating: 5,
        text: 'Exceptional service and quality. You can tell they really care about their customers and the products they serve. The attention to detail is impressive.',
        time: '1 month ago',
        profilePhotoUrl: 'https://ui-avatars.com/api/?name=David+Kim&background=ef4444&color=fff&size=48',
        reviewUrl: `https://search.google.com/local/reviews?place=${mockPlaceId}`
      },
      {
        authorName: 'Lisa Thompson',
        rating: 4,
        text: 'Lovely little cafe with a great selection of drinks and snacks. The interior is beautifully decorated and it\'s a perfect place to work or meet friends.',
        time: '2 months ago',
        profilePhotoUrl: 'https://ui-avatars.com/api/?name=Lisa+Thompson&background=8b5cf6&color=fff&size=48',
        reviewUrl: `https://search.google.com/local/reviews?place=${mockPlaceId}`
      },
      {
        authorName: 'James Wilson',
        rating: 5,
        text: 'Outstanding! Everything from the coffee to the food to the service exceeded my expectations. This place is a hidden gem!',
        time: '3 weeks ago',
        profilePhotoUrl: 'https://ui-avatars.com/api/?name=James+Wilson&background=06b6d4&color=fff&size=48',
        reviewUrl: `https://search.google.com/local/reviews?place=${mockPlaceId}`
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockReviews
    });

  } catch (error) {
    console.error('Error fetching Google reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Google reviews' },
      { status: 500 }
    );
  }
}
