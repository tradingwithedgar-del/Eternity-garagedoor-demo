"use client";

import { createContext, useContext, useState } from "react";

const Ctx = createContext<{ credits: number; setCredits: (n: number) => void }>({
  credits: 0,
  setCredits: () => {},
});

export function CreditsProvider({ initial, children }: { initial: number; children: React.ReactNode }) {
  const [credits, setCredits] = useState(initial);
  return <Ctx.Provider value={{ credits, setCredits }}>{children}</Ctx.Provider>;
}

export const useCredits = () => useContext(Ctx);
