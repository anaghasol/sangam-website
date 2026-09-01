-- Sangam's PetPooja sales history, for the recommendation engine.
--
-- Two grains on purpose. The last 12 months are kept as individual item lines,
-- because that is what answers "what sells with what", "what does this phone
-- number always order" and "what moves on a Tuesday evening in Mansoorabad".
-- The year before that is kept as daily aggregates: trend and seasonality
-- survive, individual bills do not, and it costs roughly a twentieth of the
-- rows. August 2026 alone was 77,561 item lines across four outlets, so a flat
-- two years of detail would be ~1.9M rows to carry a question nobody asks about
-- a single bill from 20 months ago.

create table if not exists sangam_order_items (
  id             bigserial primary key,
  outlet         text        not null,
  invoice_no     text        not null,
  ordered_at     timestamptz not null,
  order_type     text,                 -- Dine In / Pick Up / Delivery(Parcel)
  payment_type   text,
  status         text,
  area           text,                 -- raw; carries "Zomato_<outlet>" etc.
  channel        text,                 -- derived from area: zomato/swiggy/direct
  customer_phone text,
  customer_name  text,
  persons        numeric,
  item_name      text        not null,
  category_name  text,
  item_price     numeric,
  item_quantity  numeric,
  item_total     numeric,
  bill_total     numeric,
  discount       numeric,
  -- One bill can legitimately list the same dish twice (different rate or a
  -- re-fire), so the item PRICE is part of the key; without it the second line
  -- would be silently dropped on re-import.
  unique (outlet, invoice_no, item_name, item_price, item_quantity)
);

create index if not exists sangam_items_ordered_at  on sangam_order_items (ordered_at desc);
create index if not exists sangam_items_item        on sangam_order_items (item_name);
create index if not exists sangam_items_outlet_date on sangam_order_items (outlet, ordered_at desc);
create index if not exists sangam_items_phone       on sangam_order_items (customer_phone) where customer_phone is not null;
create index if not exists sangam_items_type        on sangam_order_items (order_type, channel);

create table if not exists sangam_daily_item_sales (
  id            bigserial primary key,
  outlet        text not null,
  sale_date     date not null,
  order_type    text,
  channel       text,
  item_name     text not null,
  category_name text,
  qty           numeric,
  revenue       numeric,
  order_count   integer,
  unique (outlet, sale_date, order_type, channel, item_name)
);

create index if not exists sangam_daily_date on sangam_daily_item_sales (sale_date desc);
create index if not exists sangam_daily_item on sangam_daily_item_sales (item_name);

comment on table sangam_order_items is
  'PetPooja item-level sales, last ~12 months. Source: Order Summary Item report CSV.';
comment on table sangam_daily_item_sales is
  'PetPooja sales rolled up per outlet/day/item for history older than the detail window.';
