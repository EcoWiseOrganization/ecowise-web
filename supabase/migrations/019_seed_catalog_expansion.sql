-- ============================================================================
-- Migration 019 — Catalog seed expansion
-- ----------------------------------------------------------------------------
-- Bulks up the reference catalog so a freshly-deployed environment doesn't
-- look empty when a user first opens the app:
--
--   • EmissionFactors        — more VN-flavoured factors (transport, energy,
--                              waste, water, diet)
--   • CalculationTemplates   — templates wired to the new factors
--   • Challenges             — additional global (org_id IS NULL) challenges
--   • Rewards                — varied tiers from 50 PTS to 1500 PTS
--   • Badges                 — more streak / milestone achievements
--   • EmissionBenchmarks     — VN-HCM, VN-HN + 2023 refresh + ASEAN row
--   • SubscriptionPlans      — annual variants of every B2B/B2C tier
--
-- All inserts use deterministic UUIDs in the existing `xx000000-...` scheme
-- so downstream migrations can FK them safely, and are idempotent via
-- ON CONFLICT so a re-run on a partially-applied DB is a no-op.
--
-- No user-tied tables are touched here: anything that needs a real
-- auth.users row (Organization.created_by, Events, *Challenges, *Badges,
-- Redemptions, GreenPointLogs, CarbonTargets) ships in a follow-up once a
-- demo-accounts strategy is decided.
-- ============================================================================


-- ───────────────────────────────────────────────────────────────────────────
-- 1) EmissionFactors — expand
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO "EmissionFactors"
  (id, category_id, name, unit, co2_value, ch4_value, n2o_value, co2e_total,
   source_reference, year_valid, is_active, notes)
VALUES
  -- Electricity — VN national grid refresh
  ('ef000000-0000-0000-0000-000000000020',
   'c1000000-0000-0000-0000-000000000001',
   'Vietnam National Grid 2023', 'kgCO2e/kWh',
   0.6592, 0, 0, 0.6592,
   'MONRE_VN', 2023, true,
   'MONRE Decision 2626/QĐ-BTNMT — operating margin (OM) of the VN national grid for 2023 reporting year.'),

  -- Personal Transport — extend
  ('ef000000-0000-0000-0000-000000000021',
   'c1000000-0000-0000-0000-000000000008',
   'Xe điện 2 bánh (sạc lưới VN)', 'kgCO2e/km',
   0.0220, 0, 0, 0.0220,
   'MONRE_VN', 2023, true,
   '~33 Wh/km × VN grid EF 2023 (0.6592 kgCO2e/kWh) ≈ 0.022. Includes upstream electricity emissions; tailpipe is zero.'),

  ('ef000000-0000-0000-0000-000000000022',
   'c1000000-0000-0000-0000-000000000008',
   'Ô tô điện (sạc lưới VN)', 'kgCO2e/km',
   0.1120, 0, 0, 0.1120,
   'MONRE_VN', 2023, true,
   '~170 Wh/km × VN grid EF 2023. Lower than petrol cars but still non-zero on the current grid mix.'),

  ('ef000000-0000-0000-0000-000000000023',
   'c1000000-0000-0000-0000-000000000002',
   'Xe khách đường dài (xăng/dầu)', 'kgCO2e/km',
   0.0270, 0, 0, 0.0270,
   'DEFRA', 2022, true,
   'Coach travel — per passenger-km, occupancy-weighted (DEFRA 2022 GHG conversion factors).'),

  ('ef000000-0000-0000-0000-000000000024',
   'c1000000-0000-0000-0000-000000000002',
   'Tàu hỏa nội địa', 'kgCO2e/km',
   0.0410, 0, 0, 0.0410,
   'DEFRA', 2022, true,
   'National rail — per passenger-km (DEFRA 2022).'),

  ('ef000000-0000-0000-0000-000000000025',
   'c1000000-0000-0000-0000-000000000002',
   'Bay nội địa hạng phổ thông', 'kgCO2e/km',
   0.2460, 0, 0, 0.2460,
   'DEFRA', 2022, true,
   'Domestic short-haul economy flight — per passenger-km, no radiative-forcing multiplier.'),

  ('ef000000-0000-0000-0000-000000000026',
   'c1000000-0000-0000-0000-000000000002',
   'Bay quốc tế hạng phổ thông', 'kgCO2e/km',
   0.1950, 0, 0, 0.1950,
   'DEFRA', 2022, true,
   'International long-haul economy — per passenger-km. Lower per-km than domestic because the cruise leg amortises take-off.'),

  -- Fuel Combustion (Scope 1, stationary + mobile combustion)
  ('ef000000-0000-0000-0000-000000000027',
   'c1000000-0000-0000-0000-000000000003',
   'Dầu DO (Diesel)', 'kgCO2e/litre',
   2.6800, 0.0001, 0.00001, 2.6810,
   'IPCC', 2022, true,
   'Diesel for stationary generators or boilers. IPCC 2006 default for liquid fuels.'),

  ('ef000000-0000-0000-0000-000000000028',
   'c1000000-0000-0000-0000-000000000003',
   'LPG (gas hoá lỏng)', 'kgCO2e/kg',
   2.9830, 0.00012, 0.00002, 2.9836,
   'IPCC', 2022, true,
   'Liquefied petroleum gas — household + restaurant cooking, water heating.'),

  ('ef000000-0000-0000-0000-000000000029',
   'c1000000-0000-0000-0000-000000000003',
   'Khí thiên nhiên (Natural Gas)', 'kgCO2e/m3',
   2.0200, 0.0001, 0.00001, 2.0211,
   'IPCC', 2022, true,
   'Pipeline natural gas — industrial boilers, district heat.'),

  -- Waste — extend
  ('ef000000-0000-0000-0000-000000000030',
   'c1000000-0000-0000-0000-000000000006',
   'Compost hữu cơ (xử lý)', 'kgCO2e/kg',
   0.0760, 0, 0, 0.0760,
   'IPCC', 2022, true,
   'Aerated composting of food + garden waste — far lower than landfill methane.'),

  ('ef000000-0000-0000-0000-000000000031',
   'c1000000-0000-0000-0000-000000000006',
   'Tái chế nhựa (PET/HDPE)', 'kgCO2e/kg',
   0.0210, 0, 0, 0.0210,
   'DEFRA', 2022, true,
   'Mechanical recycling of common bottle plastics — much lower than virgin production.'),

  ('ef000000-0000-0000-0000-000000000032',
   'c1000000-0000-0000-0000-000000000006',
   'Tái chế nhôm/sắt', 'kgCO2e/kg',
   0.0150, 0, 0, 0.0150,
   'DEFRA', 2022, true,
   'Mixed metals recycling — collection + processing only (avoided virgin emissions counted separately).'),

  -- Diet — extend (Poore & Nemecek 2018 via Our World in Data)
  ('ef000000-0000-0000-0000-000000000033',
   'c1000000-0000-0000-0000-000000000005',
   'Bữa ăn có gia cầm/cá', 'kgCO2e/bữa',
   3.5000, 0, 0, 3.5000,
   'IPCC', 2022, true,
   'Average meal centred on chicken/fish + sides. Indicative — Poore & Nemecek 2018 envelopes.'),

  ('ef000000-0000-0000-0000-000000000034',
   'c1000000-0000-0000-0000-000000000005',
   'Bữa ăn thuần chay', 'kgCO2e/bữa',
   0.9000, 0, 0, 0.9000,
   'IPCC', 2022, true,
   'Vegan meal — grains + legumes + vegetables, no dairy/eggs. Lower bound of typical meal envelopes.')

ON CONFLICT (id) DO UPDATE
SET co2e_total = EXCLUDED.co2e_total,
    year_valid = EXCLUDED.year_valid,
    notes      = EXCLUDED.notes,
    updated_at = now();


-- ───────────────────────────────────────────────────────────────────────────
-- 2) CalculationTemplates — wire new factors
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO "CalculationTemplates"
  (id, category_id, default_ef_id, name, description, input_schema,
   formula_string, calculation_method, result_unit, is_active)
VALUES
  ('ab100000-0000-0000-0000-000000000003',
   'c1000000-0000-0000-0000-000000000008',
   'ef000000-0000-0000-0000-000000000021',
   'Di chuyển bằng xe máy điện',
   'Khoảng cách di chuyển hàng ngày bằng xe máy điện cá nhân.',
   '[{"key":"distance_km","label":"Khoảng cách (km)","type":"number","min":0}]'::jsonb,
   'distance_km * EF_TOTAL',
   'Activity-based', 'kgCO2e', true),

  ('ab100000-0000-0000-0000-000000000004',
   'c1000000-0000-0000-0000-000000000002',
   'ef000000-0000-0000-0000-000000000025',
   'Chuyến bay nội địa',
   'Phát thải từ một chuyến bay nội địa hạng phổ thông.',
   '[{"key":"distance_km","label":"Khoảng cách bay (km)","type":"number","min":0},{"key":"passengers","label":"Số hành khách trên vé","type":"number","min":1,"default":1}]'::jsonb,
   '(distance_km / passengers) * EF_TOTAL',
   'Activity-based', 'kgCO2e', true),

  ('ab100000-0000-0000-0000-000000000005',
   'c1000000-0000-0000-0000-000000000003',
   'ef000000-0000-0000-0000-000000000028',
   'Bếp gas LPG',
   'Khí LPG sử dụng cho nấu ăn hoặc đun nước.',
   '[{"key":"kg_used","label":"Khối lượng LPG (kg)","type":"number","min":0}]'::jsonb,
   'kg_used * EF_TOTAL',
   'Activity-based', 'kgCO2e', true),

  ('ab100000-0000-0000-0000-000000000006',
   'c1000000-0000-0000-0000-000000000006',
   'ef000000-0000-0000-0000-000000000030',
   'Compost hữu cơ tại nhà',
   'Lượng rác hữu cơ được ủ compost thay vì chôn lấp.',
   '[{"key":"kg_organic","label":"Khối lượng (kg)","type":"number","min":0}]'::jsonb,
   'kg_organic * EF_TOTAL',
   'Activity-based', 'kgCO2e', true)

ON CONFLICT (id) DO UPDATE
SET description    = EXCLUDED.description,
    input_schema   = EXCLUDED.input_schema,
    formula_string = EXCLUDED.formula_string,
    updated_at     = now();


-- ───────────────────────────────────────────────────────────────────────────
-- 3) Challenges — global (org_id IS NULL), VN-flavoured
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO "Challenges"
  (id, org_id, name, category, target_audience, description, rules,
   points_reward, duration_days, verification_method, status,
   start_date, end_date)
VALUES
  ('c2000000-0000-0000-0000-000000000010',
   NULL,
   'Đi bộ 10.000 bước/ngày', 'Lifestyle', 'all',
   'Đi bộ ít nhất 10.000 bước mỗi ngày trong 14 ngày — giảm xe máy ngắn, tăng sức khoẻ.',
   '{"min_logs_per_day":1,"category_hint":"Personal Transport"}'::jsonb,
   120, 14, 'Honor', 'Active',
   '2026-06-01', '2026-06-15'),

  ('c2000000-0000-0000-0000-000000000011',
   NULL,
   'Tắt thiết bị stand-by', 'Electricity', 'all',
   'Mỗi tối rút phích các thiết bị điện không dùng (TV, sạc, lò vi sóng). Ghi nhận hằng ngày.',
   '{"min_logs_per_day":1,"scope":"Scope 2"}'::jsonb,
   80, 21, 'Honor', 'Active',
   '2026-06-01', '2026-06-22'),

  ('c2000000-0000-0000-0000-000000000012',
   NULL,
   'Túi vải đi chợ', 'Waste', 'all',
   'Dùng túi vải/ làn thay vì túi nylon trong 30 ngày khi đi chợ hoặc siêu thị.',
   '{"min_logs_per_day":1}'::jsonb,
   100, 30, 'Photo', 'Active',
   '2026-06-01', '2026-07-01'),

  ('c2000000-0000-0000-0000-000000000013',
   NULL,
   'Đi xe buýt 5 lần/tuần', 'Travel', 'all',
   'Ưu tiên xe buýt hoặc tàu điện thay vì xe máy/ô tô tối thiểu 5 chuyến mỗi tuần.',
   '{"weekly_target":5,"category_hint":"Personal Transport"}'::jsonb,
   150, 28, 'Honor', 'Active',
   '2026-06-01', '2026-06-29'),

  ('c2000000-0000-0000-0000-000000000014',
   NULL,
   'Bình nước cá nhân', 'Waste', 'all',
   'Mang bình nước riêng, không mua chai nhựa dùng một lần trong 30 ngày.',
   '{"min_logs_per_day":1}'::jsonb,
   90, 30, 'Honor', 'Active',
   '2026-06-01', '2026-07-01'),

  ('c2000000-0000-0000-0000-000000000015',
   NULL,
   'Tiết kiệm nước 20%', 'Water', 'all',
   'So với tháng trước, giảm 20% lượng nước sinh hoạt qua việc tắt vòi khi không dùng, sửa rò rỉ.',
   '{"target_reduction_pct":20,"scope":"Scope 3"}'::jsonb,
   180, 30, 'Honor', 'Upcoming',
   '2026-07-01', '2026-07-31'),

  ('c2000000-0000-0000-0000-000000000016',
   NULL,
   'Chuyến đi không phát thải', 'Travel', 'all',
   'Hoàn thành ít nhất 3 chuyến đi bằng xe đạp, đi bộ hoặc tàu điện trong 1 tuần.',
   '{"weekly_target":3,"category_hint":"Personal Transport"}'::jsonb,
   100, 7, 'Honor', 'Active',
   '2026-06-01', '2026-06-08'),

  ('c2000000-0000-0000-0000-000000000017',
   NULL,
   'Hạn chế giao đồ ăn', 'Diet', 'all',
   'Không đặt giao đồ ăn (Grab/Shopee Food/...) trong 14 ngày — giảm bao bì + chuyến đi nhỏ.',
   '{"weekly_target":7,"avoid":"delivery"}'::jsonb,
   140, 14, 'Honor', 'Active',
   '2026-06-01', '2026-06-15')

ON CONFLICT (id) DO UPDATE
SET description   = EXCLUDED.description,
    rules         = EXCLUDED.rules,
    points_reward = EXCLUDED.points_reward,
    status        = EXCLUDED.status,
    start_date    = EXCLUDED.start_date,
    end_date      = EXCLUDED.end_date,
    updated_at    = now();


-- ───────────────────────────────────────────────────────────────────────────
-- 4) Rewards — varied tiers
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO "Rewards"
  (id, name, category, sku, description, points_cost, total_stock,
   fulfillment, status)
VALUES
  ('d3000000-0000-0000-0000-000000000010',
   'Sticker EcoWise', 'Merch', 'STICKER-V1',
   'Bộ 5 sticker thân thiện môi trường để dán laptop/ bình nước.',
   50, 500, 'Physical', 'Active'),

  ('d3000000-0000-0000-0000-000000000011',
   'Voucher mua sắm xanh 50K', 'Voucher', 'VOUCHER-50K',
   'Mã giảm giá 50.000đ tại các cửa hàng đối tác (Co.opmart, AnNam Gourmet).',
   100, 200, 'Digital', 'Active'),

  ('d3000000-0000-0000-0000-000000000012',
   'Túi vải canvas EcoWise', 'Merch', 'TOTE-CANVAS',
   'Túi vải tái chế dung tích 12L, in logo EcoWise.',
   250, 150, 'Physical', 'Active'),

  ('d3000000-0000-0000-0000-000000000013',
   'Voucher cà phê hữu cơ', 'Voucher', 'VOUCHER-COFFEE',
   'Mã 1 ly cà phê hữu cơ tại các quán đối tác (The Workshop, Là Việt).',
   180, 100, 'Digital', 'Active'),

  ('d3000000-0000-0000-0000-000000000014',
   'Bình nước inox cách nhiệt', 'Merch', 'BOTTLE-STEEL',
   'Bình 500ml inox 304, giữ nhiệt 12 giờ.',
   400, 80, 'Physical', 'Active'),

  ('d3000000-0000-0000-0000-000000000015',
   'Trồng 5 cây xanh', 'Donation', 'DONATE-5-TREES',
   'Đóng góp trồng 5 cây qua đối tác Gaia Nature Reserve.',
   600, 999, 'Donation', 'Active'),

  ('d3000000-0000-0000-0000-000000000016',
   'Khóa học bền vững online', 'Digital', 'COURSE-SUST-101',
   'Truy cập 30 ngày khóa "Carbon Literacy 101" của EcoWise Academy.',
   750, 1000, 'Digital', 'Active'),

  ('d3000000-0000-0000-0000-000000000017',
   'Trồng 20 cây xanh', 'Donation', 'DONATE-20-TREES',
   'Đóng góp trồng 20 cây + báo cáo định kỳ qua đối tác Gaia.',
   1500, 999, 'Donation', 'Active'),

  ('d3000000-0000-0000-0000-000000000018',
   'Voucher báo cáo carbon cá nhân', 'Digital', 'REPORT-PERSONAL',
   'Báo cáo PDF chuyên sâu về phát thải cá nhân của bạn, gửi qua email.',
   320, 500, 'Digital', 'Active'),

  ('d3000000-0000-0000-0000-000000000019',
   'Voucher Grab Bike 20K', 'Voucher', 'VOUCHER-GRAB-20K',
   'Mã Grab Bike 20.000đ — khuyến khích đi chung thay vì xe máy cá nhân.',
   80, 300, 'Digital', 'LowStock')

ON CONFLICT (sku) DO UPDATE
SET name        = EXCLUDED.name,
    description = EXCLUDED.description,
    points_cost = EXCLUDED.points_cost,
    total_stock = EXCLUDED.total_stock,
    status      = EXCLUDED.status,
    updated_at  = now();


-- ───────────────────────────────────────────────────────────────────────────
-- 5) Badges — extend achievement set
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO "Badges" (id, code, name, description, criteria) VALUES
  ('b4000000-0000-0000-0000-000000000010', 'WEEK_STREAK',
   'Tuần kiên trì',
   'Ghi nhận hoạt động phát thải ít nhất 1 lần mỗi ngày trong 7 ngày liên tiếp.',
   '{"kind":"streak","unit":"day","threshold":7}'::jsonb),

  ('b4000000-0000-0000-0000-000000000011', 'MONTH_STREAK',
   'Tháng kiên trì',
   'Duy trì ghi nhận ít nhất 1 hoạt động mỗi ngày trong 30 ngày liên tiếp.',
   '{"kind":"streak","unit":"day","threshold":30}'::jsonb),

  ('b4000000-0000-0000-0000-000000000012', 'CHALLENGE_FIRST',
   'Người tiên phong',
   'Hoàn thành thử thách EcoWise đầu tiên của bạn.',
   '{"kind":"challenges_completed","threshold":1}'::jsonb),

  ('b4000000-0000-0000-0000-000000000013', 'CHALLENGE_FIVE',
   'Chiến binh xanh',
   'Hoàn thành tổng cộng 5 thử thách EcoWise.',
   '{"kind":"challenges_completed","threshold":5}'::jsonb),

  ('b4000000-0000-0000-0000-000000000014', 'REWARD_FIRST',
   'Đổi quà lần đầu',
   'Đổi phần thưởng đầu tiên tại Rewards Store.',
   '{"kind":"redemptions","threshold":1}'::jsonb),

  ('b4000000-0000-0000-0000-000000000015', 'CARBON_HALF',
   'Giảm carbon một nửa',
   'Đạt mức giảm phát thải 50% so với baseline trong một kỳ báo cáo.',
   '{"kind":"reduction_pct","threshold":50}'::jsonb),

  ('b4000000-0000-0000-0000-000000000016', 'COMMUNITY_HELPER',
   'Đồng đội xanh',
   'Tham gia tổ chức và đóng góp ít nhất 1 sự kiện B2B.',
   '{"kind":"event_participation","threshold":1}'::jsonb)

ON CONFLICT (code) DO UPDATE
SET name        = EXCLUDED.name,
    description = EXCLUDED.description,
    criteria    = EXCLUDED.criteria;


-- ───────────────────────────────────────────────────────────────────────────
-- 6) EmissionBenchmarks — VN-HCM, VN-HN, 2023 refresh, ASEAN
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO "EmissionBenchmarks"
  (region_code, region_name, region_type, year_of_data,
   total_co2e_kg_per_capita,
   scope_1_share, scope_2_share, scope_3_share,
   source_name, source_url, notes)
VALUES
  -- 2023 refresh for the existing rows
  ('WORLD', 'Toàn cầu', 'global', 2023,
   4790.00,
   0.400, 0.350, 0.250,
   'Our World in Data (IEA)',
   'https://ourworldindata.org/co2-emissions',
   'Per-capita energy CO2 (2023). Slight uptick from 2022 due to higher coal use after gas price shock.'),

  ('VN', 'Việt Nam', 'country', 2023,
   3680.00,
   0.450, 0.300, 0.250,
   'Our World in Data (IEA)',
   'https://ourworldindata.org/co2/country/vietnam',
   'Per-capita energy CO2 (2023). Rising on continued thermal-coal capacity expansion.'),

  -- City-level estimates (urban consumption skews higher)
  ('VN-HCM', 'TP. Hồ Chí Minh', 'city', 2022,
   5320.00,
   0.420, 0.330, 0.250,
   'HCMC DONRE 2023 Inventory',
   NULL,
   'City-scope 1+2+3 inventory from HCMC Dept. of Natural Resources & Environment 2023 report, normalised per capita. Higher than national average due to higher vehicle ownership + consumption.'),

  ('VN-HN', 'Hà Nội', 'city', 2022,
   4980.00,
   0.430, 0.330, 0.240,
   'Hanoi PCDC 2023 Inventory',
   NULL,
   'Hanoi People''s Committee Department of Construction 2023 report, normalised per capita.'),

  -- Regional benchmark
  ('ASEAN', 'Khu vực ASEAN', 'global', 2022,
   3050.00,
   0.430, 0.300, 0.270,
   'Our World in Data (IEA)',
   'https://ourworldindata.org/co2-emissions',
   'Population-weighted average of ASEAN-10 per-capita energy CO2 (2022). Sits between low-income Myanmar/Cambodia and high-income Singapore/Brunei.')

ON CONFLICT (region_code, year_of_data) DO UPDATE
SET region_name              = EXCLUDED.region_name,
    total_co2e_kg_per_capita = EXCLUDED.total_co2e_kg_per_capita,
    scope_1_share            = EXCLUDED.scope_1_share,
    scope_2_share            = EXCLUDED.scope_2_share,
    scope_3_share            = EXCLUDED.scope_3_share,
    source_name              = EXCLUDED.source_name,
    source_url               = EXCLUDED.source_url,
    notes                    = EXCLUDED.notes;


-- ───────────────────────────────────────────────────────────────────────────
-- 7) SubscriptionPlans — annual variants of every tier
-- ----------------------------------------------------------------------------
-- Annual = ~10× monthly price (≈17% discount vs straight 12×). max_users
-- and max_events mirror their monthly counterparts; features carry over.
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO "SubscriptionPlans"
  (id, plan_code, plan_name, target_customer, base_price_usd, billing_cycle,
   trial_days, max_users, max_events, features, status)
VALUES
  ('aa200000-0000-0000-0000-000000000001',
   'B2B_BASIC_ANNUAL', 'Business Basic (Annual)', 'B2B',
   490.00, 'Annual',
   0, 10, 5,
   '["Up to 10 members","5 events / year","Standard ESG reports","Email support"]'::jsonb,
   'Active'),

  ('aa200000-0000-0000-0000-000000000002',
   'B2B_PRO_ANNUAL', 'Business Pro (Annual)', 'B2B',
   1490.00, 'Annual',
   0, 50, 20,
   '["Up to 50 members","20 events / year","Real-time dashboard","Custom emission factors","Priority email support"]'::jsonb,
   'Active'),

  ('aa200000-0000-0000-0000-000000000003',
   'B2B_ENT_ANNUAL', 'Business Enterprise (Annual)', 'B2B',
   4990.00, 'Annual',
   0, NULL, NULL,
   '["Unlimited members","Unlimited events","Dedicated CSM","SSO + Audit log export","Verified ESG reports (B-Corp/CDP-ready)"]'::jsonb,
   'Active'),

  ('aa200000-0000-0000-0000-000000000004',
   'B2C_PLUS_ANNUAL', 'Personal Plus (Annual)', 'B2C',
   49.90, 'Annual',
   0, 1, 0,
   '["Unlimited logs","Carbon target tracking","Advanced recommendations","Ad-free experience"]'::jsonb,
   'Active')

ON CONFLICT (plan_code) DO UPDATE
SET plan_name      = EXCLUDED.plan_name,
    base_price_usd = EXCLUDED.base_price_usd,
    max_users      = EXCLUDED.max_users,
    max_events     = EXCLUDED.max_events,
    features       = EXCLUDED.features,
    status         = EXCLUDED.status,
    updated_at     = now();
