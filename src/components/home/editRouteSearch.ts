/**
 * Route search contract for `/pages/$pageId/edit`.
 *
 * The edit route's `validateSearch` returns always-present keys (with `| undefined`),
 * so under `exactOptionalPropertyTypes` every Link/navigate to that route must pass
 * `search`. This constant satisfies that requirement without touching the route
 * (pre-existing typing debt tracked as TD-002 in CRIPQER_TECH_DEBT_REGISTER.md).
 */
export const editRouteSearch = {
  directEditor: undefined,
  magicProduction: undefined,
  legacyEditor: undefined,
};

export default editRouteSearch;
