
import { Card, Difficulty } from "../types.ts";
import { DIFFICULTY_CONFIG } from "../lib/game/config.ts";
import { fetchWithTimeout } from "../lib/http.ts";

export const fetchAvailableImages = async (): Promise<string[]> => {
  try {
    const response = await fetchWithTimeout('/api/images', { cache: 'no-store' });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Image API returned HTTP ${response.status}${data?.reason ? ` (${data.reason})` : ''}`);
    }
    if (!Array.isArray(data?.images) || data.images.length === 0) throw new Error('No images returned');
    if (data.source === 'local') {
      console.warn(`Using local fallback images: ${data.reason ?? 'unknown reason'}`);
    }
    return data.images;
  } catch (error) {
    console.error('Error fetching game images:', error);
    return [];
  }
};

/**
 * 이미지를 브라우저 메모리에 완벽히 로드하고 디코딩합니다.
 */
export const preloadImages = (images: string[]): Promise<void[]> => {
  return Promise.all(
    images.map((src) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          if ('decode' in img) {
            img.decode().then(() => resolve()).catch(() => resolve());
          } else {
            resolve();
          }
        };
        img.onerror = () => {
          console.warn(`Failed to preload: ${src}`);
          resolve();
        };
      });
    })
  );
};

export const createBoard = (difficulty: Difficulty, imagePool: string[]): Card[] => {
  const pairCount = DIFFICULTY_CONFIG[difficulty].pairCount;

  const shuffledPool = shuffle([...imagePool]);
  const selectedImages = [];

  for (let i = 0; i < pairCount; i++) {
    selectedImages.push(shuffledPool[i % shuffledPool.length]);
  }

  const cards: Card[] = [];
  selectedImages.forEach((imgUrl, index) => {
    const cardData = {
      image: imgUrl,
      isFlipped: false,
      isMatched: false,
      pairId: index,
    };
    cards.push({ ...cardData, id: index * 2 });
    cards.push({ ...cardData, id: index * 2 + 1 });
  });

  return shuffle(cards);
};

const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};
