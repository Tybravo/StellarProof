// frontend/services/creatorService.ts

export interface Creator {
  id: string;
  name: string;
  bio: string;
  verifiedDocuments: number;
  successRate: number;
  avatarUrl?: string;
  isVerified: boolean;
}

export const getCreators = async (searchQuery: string = ''): Promise<Creator[]> => {
  const params = new URLSearchParams();
  if (searchQuery) {
    params.append('search', searchQuery);
  }

  const response = await fetch(`/api/creators?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch creators from the directory.');
  }

  const data = await response.json();
  return data.creators || [];
};