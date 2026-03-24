# Tài liệu kỹ thuật: Emission Engine (Admin)

> **Đối tượng:** Lập trình viên & Admin hệ thống EcoWise
> **Phạm vi:** Hai tab trong khu vực Admin — **Emission Factors** và **Formula Builder**
> **Vị trí menu:** Admin Dashboard → *Emission Engine* → Emission Factors / Formula Builder

---

## Tổng quan

Hai tab này tạo thành **bộ máy tính toán phát thải (Emission Engine)** của hệ thống EcoWise. Chúng hoạt động độc lập nhưng phụ thuộc lẫn nhau theo thứ tự:

```
[Emission Factors]  →  [Formula Builder]  →  [User nhập liệu]  →  [Kết quả kgCO₂e]
     (Hệ số)              (Công thức)           (Dữ liệu thực)        (Báo cáo)
```

Nói đơn giản:
- **Emission Factors** lưu các *hệ số quy đổi* (ví dụ: 1 kWh điện = 0.5571 kgCO₂e).
- **Formula Builder** dùng các hệ số đó để xây *công thức tính toán* theo từng nghiệp vụ.
- Người dùng cuối chỉ nhập số liệu thực tế (kWh, km, ...) và hệ thống tự tính ra lượng khí thải.

---

## Tab 1: Emission Factors (Quản lý Hệ số Phát thải)

### 1.1 Mục đích

Emission Factor (EF) là **hằng số khoa học** biểu thị lượng khí nhà kính phát thải trên một đơn vị hoạt động. Ví dụ:

| Hoạt động | Đơn vị | EF (kgCO₂e) | Nguồn |
|-----------|--------|-------------|-------|
| Dùng điện lưới VN 2022 | kWh | 0.5571 | MONRE VN |
| Di chuyển ô tô xăng | km | 0.1900 | DEFRA 2022 |
| Đốt nhiên liệu diesel | lít | 2.6800 | IPCC |

Tab này cho phép Admin **tạo, chỉnh sửa, lưu trữ** toàn bộ thư viện hệ số phát thải của hệ thống.

---

### 1.2 Cấu trúc dữ liệu (`EmissionFactor`)

```typescript
{
  id: string                  // UUID, primary key
  category_id: string         // Thuộc danh mục nào (Điện, Giao thông, ...)
  name: string                // Tên gợi nhớ, ví dụ: "Vietnam National Grid 2022"
  unit: string                // Đơn vị mẫu số, ví dụ: "kgCO2e/kWh"

  // Thành phần khí nhà kính (GHG Components)
  co2_value: number           // CO₂ (Carbon dioxide)
  ch4_value: number           // CH₄ (Methane)
  n2o_value: number           // N₂O (Nitrous oxide)
  co2e_total: number          // Tổng quy đổi CO₂ tương đương

  source_reference: EFSource  // MONRE_VN | IPCC | DEFRA | EPA | Climatiq | Custom
  year_valid: number | null   // Năm áp dụng (null = luôn hợp lệ)
  is_active: boolean          // Xóa mềm (false = đã lưu trữ)
  notes: string | null        // Ghi chú, tài liệu tham khảo
}
```

---

### 1.3 Công thức tính `co2e_total`

Hệ thống dùng **GWP₁₀₀ theo IPCC AR6** (báo cáo mới nhất 2021) để quy đổi các loại khí về đơn vị CO₂ tương đương:

```
co2e_total = co2_value + (ch4_value × 27.9) + (n2o_value × 273)
```

Ý nghĩa:
- `× 27.9` — CH₄ có khả năng làm nóng toàn cầu gấp **27.9 lần** CO₂ trong 100 năm
- `× 273` — N₂O có khả năng làm nóng toàn cầu gấp **273 lần** CO₂ trong 100 năm

> Trong form tạo/sửa EF, admin có thể bật **"Auto-calculate CO₂e total"** để hệ thống tự tính theo công thức trên dựa vào 3 giá trị thành phần đã nhập.

---

### 1.4 Phân loại Scope (GHG Protocol)

Mỗi EF thuộc một danh mục (`category`), và danh mục đó thuộc một trong ba **Scope** theo chuẩn GHG Protocol:

| Scope | Mô tả | Ví dụ |
|-------|-------|-------|
| **Scope 1** | Phát thải trực tiếp từ nguồn thuộc quyền kiểm soát | Đốt nhiên liệu tại nhà máy |
| **Scope 2** | Phát thải gián tiếp từ năng lượng mua | Điện lưới, hơi nước |
| **Scope 3** | Phát thải gián tiếp khác trong chuỗi giá trị | Vận chuyển, chuỗi cung ứng |

Giao diện có 3 tab lọc theo Scope kèm số lượng hệ số tương ứng.

---

### 1.5 Các tính năng UI

| Tính năng | Mô tả |
|-----------|-------|
| **Tạo mới EF** | Modal form với đầy đủ trường, auto-tính co2e_total |
| **Chỉnh sửa EF** | Mở lại modal với dữ liệu có sẵn |
| **Lưu trữ (Archive)** | Đặt `is_active = false` — không xóa hẳn để bảo toàn lịch sử tính toán |
| **Lọc theo Scope** | Tabs Scope 1 / Scope 2 / Scope 3 / Tất cả |
| **Badge nguồn** | Hiển thị màu sắc theo `source_reference` (MONRE VN, DEFRA, IPCC, ...) |

> **Tại sao không xóa hẳn?** Các EF đã dùng trong tính toán lịch sử cần được giữ nguyên để kết quả cũ vẫn chính xác khi audit. Soft delete (`is_active = false`) đảm bảo điều này.

---

### 1.6 Nguồn dữ liệu được hỗ trợ (`EFSource`)

| Giá trị | Tên đầy đủ | Ghi chú |
|---------|-----------|---------|
| `MONRE_VN` | Bộ Tài nguyên & Môi trường Việt Nam | Dùng cho báo cáo tuân thủ nội địa |
| `IPCC` | Intergovernmental Panel on Climate Change | Chuẩn quốc tế |
| `DEFRA` | UK Department for Environment, Food & Rural Affairs | Phổ biến cho GHG Protocol |
| `EPA` | US Environmental Protection Agency | Chuẩn Mỹ |
| `Climatiq` | Climatiq API | Dữ liệu thương mại cập nhật |
| `Custom` | Tự nhập | EF đặc thù của tổ chức |

---

## Tab 2: Formula Builder (Xây dựng Công thức Tính toán)

### 2.1 Mục đích

Formula Builder cho phép Admin xây dựng các **mẫu công thức tính toán** (Calculation Template) linh hoạt. Mỗi template định nghĩa:

1. **Người dùng cần nhập những dữ liệu gì** (input schema)
2. **Công thức tính phát thải như thế nào** (formula string)
3. **Hệ số EF nào được dùng mặc định** (hoặc để user chọn lúc nhập)

Nhờ vậy, Admin có thể tạo công thức cho **bất kỳ nghiệp vụ nào** mà không cần lập trình — chỉ cần điền form.

---

### 2.2 Cấu trúc dữ liệu (`CalculationTemplate`)

```typescript
{
  id: string
  category_id: string               // Danh mục phát thải (Điện, Giao thông, ...)
  default_ef_id: string | null      // EF mặc định (null = user tự chọn khi nhập)
  name: string                      // Tên template, ví dụ: "Điện năng tiêu thụ (kWh)"
  description: string | null        // Mô tả nghiệp vụ
  input_schema: InputFieldSchema[]  // Danh sách trường nhập liệu (JSONB)
  formula_string: string            // Công thức toán học, ví dụ: "kwh * EF_TOTAL"
  calculation_method: string        // Activity-based | Spend-based | Hybrid
  result_unit: string               // Đơn vị kết quả, mặc định "kgCO2e"
  is_active: boolean
}
```

---

### 2.3 Input Schema — Định nghĩa trường nhập liệu

Mỗi trường trong `input_schema` mô tả **một ô nhập liệu** mà user sẽ thấy:

```typescript
{
  field: string          // Tên biến dùng trong công thức, ví dụ: "kwh"
  label: string          // Nhãn hiển thị cho user, ví dụ: "Điện năng tiêu thụ"
  unit: string           // Đơn vị, ví dụ: "kWh", "km", "VND"
  type: "number"         // Số — user gõ con số vào
       | "select"        // Dropdown — user chọn từ danh sách
  required?: boolean     // Bắt buộc điền?
  min?: number           // Giá trị nhỏ nhất
  max?: number           // Giá trị lớn nhất
  default_value?: number // Giá trị mặc định
  options?: [            // Chỉ dùng khi type = "select"
    { value: string; label: string }
  ]
}
```

**Ví dụ thực tế** — Template "Di chuyển công tác bằng xe ô tô":

```json
[
  {
    "field": "distance_km",
    "label": "Quãng đường di chuyển",
    "unit": "km",
    "type": "number",
    "required": true,
    "min": 0
  },
  {
    "field": "passengers",
    "label": "Số hành khách",
    "unit": "người",
    "type": "number",
    "required": true,
    "min": 1,
    "default_value": 1
  }
]
```

---

### 2.4 Formula String — Cú pháp công thức

Công thức được viết dưới dạng **biểu thức toán học thuần túy** với các biến là `field` đã khai báo trong input schema, cộng với biến đặc biệt `EF_TOTAL`.

#### Biến đặc biệt: `EF_TOTAL`
- Được tự động inject bằng giá trị `co2e_total` của EmissionFactor đã chọn (default hoặc do user chọn lúc nhập).
- **Luôn bắt buộc có trong công thức** (vì kết quả phải là kgCO₂e).

#### Toán tử & hàm hỗ trợ

| Loại | Cú pháp |
|------|---------|
| Số học cơ bản | `+` `-` `*` `/` `( )` |
| Lũy thừa | `pow(base, exp)` |
| Căn bậc hai | `sqrt(x)` |
| Trị tuyệt đối | `abs(x)` |
| Làm tròn | `round(x)` `floor(x)` `ceil(x)` |
| Min / Max | `min(a, b)` `max(a, b)` |
| Hằng số | `PI` `E` |

#### Ví dụ công thức thực tế

```
# Tính phát thải điện năng
kwh * EF_TOTAL

# Tính phát thải di chuyển theo đầu người
(distance_km / passengers) * EF_TOTAL

# Tính phát thải theo chi tiêu (spend-based)
quantity * unit_price * EF_TOTAL

# Tính có điều kiện (dùng min/max để giới hạn)
min(kwh, 10000) * EF_TOTAL
```

---

### 2.5 Formula Engine — Bộ máy tính toán

File: `src/lib/formula-engine.ts`

Đây là thư viện JavaScript nội bộ thực thi an toàn các công thức được định nghĩa trong Formula Builder.

#### Luồng tính toán

```
formula_string + scope (biến + EF_TOTAL)
       ↓
  Validate syntax
       ↓
  Sandbox execution (new Function với scope được kiểm soát)
       ↓
  Trả về { result_kgco2e, result_tco2e, breakdown }
```

#### Bảo mật (Security Sandbox)

Do công thức được lưu dưới dạng text và thực thi động, hệ thống áp dụng các lớp bảo vệ:

```typescript
// 1. Whitelist ký tự — chỉ cho phép ký tự hợp lệ
const SAFE_PATTERN = /^[0-9+\-*/().\s_a-zA-Z,]+$/;

// 2. Kiểm tra dấu ngoặc cân bằng
// Ví dụ: "((kwh * EF_TOTAL)" → lỗi vì thiếu ")"

// 3. Thực thi trong scope riêng biệt — không truy cập được window/global/process
const fn = new Function(...Object.keys(scope), `return ${formula}`);
const result = fn(...Object.values(scope));

// 4. Từ chối kết quả không hợp lệ
if (!isFinite(result) || isNaN(result)) throw new Error("Invalid result");
```

#### Kết quả trả về

```typescript
{
  result_kgco2e: number   // Kết quả chính (kgCO₂e)
  result_tco2e: number    // Quy đổi sang tấn CO₂e (chia 1000)
  breakdown: {
    formula: string       // Công thức gốc
    variables: { ... }    // Giá trị từng biến đã dùng
    ef_value: number      // Giá trị EF_TOTAL đã dùng
  }
}
```

---

### 2.6 Phương pháp tính toán (`calculation_method`)

| Giá trị | Tên | Khi nào dùng |
|---------|-----|-------------|
| `Activity-based` | Dựa trên hoạt động | Khi có số liệu hoạt động thực tế (kWh, km, ...) |
| `Spend-based` | Dựa trên chi tiêu | Khi chỉ có dữ liệu tài chính (triệu VND, USD) |
| `Hybrid` | Kết hợp | Kết hợp cả hoạt động và chi tiêu |

---

### 2.7 Kiểm tra chéo biến (Variable Cross-check)

Khi Admin viết công thức, UI tự động kiểm tra sự nhất quán giữa **input schema** và **formula string**:

```
Input schema khai báo: [kwh, location]
Formula dùng:          kwh * EF_TOTAL

→ Cảnh báo: "location" được khai báo nhưng không dùng trong công thức
```

Hai trường hợp cảnh báo:

| Loại | Mô tả | Mức độ |
|------|-------|--------|
| Biến dư | Khai báo trong schema nhưng không dùng trong công thức | Warning |
| Biến thiếu | Dùng trong công thức nhưng chưa khai báo trong schema | Lỗi (không lưu được) |

---

## 3. Mối quan hệ giữa hai tab

```
EmissionFactor (EF)
  id: "ef-001"
  name: "Vietnam National Grid 2022"
  co2e_total: 0.5571   ←─────────────────────────────────┐
  unit: "kgCO2e/kWh"                                     │
                                                          │ EF_TOTAL = 0.5571
CalculationTemplate                                       │
  name: "Điện năng tiêu thụ"                             │
  default_ef_id: "ef-001"  ──────────────────────────────┘
  input_schema: [{ field: "kwh", label: "Số kWh" }]
  formula_string: "kwh * EF_TOTAL"

──────────────────────────────────────────

User nhập: kwh = 1000

Kết quả: 1000 × 0.5571 = 557.1 kgCO₂e = 0.5571 tCO₂e
```

---

## 4. Quyền truy cập (Authorization)

Cả hai tab đều chỉ dành riêng cho **System Admin** (`User.is_admin = true`).

Cơ chế bảo vệ áp dụng ở **3 lớp**:

| Lớp | Vị trí | Cách hoạt động |
|-----|--------|---------------|
| **Middleware** | `src/lib/supabase/middleware.ts` | Redirect non-admin khỏi `/admin/*` |
| **Server Action** | `src/app/actions/sustainability.actions.ts` | `requireAdmin()` ném lỗi nếu không phải admin |
| **Row Level Security** | PostgreSQL (Supabase) | Policy `is_system_admin()` chặn INSERT/UPDATE/DELETE |

---

## 5. Database Schema

### Bảng `EmissionFactors`

```sql
CREATE TABLE EmissionFactors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      UUID NOT NULL REFERENCES EmissionCategories(id),
  name             VARCHAR(255) NOT NULL,
  unit             VARCHAR(50)  NOT NULL,          -- ví dụ: kgCO2e/kWh
  co2_value        NUMERIC(18,8) NOT NULL DEFAULT 0,
  ch4_value        NUMERIC(18,8) NOT NULL DEFAULT 0,
  n2o_value        NUMERIC(18,8) NOT NULL DEFAULT 0,
  co2e_total       NUMERIC(18,8) NOT NULL,          -- >= 0
  source_reference ghg_ef_source NOT NULL,
  year_valid       SMALLINT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  created_by       UUID REFERENCES auth.users(id),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  updated_by       UUID REFERENCES auth.users(id)
);
```

### Bảng `CalculationTemplates`

```sql
CREATE TABLE CalculationTemplates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         UUID NOT NULL REFERENCES EmissionCategories(id),
  default_ef_id       UUID REFERENCES EmissionFactors(id),
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  input_schema        JSONB NOT NULL DEFAULT '[]',  -- mảng InputFieldSchema
  formula_string      TEXT NOT NULL,
  calculation_method  ghg_calc_method NOT NULL,
  result_unit         VARCHAR(50) NOT NULL DEFAULT 'kgCO2e',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  created_by          UUID REFERENCES auth.users(id),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  updated_by          UUID REFERENCES auth.users(id)
);
```

### Trigger tự động cập nhật `updated_at`

```sql
CREATE TRIGGER trg_emission_factors_updated_at
  BEFORE UPDATE ON EmissionFactors
  FOR EACH ROW EXECUTE FUNCTION ghg_update_updated_at();
-- Tương tự cho CalculationTemplates
```

---

## 6. Luồng hoàn chỉnh từ Admin đến User

```
ADMIN SETUP
═══════════
① Admin tạo EmissionFactor
   → "Vietnam Grid 2022", co2e_total = 0.5571 kgCO2e/kWh

② Admin tạo CalculationTemplate
   → Tên: "Tiêu thụ điện văn phòng"
   → Input schema: [{ field: "kwh", label: "Số kWh tiêu thụ", unit: "kWh" }]
   → Formula: "kwh * EF_TOTAL"
   → Default EF: "Vietnam Grid 2022"

USER DATA ENTRY
═══════════════
③ User (org member) mở form nhập phát thải
   → Chọn danh mục: Điện → Hệ thống load template "Tiêu thụ điện văn phòng"
   → Hiển thị form: ô nhập "Số kWh tiêu thụ"
   → User nhập: 2500 kWh

CALCULATION ENGINE
══════════════════
④ FormulaEngine.calculate({
     formula: "kwh * EF_TOTAL",
     scope: { kwh: 2500, EF_TOTAL: 0.5571 }
   })
   → result_kgco2e = 1392.75
   → result_tco2e  = 1.39275

REPORTING
═════════
⑤ Kết quả lưu vào EmissionLog
   → Hiển thị trên Dashboard: 1.39 tCO₂e
   → Tổng hợp vào báo cáo ESG / GHG Report
```

---

## 7. Dữ liệu mẫu (Seed Data)

### Danh mục (EmissionCategories)

| Tên | Scope | Mô tả |
|-----|-------|-------|
| Electricity Consumption | Scope 2 | Điện mua từ lưới |
| Business Travel | Scope 3 | Di chuyển công tác |
| Fuel Combustion | Scope 1 | Đốt nhiên liệu trực tiếp |
| Supply Chain Spend | Scope 3 | Chi tiêu chuỗi cung ứng |

### Hệ số mẫu (EmissionFactors)

| Tên | EF | Đơn vị | Nguồn |
|-----|----|--------|-------|
| Vietnam National Grid 2022 | 0.5571 | kgCO₂e/kWh | MONRE VN |
| Petrol Car Average | 0.1900 | kgCO₂e/km | DEFRA 2022 |

### Template mẫu (CalculationTemplates)

| Template | Formula | Input |
|----------|---------|-------|
| Điện năng tiêu thụ | `kwh * EF_TOTAL` | `kwh` (kWh) |
| Di chuyển xe ô tô | `(distance_km / passengers) * EF_TOTAL` | `distance_km` (km), `passengers` (người) |

---

## 8. Vị trí file trong codebase

```
src/
├── app/
│   ├── (dashboard)/admin/
│   │   ├── emission-factors/
│   │   │   ├── page.tsx                         # Trang chính
│   │   │   └── _components/
│   │   │       ├── EFManagementView.tsx          # Layout + state quản lý
│   │   │       ├── EFTable.tsx                   # Bảng danh sách EF
│   │   │       └── EFModal.tsx                   # Modal tạo / sửa EF
│   │   └── formula-builder/
│   │       ├── page.tsx                          # Trang chính
│   │       └── _components/
│   │           ├── FormulaBuilderView.tsx         # Danh sách templates
│   │           ├── FormulaBuilderForm.tsx         # Form tạo template mới
│   │           └── InputSchemaBuilder.tsx         # UI khai báo trường nhập liệu
│   └── actions/
│       └── sustainability.actions.ts             # Server actions (CRUD + requireAdmin)
├── lib/
│   └── formula-engine.ts                         # Bộ máy tính toán & sandbox
├── services/
│   └── sustainability.service.ts                 # Client-side queries
└── types/
    └── sustainability.ts                         # TypeScript interfaces

supabase/migrations/
├── 002_emission_engine.sql                       # Schema EF + Templates + seed data
└── 003_emission_logs.sql                         # Schema EmissionLogs
```
