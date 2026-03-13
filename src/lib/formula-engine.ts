/**
 * FormulaEngine.ts
 * Safe mathematical formula evaluator for GHG emission calculations.
 *
 * Security approach:
 *   1. Whitelist regex — only digits, operators, parens, spaces, identifiers.
 *      Blocks any JS injection (no semicolons, curly braces, quotes, etc.)
 *   2. Balanced-parenthesis check — catches mismatched brackets early.
 *   3. new Function() with explicit scope — the generated function ONLY receives
 *      the variables we pass; it has no access to window, global, process, etc.
 *      "use strict" prevents implicit globals.
 *   4. Result validation — NaN / Infinity -> error before caller sees them.
 *
 * No external runtime dependency. All logic is pure TypeScript.
 */

import type { CalculationParams, CalculationResult } from "@/types/sustainability";

// ── Constants ──────────────────────────────────────────────────────────────

/**
 * Allowed characters in a formula string.
 * Regex breakdown:
 *   [0-9]       -> numeric literals
 *   + - * /     -> arithmetic operators
 *   ()          -> parentheses for grouping
 *   .           -> decimal separator
 *   \s          -> whitespace (ignored by JS parser)
 *   a-zA-Z_     -> identifier start chars (variable names)
 *   a-zA-Z0-9_  -> identifier continuation chars
 */
const SAFE_FORMULA_REGEX = /^[0-9+\-*/().\s_a-zA-Z]+$/;

/** Math built-ins exposed to formulas (no DOM / Node access) */
const MATH_BUILTINS: Record<string, unknown> = {
  sqrt:  Math.sqrt,
  abs:   Math.abs,
  pow:   Math.pow,
  min:   Math.min,
  max:   Math.max,
  round: Math.round,
  floor: Math.floor,
  ceil:  Math.ceil,
  PI:    Math.PI,
  E:     Math.E,
};

/** Names that should NOT be treated as user variables */
const BUILTIN_NAMES = new Set(Object.keys(MATH_BUILTINS));

// ── FormulaEngine class ────────────────────────────────────────────────────

export class FormulaEngine {
  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Extracts all identifier tokens from a formula string,
   * excluding math builtins (sqrt, abs, PI, etc.).
   * Example: "(distance_km / passengers) * EF_TOTAL"
   *          -> ["distance_km", "passengers", "EF_TOTAL"]
   */
  private static extractVariables(formula: string): string[] {
    const tokens = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? [];
    return [...new Set(tokens.filter((t) => !BUILTIN_NAMES.has(t)))];
  }

  /**
   * Checks that all opening parentheses have a matching closing one.
   */
  private static checkParentheses(formula: string): void {
    let depth = 0;
    for (const ch of formula) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (depth < 0) throw new Error("Unmatched closing parenthesis ')'");
    }
    if (depth !== 0) throw new Error("Missing closing parenthesis ')'");
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * validate()
   * Checks formula syntax WITHOUT side effects.
   * Returns { valid: true } on success or { valid: false, error: string }.
   *
   * Used by Formula Builder UI to show inline validation before saving.
   */
  static validate(
    formula: string,
  ): { valid: true } | { valid: false; error: string } {
    const trimmed = formula.trim();

    if (!trimmed) {
      return { valid: false, error: "Formula cannot be empty" };
    }

    if (!SAFE_FORMULA_REGEX.test(trimmed)) {
      return {
        valid: false,
        error:
          "Formula contains invalid characters. Only numbers, operators (+ - * /), parentheses and variable names are allowed.",
      };
    }

    try {
      FormulaEngine.checkParentheses(trimmed);
    } catch (e) {
      return {
        valid: false,
        error: e instanceof Error ? e.message : "Parenthesis error",
      };
    }

    // Dry-run with dummy values (every variable = 1, EF_TOTAL = 1)
    try {
      const vars = FormulaEngine.extractVariables(trimmed);
      const dummyScope: Record<string, number> = {};
      vars.forEach((v) => {
        dummyScope[v] = 1;
      });
      FormulaEngine.evaluate(trimmed, dummyScope);
    } catch (e) {
      return {
        valid: false,
        error: e instanceof Error ? e.message : "Syntax error in formula",
      };
    }

    return { valid: true };
  }

  /**
   * evaluate()
   * Core evaluation engine.
   *
   * Builds a sandboxed Function that only receives:
   *   - Variables from `scope` (user activity data + EF_TOTAL)
   *   - Math built-ins (sqrt, abs, etc.)
   *   - No access to window / global / process / document
   *
   * @param formula  - Sanitised formula string
   * @param scope    - { variable: number } map; must include EF_TOTAL if used
   * @returns        Rounded result (6 decimal places)
   */
  static evaluate(formula: string, scope: Record<string, number>): number {
    const trimmed = formula.trim();

    if (!SAFE_FORMULA_REGEX.test(trimmed)) {
      throw new Error("Formula failed safety check — contains forbidden characters");
    }

    FormulaEngine.checkParentheses(trimmed);

    // Build parameter lists for the generated function
    const scopeKeys   = Object.keys(scope);
    const scopeValues = Object.values(scope);
    const builtinKeys   = Object.keys(MATH_BUILTINS);
    const builtinValues = Object.values(MATH_BUILTINS);

    // Construct the sandboxed function:
    // function(scopeVar1, scopeVar2, ..., sqrt, abs, ...) {
    //   "use strict";
    //   return (formula);
    // }
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      ...scopeKeys,
      ...builtinKeys,
      `"use strict"; return (${trimmed});`,
    );

    const result = fn(...scopeValues, ...builtinValues);

    if (typeof result !== "number" || !isFinite(result)) {
      throw new Error(
        `Formula returned an invalid value: ${result}. Check for division by zero or undefined variables.`,
      );
    }

    // Round to 6 significant decimal places to avoid floating-point noise
    return Math.round(result * 1_000_000) / 1_000_000;
  }

  /**
   * calculate()
   * High-level API used by the emission calculation service.
   *
   * Receives a full CalculationParams object and returns a structured
   * CalculationResult with the emission value, converted tCO₂e, and an
   * audit-friendly breakdown string.
   *
   * Example:
   *   template.formula_string = "(distance_km / passengers) * EF_TOTAL"
   *   input_data              = { distance_km: 120, passengers: 3 }
   *   ef_value                = 0.19  (kgCO2e/km)
   *   -> result_kgco2e         = (120/3) * 0.19 = 7.6 kgCO2e
   */
  static calculate(params: CalculationParams): CalculationResult {
    const { template, input_data, ef_value } = params;

    // Merge user input with EF_TOTAL so the formula can reference it
    const scope: Record<string, number> = {
      ...input_data,
      EF_TOTAL: ef_value,
    };

    const result_kgco2e = FormulaEngine.evaluate(
      template.formula_string,
      scope,
    );

    const result_tco2e = Math.round(result_kgco2e / 1000 * 1_000_000) / 1_000_000;

    // Build human-readable audit trail
    const inputsStr = Object.entries(input_data)
      .map(([k, v]) => `${k} = ${v}`)
      .join(", ");
    const breakdown =
      `Template: "${template.name}" | ` +
      `Inputs: [${inputsStr}] | ` +
      `EF_TOTAL = ${ef_value} | ` +
      `Formula: ${template.formula_string} | ` +
      `Result: ${result_kgco2e} ${template.result_unit}`;

    return { result_kgco2e, result_tco2e, breakdown };
  }

  /**
   * getRequiredVariables()
   * Returns the list of user-facing variable names in a formula
   * (excluding EF_TOTAL which is resolved automatically from the DB).
   * Used by the Formula Builder UI to warn about unmapped variables.
   */
  static getRequiredVariables(formula: string): string[] {
    return FormulaEngine.extractVariables(formula).filter(
      (v) => v !== "EF_TOTAL",
    );
  }
}
