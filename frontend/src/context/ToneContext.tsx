import { createContext, useContext } from "react";

export type ToneMode = "pro" | "bro" | "grl";

const ToneContext = createContext<ToneMode>("bro");

export const ToneProvider = ToneContext.Provider;

export function useToneMode(): ToneMode {
  return useContext(ToneContext);
}

export function useTxt() {
  const mode = useContext(ToneContext);
  return function t(pro: string, bro: string, grl?: string): string {
    if (mode === "bro") return bro;
    if (mode === "grl") return grl ?? bro;
    return pro;
  };
}
