import type { BlockContent } from "../../types";

export type GalleryImage = NonNullable<BlockContent["images"]>[number];

export function appendGalleryImage(images: GalleryImage[], image: GalleryImage): GalleryImage[] {
  return [...images, image];
}

export function replaceGalleryImage(
  images: GalleryImage[],
  imageId: string,
  url: string,
): GalleryImage[] {
  return images.map((image) => (image.id === imageId ? { ...image, url } : image));
}

export function removeGalleryImage(images: GalleryImage[], imageId: string): GalleryImage[] {
  return images.filter((image) => image.id !== imageId);
}

export function moveGalleryImage(
  images: GalleryImage[],
  index: number,
  direction: -1 | 1,
): GalleryImage[] {
  const destination = index + direction;
  if (index < 0 || destination < 0 || index >= images.length || destination >= images.length) {
    return images;
  }
  const next = [...images];
  const [image] = next.splice(index, 1);
  next.splice(destination, 0, image!);
  return next;
}

export function getGalleryColumns(
  imageCount: number,
  configuredColumns: number,
  isMobile: boolean,
): number {
  if (imageCount <= 1) return 1;
  if (imageCount === 2 || imageCount === 4) return 2;
  return Math.min(imageCount, isMobile ? Math.min(configuredColumns, 2) : configuredColumns);
}

export function moveGalleryLightboxIndex(
  currentIndex: number,
  imageCount: number,
  direction: -1 | 1,
): number {
  if (imageCount <= 1) return 0;
  return (currentIndex + direction + imageCount) % imageCount;
}
