import raw from './offices.json';

export interface Office {
  id: string;
  hq?: boolean;
  region: 'tw' | 'jp' | 'vn' | 'us';
  country: string;
  city: string;
  lat: number;
  lng: number;
  name: string;
  street: string;
  postal: string;
  address: string;
  tel: string;
  fax?: string;
  email: string;
}

export const OFFICES = raw as Office[];

export const telHref = (n: string) => `tel:${n.replace(/[^+\d]/g, '')}`;

export const mapsHref = (o: Office) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`;
