-- Event Management & Catering Booking Schema (eventmgmt)

create schema if not exists eventmgmt;

-- 1. Catering Services Table
create table if not exists eventmgmt.catering (
  id          uuid not null default gen_random_uuid(),
  branch_id   uuid not null,
  name        character varying(100) not null,
  contact     character varying(100) null,
  address     text null,
  notes       text null,
  created_at  timestamp without time zone null default now(),
  constraint catering_pkey primary key (id),
  constraint catering_branch_id_fkey foreign key (branch_id) references branches (id) on delete cascade
) tablespace pg_default;

-- 2. Banquet Halls Table
create table if not exists eventmgmt.hall (
  id                          uuid primary key default gen_random_uuid(),
  branch_id                   uuid,
  name                        text not null,
  min_pax_for_free            integer,
  capacity                    integer,
  valet_parking               boolean default false,
  flat_charge                 numeric,
  includes_labor              boolean default false,
  available_for_meeting       boolean default false,
  block_reason                text,
  is_blocked                  boolean default false,
  min_catering_value_for_free numeric,
  floor                       text,
  is_ac                       boolean default true,
  features                    text,
  full_day_price              numeric,
  image_url                   text,
  video_url                   text,
  min_pax                     integer,
  max_pax                     integer,
  created_at                  timestamp without time zone default now()
) tablespace pg_default;

-- 3. Catering Menus Table
create table if not exists eventmgmt.menu (
  id            uuid not null default gen_random_uuid(),
  name          character varying(100) not null,
  type          character varying(20) null,
  price_per_pax numeric(10, 2) null,
  created_at    timestamp without time zone null default now(),
  dietary_type  character varying(30) null,
  description   text null,
  is_active     boolean null default true,
  menu_type     character varying(20) null,
  constraint menu_pkey primary key (id),
  constraint menu_menu_type_check check (
    menu_type::text = any (array['Indoor'::character varying, 'Outdoor'::character varying]::text[])
  ),
  constraint menu_type_business_check check (
    type::text = any (array['MENU'::character varying, 'CUSTOM'::character varying]::text[])
  )
) tablespace pg_default;

-- 4. Event Occasions Table
create table if not exists eventmgmt.occasion (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamp without time zone default now()
) tablespace pg_default;

-- 5. Bookings Table (Indoor, Outdoor & Meeting Services)
create table if not exists eventmgmt.booking (
  id                    uuid not null default gen_random_uuid(),
  branch_id             uuid not null,
  hall_id               uuid null,
  catering_id           uuid null,
  event_date            date not null,
  pax                   integer null,
  status                character varying(20) null,
  created_by            uuid null,
  created_at            timestamp without time zone null default now(),
  occasion_id           uuid null,
  service_type          character varying(20) not null,
  slot                  character varying(10) not null default 'SLOT1'::character varying,
  menu_id               uuid null,
  menu_selection        jsonb null,
  event_start_at        timestamp without time zone null,
  event_end_at          timestamp without time zone null,
  derived_duration_code character varying(20) null,
  booking_code          character varying(50) null,
  total_amount          numeric(12, 2) null,
  amount_paid           numeric(12, 2) not null default 0,
  payment_status        character varying(20) not null default 'unpaid'::character varying,
  balance_amount        numeric generated always as (coalesce(total_amount, (0)::numeric) - amount_paid) stored (12, 2) null,
  customer_access_code  character(6) null,
  catering_contacts     jsonb null default '{}'::jsonb,
  discount_notes        text null,
  updated_at            timestamp with time zone null default now(),
  extra_pax             integer not null default 0,
  extra_pax_rate        numeric(10, 2) null default null::numeric,
  extra_pax_amount      numeric(12, 2) not null default 0,
  plate_price           numeric(10, 2) null,
  constraint booking_pkey primary key (id),
  constraint booking_catering_id_fkey foreign key (catering_id) references eventmgmt.catering (id),
  constraint booking_hall_id_fkey foreign key (hall_id) references eventmgmt.hall (id),
  constraint booking_menu_id_fkey foreign key (menu_id) references eventmgmt.menu (id),
  constraint booking_occasion_id_fkey foreign key (occasion_id) references eventmgmt.occasion (id),
  constraint booking_branch_id_fkey foreign key (branch_id) references branches (id) on delete cascade,
  constraint booking_payment_status_check check (
    payment_status::text = any (array['unpaid'::character varying, 'partially_paid'::character varying, 'fully_paid'::character varying, 'overpaid'::character varying, 'refunded'::character varying]::text[])
  ),
  constraint booking_event_time_check check (
    event_start_at is null or event_end_at is null or event_end_at > event_start_at
  ),
  constraint booking_service_type_check check (
    service_type::text = any (array['inhouse'::character varying, 'outdoor'::character varying, 'inhouse-meeting'::character varying]::text[])
  )
) tablespace pg_default;

create unique index if not exists booking_hall_date_slot_unique on eventmgmt.booking using btree (hall_id, event_date, slot) tablespace pg_default;
create index if not exists idx_booking_event_start_at on eventmgmt.booking using btree (event_start_at) tablespace pg_default;
