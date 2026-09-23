export type LabelVisibility = 'visible' | 'hidden';

export interface LabelVisibilityInput {
  distance: number;
  minDistance: number;
  maxDistance: number;
  isInFront: boolean;
}

export interface LabelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getLabelVisibility(input: LabelVisibilityInput): LabelVisibility {
  if (!input.isInFront) {
    return 'hidden';
  }
  if (input.distance < input.minDistance || input.distance > input.maxDistance) {
    return 'hidden';
  }
  return 'visible';
}

export function rectanglesOverlap(a: LabelRect, b: LabelRect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}
