/**
 * Where the generation worker lives. Both values are injected at build time
 * from GitHub repository variables (see worker/README.md).
 *
 * When GENERATOR_URL is empty the app falls back to the offline preview
 * generator, so dev, tests and offline use all keep working with no keys.
 */
export const GENERATOR_URL = (import.meta.env.VITE_GENERATOR_URL ?? '').trim()
export const ACCESS_CODE = (import.meta.env.VITE_ACCESS_CODE ?? '').trim()

export const hasRealGenerator = () => GENERATOR_URL.length > 0
