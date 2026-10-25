// Just enough of node:fs for the tests that check files under public/ (the app never uses it).
declare module 'node:fs' {
  export function existsSync(path: string): boolean
  export function readFileSync(path: string, encoding: 'utf8'): string
  export function readdirSync(path: string, options: { recursive: true }): string[]
  export function statSync(path: string): { size: number; isFile(): boolean }
}
