export type AttributeOption = {
  id: string;
  label: string;
  slug: string;
  display_order: number;
};

export type AttributeGroup = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  options: AttributeOption[];
};

export type ProductSupplyLink = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number | null;
  sort_order: number;
};

export type ProductRow = {
  id: string;
  name: string;
  image_url?: string | null;
  unit_price: number;
  stock?: number;
  min_stock?: number;
  track_stock?: boolean;
  use_supplies?: boolean;
  product_supplies?: ProductSupplyLink[];
  created_at: string;
  product_attribute_options: {
    option_id: string;
    attribute_options: {
      id: string;
      label: string;
      attribute_groups: { id: string; name: string; slug: string };
    };
  }[];
};
