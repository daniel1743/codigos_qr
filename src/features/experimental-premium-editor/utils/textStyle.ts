import { CSSProperties } from 'react';
import { ImageCrop, ImageFocus, TextStyle } from '../types/editor';

export function styleToCss(style: TextStyle): CSSProperties {
  return {
    fontFamily: style.font,
    fontSize: `${style.size}px`,
    lineHeight: style.size > 22 ? 1.18 : 1.5,
    color: style.color,
    fontWeight: style.weight,
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    textAlign: style.align,
    textUnderlineOffset: '3px'
  };
}

export function clampSize(size: number): number {
  return Math.max(10, Math.min(48, size));
}

export const CROP_RATIO: Record<ImageCrop, string> = {
  '4/3': '4 / 3',
  '1/1': '1 / 1',
  '3/4': '3 / 4'
};

export const FOCUS_POSITION: Record<ImageFocus, string> = {
  center: '50% 50%',
  top: '50% 12%',
  bottom: '50% 88%'
};