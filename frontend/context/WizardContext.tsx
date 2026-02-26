/**
 * Wizard state management using React Context.
 * Holds all data shared across wizard steps including file info,
 * hashes, manifest data, SPV encryption config, and results.
 *
 * @module context/WizardContext
 */
"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*                              Types                                 */
/* ------------------------------------------------------------------ */

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

export interface ManifestData {
  content: string;
  format: "json" | "xml";
  fileName: string;
  fileSize: number;
}

export interface SPVResult {
  encryptedHash: string;
  storageId: string;
}

export interface WizardState {
  /** Standard mode file metadata */
  file: FileInfo | null;
  /** SHA-256 hash of the uploaded content */
  contentHash: string | null;
  /** Hashing progress (0–100) */
  hashProgress: number;
  /** Whether hashing is in progress */
  isHashing: boolean;

  /** Manifest attachment data */
  manifest: ManifestData | null;
  /** SHA-256 hash of the manifest file content */
  manifestHash: string | null;

  /** Advanced mode: manually entered content hash */
  advancedContentHash: string | null;
  /** Advanced mode: manually entered manifest hash */
  advancedManifestHash: string | null;

  /** SPV encryption enabled flag */
  encryptionEnabled: boolean;

  /** SPV encryption results */
  spvResult: SPVResult | null;
}

/* ------------------------------------------------------------------ */
/*                        Actions / Reducer                           */
/* ------------------------------------------------------------------ */

type WizardAction =
  | { type: "SET_FILE"; payload: FileInfo | null }
  | { type: "SET_CONTENT_HASH"; payload: string | null }
  | { type: "SET_HASH_PROGRESS"; payload: number }
  | { type: "SET_IS_HASHING"; payload: boolean }
  | { type: "SET_MANIFEST"; payload: { manifest: ManifestData | null; hash: string | null } }
  | { type: "SET_ADVANCED_CONTENT_HASH"; payload: string | null }
  | { type: "SET_ADVANCED_MANIFEST_HASH"; payload: string | null }
  | { type: "SET_ENCRYPTION_ENABLED"; payload: boolean }
  | { type: "SET_SPV_RESULT"; payload: SPVResult | null }
  | { type: "RESET" };

const initialState: WizardState = {
  file: null,
  contentHash: null,
  hashProgress: 0,
  isHashing: false,
  manifest: null,
  manifestHash: null,
  advancedContentHash: null,
  advancedManifestHash: null,
  encryptionEnabled: true,
  spvResult: null,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_FILE":
      return { ...state, file: action.payload };
    case "SET_CONTENT_HASH":
      return { ...state, contentHash: action.payload };
    case "SET_HASH_PROGRESS":
      return { ...state, hashProgress: action.payload };
    case "SET_IS_HASHING":
      return { ...state, isHashing: action.payload };
    case "SET_MANIFEST":
      return {
        ...state,
        manifest: action.payload.manifest,
        manifestHash: action.payload.hash,
      };
    case "SET_ADVANCED_CONTENT_HASH":
      return { ...state, advancedContentHash: action.payload };
    case "SET_ADVANCED_MANIFEST_HASH":
      return { ...state, advancedManifestHash: action.payload };
    case "SET_ENCRYPTION_ENABLED":
      return { ...state, encryptionEnabled: action.payload };
    case "SET_SPV_RESULT":
      return { ...state, spvResult: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*                        Context & Provider                          */
/* ------------------------------------------------------------------ */

interface WizardContextValue {
  state: WizardState;
  setFile: (file: FileInfo | null) => void;
  setContentHash: (hash: string | null) => void;
  setHashProgress: (percent: number) => void;
  setIsHashing: (hashing: boolean) => void;
  setManifest: (manifest: ManifestData | null, hash: string | null) => void;
  setAdvancedContentHash: (hash: string | null) => void;
  setAdvancedManifestHash: (hash: string | null) => void;
  setEncryptionEnabled: (enabled: boolean) => void;
  setSPVResult: (result: SPVResult | null) => void;
  reset: () => void;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const setFile = useCallback(
    (file: FileInfo | null) => dispatch({ type: "SET_FILE", payload: file }),
    [],
  );
  const setContentHash = useCallback(
    (hash: string | null) => dispatch({ type: "SET_CONTENT_HASH", payload: hash }),
    [],
  );
  const setHashProgress = useCallback(
    (percent: number) => dispatch({ type: "SET_HASH_PROGRESS", payload: percent }),
    [],
  );
  const setIsHashing = useCallback(
    (hashing: boolean) => dispatch({ type: "SET_IS_HASHING", payload: hashing }),
    [],
  );
  const setManifest = useCallback(
    (manifest: ManifestData | null, hash: string | null) =>
      dispatch({ type: "SET_MANIFEST", payload: { manifest, hash } }),
    [],
  );
  const setAdvancedContentHash = useCallback(
    (hash: string | null) =>
      dispatch({ type: "SET_ADVANCED_CONTENT_HASH", payload: hash }),
    [],
  );
  const setAdvancedManifestHash = useCallback(
    (hash: string | null) =>
      dispatch({ type: "SET_ADVANCED_MANIFEST_HASH", payload: hash }),
    [],
  );
  const setEncryptionEnabled = useCallback(
    (enabled: boolean) =>
      dispatch({ type: "SET_ENCRYPTION_ENABLED", payload: enabled }),
    [],
  );
  const setSPVResult = useCallback(
    (result: SPVResult | null) =>
      dispatch({ type: "SET_SPV_RESULT", payload: result }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return (
    <WizardContext.Provider
      value={{
        state,
        setFile,
        setContentHash,
        setHashProgress,
        setIsHashing,
        setManifest,
        setAdvancedContentHash,
        setAdvancedManifestHash,
        setEncryptionEnabled,
        setSPVResult,
        reset,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

/**
 * Access the wizard context. Must be used within a `<WizardProvider>`.
 */
export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizard must be used within a <WizardProvider>");
  }
  return ctx;
}
