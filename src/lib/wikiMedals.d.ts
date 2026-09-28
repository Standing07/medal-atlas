export interface MedalRow {
  code: string
  gold: number
  silver: number
  bronze: number
  host?: boolean
  name?: string
  disputed?: boolean
}
export function findMedalsBlock(wikitext: string): string | null
export function parseMedalsTable(wikitext: string): { rows: MedalRow[]; host: string[] } | null
export function parseWikitableMedals(wikitext: string): { rows: MedalRow[]; host: string[] } | null
export function sortRows<T extends MedalRow>(rows: T[]): T[]
export function totals(rows: MedalRow[]): { gold: number; silver: number; bronze: number }
export function parseCumulative(wikitext: string): number[] | null
