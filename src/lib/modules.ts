/**
 * Stage labels and mantras for the six Pivvot tools, matched to the co::Lab
 * landing page so the language is identical wherever a framer meets it.
 */

export type ModuleMeta = {
  stage: string;
  mantra: string;
};

export const MODULE_META: Record<number, ModuleMeta> = {
  1: { stage: "Stage 1 · Problem", mantra: "Move the Finish Line!" },
  2: { stage: "Stage 2 · Potential", mantra: "Become a Hero-Maker!" },
  3: { stage: "Stage 3 · Pathway", mantra: "Build a Training Center!" },
  4: { stage: "Stage 4 · People", mantra: "Empower Each One!" },
  5: { stage: "Stage 5 · Portal", mantra: "Design the Culture!" },
  6: { stage: "Stage 6 · Picture", mantra: "Create the Future!" },
};

/** True for the six numbered process modules, false for the extra folders. */
export function isProcessModule(order: number): boolean {
  return order >= 1 && order <= 6;
}

/** "2 - Crowd Cloud" -> "Crowd Cloud" */
export function stripModuleNumber(name: string): string {
  return name.replace(/^\s*\d+\s*-\s*/, "");
}
