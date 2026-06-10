// Mirrors the Supabase schema (sync/schema.sql). Only the fields the
// front-end reads are typed here; add more as needed.

export interface Listing {
  listing_key: string;
  listing_id: string | null;
  standard_status: string | null;
  property_type: string | null;
  property_sub_type: string | null;

  list_price: number | null;
  original_list_price: number | null;
  price_per_sqft: number | null;

  unparsed_address: string | null;
  street_number: string | null;
  street_name: string | null;
  street_suffix: string | null;
  unit_number: string | null;
  city: string | null;
  state_or_province: string | null;
  postal_code: string | null;
  county_or_parish: string | null;
  latitude: number | null;
  longitude: number | null;

  bedrooms_total: number | null;
  bathrooms_total: number | null;
  bathrooms_full: number | null;
  bathrooms_half: number | null;
  living_area: number | null;
  lot_size_acres: number | null;
  lot_size_sqft: number | null;
  year_built: number | null;
  stories_total: number | null;
  garage_spaces: number | null;

  public_remarks: string | null;
  interior_features: string | null;
  exterior_features: string | null;
  appliances: string | null;
  pool_features: string | null;
  parking_features: string | null;
  patio_features: string | null;
  lot_features: string | null;
  heating: string | null;
  cooling: string | null;
  flooring: string | null;
  roof: string | null;
  water_source: string | null;
  sewer: string | null;
  utilities: string | null;
  view_field: string | null;
  architectural_style: string | null;
  subdivision_name: string | null;

  has_pool: boolean;
  has_spa: boolean;
  has_fireplace: boolean;
  has_garage: boolean;
  is_waterfront: boolean;
  is_new_construction: boolean;
  is_updated_remodeled: boolean;
  is_single_story: boolean;
  has_acre_plus: boolean;
  has_large_yard: boolean;

  elementary_school: string | null;
  middle_school: string | null;
  high_school: string | null;
  high_school_district: string | null;

  photos_count: number | null;
  virtual_tour_url: string | null;
  tax_annual_amount: number | null;
  tax_year: number | null;

  list_office_name: string | null;
  list_office_mls_id: string | null;
  list_agent_full_name: string | null;
  list_agent_mls_id: string | null;
  list_aor: string | null;

  internet_display_yn: boolean;
  internet_address_yn: boolean;
  internet_avm_yn: boolean;
  internet_comment_yn: boolean;

  days_on_market: number | null;
  modification_timestamp: string | null;
  is_lhg_listing: boolean;
}

export interface ListingMedia {
  media_key: string;
  listing_key: string;
  media_url: string;
  media_category: string | null;
  order: number | null;
  short_desc: string | null;
}
