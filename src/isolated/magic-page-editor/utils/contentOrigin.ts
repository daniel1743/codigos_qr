/**
 * Where a document's copy came from.
 *
 * The templates ship with a demo sample (`data/businessContent.ts` and
 * `data/images.ts`): the clinic copy the `business` template draws when nothing
 * else is declared. That sample belongs to the editor and to pages made by hand,
 * where the author replaces it slot by slot.
 *
 * A page generated from the conversational Business Context is a different case:
 * its copy is already in the document (`texts`, `props`), and the sample is not
 * its content but another business's. Such a document says so — the generator
 * writes `props.page.contentOrigin = 'business-context'` — and the hero then
 * draws the document's content plus an empty, explicitly defined state for every
 * slot the business has not filled.
 *
 * The key is read, never written, by the editor: no control sets it, so it
 * cannot be reached from the UI and cannot appear on a hand-made page. A document
 * that declares no origin resolves to exactly what it resolved to before, so
 * nothing already published moves.
 */
export const CONTENT_ORIGIN_KEY = 'contentOrigin';

/** The origin of every document produced by the conversational generator. */
export const BUSINESS_CONTEXT_ORIGIN = 'business-context';

/** True for a document whose content was generated from the Business Context. */
export function isBusinessContextContent(
  pageProps: Record<string, string> | undefined,
): boolean {
  return pageProps?.[CONTENT_ORIGIN_KEY] === BUSINESS_CONTEXT_ORIGIN;
}

/**
 * The sample a slot draws when the document declares nothing for it.
 *
 * A page made by hand keeps the template's own sample: that is the demo the
 * author replaces slot by slot, and it is what every page published before this
 * key existed must keep resolving to. A page generated from the Business Context
 * declares its content in the document, so a slot it never filled must draw
 * *nothing* rather than another business's sample.
 *
 * The templates call this instead of hardcoding the branch, so the switch has one
 * definition and the hero, the gallery and every later block cannot drift apart.
 */
export function sampleUnlessGenerated(
  pageProps: Record<string, string> | undefined,
  sample: string,
): string {
  return isBusinessContextContent(pageProps) ? '' : sample;
}
