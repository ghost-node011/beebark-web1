const PortfolioItem = require('../models/PortfolioItem');

// People cards show a photo of the person's work: their first portfolio image,
// otherwise their profile cover. Adds `cover` (or '') to each person.
async function withCovers(people) {
  const list = (people || []).filter(Boolean);
  const ids = list.map((p) => p._id);
  if (!ids.length) return list;
  const items = await PortfolioItem.aggregate([
    { $match: { user: { $in: ids }, 'images.0': { $exists: true } } },
    { $sort: { order: 1, createdAt: -1 } },
    { $group: { _id: '$user', image: { $first: { $arrayElemAt: ['$images', 0] } } } }
  ]);
  const byUser = new Map(items.map((i) => [String(i._id), i.image]));
  return list.map((p) => ({ ...p, cover: byUser.get(String(p._id)) || p.coverPhoto || '' }));
}

module.exports = { withCovers };
