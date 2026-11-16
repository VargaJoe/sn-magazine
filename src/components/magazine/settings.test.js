import { magazineSettings } from './settings';

const defaults = {
  defaultBrowseView: 'publication', recommendationMode: 'collections-and-tags',
  recommendationCount: 4, collectionWeight: 2, tagWeight: 1,
};

test('missing CMS settings default to publication order and bounded related-review recommendations', () => {
  expect(magazineSettings()).toEqual(defaults);
  expect(magazineSettings({})).toEqual(defaults);
});

test.each([
  ['collections', 'tags'],
  [['collections'], ['tags']],
])('normalizes scalar and OData Choice settings %#', (DefaultBrowseView, RecommendationMode) => {
  expect(magazineSettings({ DefaultBrowseView, RecommendationMode })).toEqual({
    ...defaults, defaultBrowseView: 'collections', recommendationMode: 'tags',
  });
});

test.each(['collections-and-tags', 'tags', 'none'])('retains the supported recommendation mode %s', RecommendationMode => {
  expect(magazineSettings({ RecommendationMode }).recommendationMode).toBe(RecommendationMode);
});

test.each([null, '', [], ['unsupported'], 'unsupported', {}, true])('uses defaults for invalid Choice settings %p', value => {
  expect(magazineSettings({ DefaultBrowseView: value, RecommendationMode: value })).toEqual(defaults);
});

test.each([0, '0'])('retains explicitly configured zero counts and weights (%p)', zero => {
  expect(magazineSettings({ RecommendationCount: zero, RecommendationCollectionWeight: zero, RecommendationTagWeight: zero })).toEqual({
    ...defaults, recommendationCount: 0, collectionWeight: 0, tagWeight: 0,
  });
});

test('accepts the upper bounds and integer strings without changing unrelated settings', () => {
  expect(magazineSettings({ DefaultBrowseView: ['collections'], RecommendationMode: ['none'],
    RecommendationCount: '12', RecommendationCollectionWeight: 10, RecommendationTagWeight: '10' })).toEqual({
    defaultBrowseView: 'collections', recommendationMode: 'none', recommendationCount: 12, collectionWeight: 10, tagWeight: 10,
  });
});

test.each([
  ['RecommendationCount', 'recommendationCount', 4, 13],
  ['RecommendationCollectionWeight', 'collectionWeight', 2, 11],
  ['RecommendationTagWeight', 'tagWeight', 1, 11],
])('rejects invalid %s values using its own default', (field, setting, fallback, aboveMaximum) => {
  [null, '', ' ', -1, aboveMaximum, 1.5, 'invalid', NaN, Infinity, true, [], {}, [0]].forEach(value => {
    expect(magazineSettings({ [field]: value })[setting]).toBe(fallback);
  });
});
