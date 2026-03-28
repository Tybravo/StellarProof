import { useMemo } from "react";

export interface ManifestKeyRow {
  id: string;
  key: string;
  value: string;
}

export interface ManifestKeyValidationResult {
  errors: Record<string, string | null>;
  hasDuplicates: boolean;
}

export function useDuplicateKeyValidation(
  rows: ManifestKeyRow[],
): ManifestKeyValidationResult {
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.key) continue;
      counts.set(row.key, (counts.get(row.key) ?? 0) + 1);
    }

    const errors: Record<string, string | null> = {};
    let hasDuplicates = false;

    for (const row of rows) {
      if (!row.key) {
        errors[row.id] = null;
        continue;
      }
      const isDuplicate = (counts.get(row.key) ?? 0) > 1;
      errors[row.id] = isDuplicate ? "Duplicate key. Keys must be unique." : null;
      if (isDuplicate) {
        hasDuplicates = true;
      }
    }

    return { errors, hasDuplicates };
  }, [rows]);
}
