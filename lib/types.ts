export type Option = { id: string; name: string; price_delta: number; sort_order: number; flavors?: number };
export type Group = {
  id: string; name: string; min_select: number; max_select: number; sort_order: number; options: Option[];
};
export type Product = {
  id: string; category_id: string | null; name: string; description: string | null;
  base_price: number; photo_url: string | null; sort_order: number; groups: Group[]; allow_half?: boolean;
};
export type Category = { id: string; name: string; sort_order: number };
export type Zone = { id: string; name: string; fee: number; min_order: number; eta_min: number | null; max_km?: number | null };
export type Business = {
  id: string; slug: string; name: string; description: string | null; logo_url: string | null;
  banner_url: string | null; whatsapp_contact: string | null; address_text: string | null;
  accepts_delivery: boolean; accepts_pickup: boolean; min_order: number; prep_time_min: number;
  delivery_mode?: 'zones' | 'km'; accepts_pix?: boolean; accepts_scheduling?: boolean; schedule_min_minutes?: number; schedule_max_days?: number;
};
export type Hours = { weekday: number; opens: string; closes: string };
export type CartLine = {
  key: string; product_id: string; name: string; unit_price: number; quantity: number;
  option_ids: string[]; option_labels: string[]; notes: string; half_product_id?: string | null; half_product_ids?: string[];
};
export type PublicCoupon = { code: string; kind: 'percent' | 'fixed' | 'free_delivery'; value: number; min_order: number; expires_at: string | null; uses_left: number | null };
