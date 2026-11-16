const choice = value => Array.isArray(value) ? value[0] : value;
const integer = (value, fallback, maximum) => {
  if (value == null || (typeof value === 'string' && !value.trim()) || (typeof value !== 'number' && typeof value !== 'string')) return fallback;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= maximum ? number : fallback;
};

export function magazineSettings(source = {}) {
  const mode = choice(source.RecommendationMode);
  return {
    defaultBrowseView: choice(source.DefaultBrowseView) === 'collections' ? 'collections' : 'publication',
    recommendationMode: ['collections-and-tags', 'tags', 'none'].includes(mode) ? mode : 'collections-and-tags',
    recommendationCount: integer(source.RecommendationCount, 4, 12),
    collectionWeight: integer(source.RecommendationCollectionWeight, 2, 10),
    tagWeight: integer(source.RecommendationTagWeight, 1, 10),
  };
}
