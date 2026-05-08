const PEXELS_API_KEY = "4hN6tBKIoOHxiWFH8m6OBWA2N6N3dFLIzsgzaE7FPyArJwaXirZDkzUx";

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

export interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

export async function searchPhotos(query: string, page = 1, perPage = 24): Promise<PexelsSearchResponse> {
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
    {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch photos from Pexels");
  }

  return response.json();
}

export async function getCuratedPhotos(page = 1, perPage = 24): Promise<PexelsSearchResponse> {
  const response = await fetch(
    `https://api.pexels.com/v1/curated?page=${page}&per_page=${perPage}`,
    {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch curated photos from Pexels");
  }

  return response.json();
}
