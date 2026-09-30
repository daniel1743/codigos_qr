import { describe, expect, it } from 'vitest';
import { mapsSearchUrl, normalizePhone, readQuickProfileInfo } from '../components/profile/QuickProfileInfo';

describe('Quick Profile Info', () => {
  it('reads only non-empty structured values from PageDoc props', () => {
    expect(readQuickProfileInfo({ profileInfo: { description: '  Hola  ', phone: '', email: 'correo@test.cl' } })).toEqual({
      description: 'Hola',
      phone: undefined,
      email: 'correo@test.cl',
      address: undefined,
      profession: undefined,
    });
  });

  it('normalizes phone actions without changing the displayed value', () => {
    expect(normalizePhone('+56 9 1234 5678')).toBe('+56912345678');
    expect(normalizePhone('912345678')).toBe('912345678');
  });

  it('creates an encoded maps search URL without requiring coordinates', () => {
    expect(mapsSearchUrl('Providencia, Santiago')).toBe('https://www.google.com/maps/search/?api=1&query=Providencia%2C%20Santiago');
  });
});
