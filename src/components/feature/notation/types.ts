export type NotationType = 'stress' | 'linking' | 'reduction' | 'elision';

export interface SentenceFormatting {
  stress?: number[]; // indices of stressed tokens
  linking?: [number, number][]; // pairs of indices [i, i+1]
  reduction?: number[];
  elision?: number[];
}
