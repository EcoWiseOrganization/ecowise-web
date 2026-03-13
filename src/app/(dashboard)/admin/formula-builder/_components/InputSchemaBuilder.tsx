"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTranslation } from "react-i18next";
import type { InputFieldSchema } from "@/types/sustainability";

interface InputSchemaBuilderProps {
  fields: InputFieldSchema[];
  onChange: (fields: InputFieldSchema[]) => void;
}

const EMPTY_FIELD = (): InputFieldSchema => ({
  field: "",
  type: "number",
  unit: "",
  label: "",
  required: true,
  min: 0,
});

const inputCls =
  "w-full px-2.5 py-2 rounded-lg border border-[#DAEDD5] bg-white text-[#141514] " +
  "text-sm placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#79B669] " +
  "focus:ring-1 focus:ring-[#79B669]/20 transition-colors";

export function InputSchemaBuilder({ fields, onChange }: InputSchemaBuilderProps) {
  const { t } = useTranslation();

  const updateField = (index: number, patch: Partial<InputFieldSchema>) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const addField = () => onChange([...fields, EMPTY_FIELD()]);

  const removeField = (index: number) => onChange(fields.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 && (
        <p className="text-[#AAAAAA] text-sm text-center py-4 border border-dashed border-[#DAEDD5] rounded-xl">
          {t("admin.formula.schema.empty")}
        </p>
      )}

      {fields.map((field, i) => (
        <div
          key={i}
          className="bg-[#f9fdf7] border border-[#DAEDD5] rounded-xl p-3 flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs font-semibold text-[#1F8505] uppercase tracking-wide">
              {t("admin.formula.schema.fieldLabel", { num: i + 1 })}
            </span>
            <button
              type="button"
              onClick={() => removeField(i)}
              className="p-1 rounded-lg text-[#AAAAAA] hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Variable name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#6E726E] font-medium">
                {t("admin.formula.schema.varName")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. kwh, distance_km"
                value={field.field}
                onChange={(e) => updateField(i, { field: e.target.value.replace(/\s/g, "_") })}
                className={`${inputCls} font-mono`}
                pattern="[a-zA-Z_][a-zA-Z0-9_]*"
              />
            </div>

            {/* Display label */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#6E726E] font-medium">
                {t("admin.formula.schema.displayLabel")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Điện năng tiêu thụ"
                value={field.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Unit */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#6E726E] font-medium">{t("admin.formula.schema.unit")}</label>
              <input
                type="text"
                placeholder="e.g. kWh, km, VND"
                value={field.unit}
                onChange={(e) => updateField(i, { unit: e.target.value })}
                className={`${inputCls} font-mono`}
              />
            </div>

            {/* Input type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#6E726E] font-medium">{t("admin.formula.schema.type")}</label>
              <select
                value={field.type}
                onChange={(e) => updateField(i, { type: e.target.value as "number" | "select" })}
                className={`${inputCls} cursor-pointer appearance-none`}
              >
                <option value="number">{t("admin.formula.schema.typeNumber")}</option>
                <option value="select">{t("admin.formula.schema.typeSelect")}</option>
              </select>
            </div>

            {/* Min value */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#6E726E] font-medium">{t("admin.formula.schema.minValue")}</label>
              <input
                type="number"
                step="any"
                value={field.min ?? ""}
                placeholder="0"
                onChange={(e) => updateField(i, { min: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                className={inputCls}
              />
            </div>

            {/* Default value */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#6E726E] font-medium">{t("admin.formula.schema.defaultValue")}</label>
              <input
                type="number"
                step="any"
                value={field.default_value ?? ""}
                placeholder="(none)"
                onChange={(e) => updateField(i, { default_value: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Required toggle */}
          <label className="flex items-center gap-2 text-xs text-[#6E726E] cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={field.required ?? false}
              onChange={(e) => updateField(i, { required: e.target.checked })}
              className="accent-[#1F8505]"
            />
            {t("admin.formula.schema.required")}
          </label>
        </div>
      ))}

      <button
        type="button"
        onClick={addField}
        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border-2 border-dashed border-[#DAEDD5] text-[#79B669] text-sm font-medium hover:border-[#79B669] hover:bg-[#f0f9ed] transition-all cursor-pointer"
      >
        <AddIcon sx={{ fontSize: 16 }} />
        {t("admin.formula.schema.addField")}
      </button>
    </div>
  );
}
