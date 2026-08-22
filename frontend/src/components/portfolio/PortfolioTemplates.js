import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export const THEME_META = [
  { key: 'grid', label: 'Grid', description: 'Clean masonry-style gallery' },
  { key: 'timeline', label: 'Timeline', description: 'Chronological, story-like' },
  { key: 'minimal', label: 'Minimal', description: 'Single column, text-forward' },
  { key: 'magazine', label: 'Magazine', description: 'Featured hero + grid' }
];

const ItemActions = ({ item, editable, onEdit, onDelete }) => {
  if (!editable) return null;
  return (
    <div className="flex gap-2 mt-3">
      <Button size="sm" variant="outline" onClick={() => onEdit(item)} className="flex items-center gap-1">
        <FiEdit2 className="w-3.5 h-3.5" />Edit
      </Button>
      <Button size="sm" variant="outline" onClick={() => onDelete(item)} className="flex items-center gap-1 text-red-600 hover:text-red-700">
        <FiTrash2 className="w-3.5 h-3.5" />Remove
      </Button>
    </div>
  );
};

const ItemTags = ({ tags }) => {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.map((t, i) => <Badge key={i} className="bg-gray-100 text-black text-xs">{t}</Badge>)}
    </div>
  );
};

const PortfolioHeader = ({ user, headline }) => {
  if (!user) return null;
  return (
    <div className="flex items-center gap-4 mb-8">
      <Avatar className="w-16 h-16">
        <AvatarImage src={user.profilePic} />
        <AvatarFallback className="bg-yellow-400 text-black text-xl font-bold">{user.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <div>
        <h1 className="text-2xl font-bold text-black">{user.name}</h1>
        <p className="text-gray-600">{headline || user.bio}</p>
      </div>
    </div>
  );
};

export const GridTemplate = ({ items, user, headline, editable, onEdit, onDelete }) => (
  <div>
    <PortfolioHeader user={user} headline={headline} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <Card key={item._id} className="shadow-md hover:shadow-xl transition overflow-hidden">
          {item.images?.[0] && (
            <img src={item.images[0]} alt={item.title} className="w-full h-48 object-cover" />
          )}
          <CardContent className="pt-4">
            <h3 className="font-bold text-black">{item.title}</h3>
            {item.description && <p className="text-sm text-gray-600 mt-1 line-clamp-3">{item.description}</p>}
            <ItemTags tags={item.tags} />
            <ItemActions item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export const TimelineTemplate = ({ items, user, headline, editable, onEdit, onDelete }) => (
  <div>
    <PortfolioHeader user={user} headline={headline} />
    <div className="relative border-l-2 border-yellow-300 pl-6 space-y-8 ml-2">
      {items.map((item) => (
        <div key={item._id} className="relative">
          <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-yellow-400 border-2 border-white shadow" />
          <Card className="shadow-md">
            <CardContent className="pt-4 flex flex-col sm:flex-row gap-4">
              {item.images?.[0] && (
                <img src={item.images[0]} alt={item.title} className="w-full sm:w-40 h-32 object-cover rounded-md shrink-0" />
              )}
              <div>
                <h3 className="font-bold text-black">{item.title}</h3>
                {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                <ItemTags tags={item.tags} />
                <ItemActions item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  </div>
);

export const MinimalTemplate = ({ items, user, headline, editable, onEdit, onDelete }) => (
  <div className="max-w-2xl mx-auto">
    <PortfolioHeader user={user} headline={headline} />
    <div className="space-y-6">
      {items.map((item) => (
        <div key={item._id} className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-bold text-black">{item.title}</h3>
          {item.description && <p className="text-gray-700 mt-1">{item.description}</p>}
          {item.images?.[0] && (
            <img src={item.images[0]} alt={item.title} className="w-full max-h-64 object-cover rounded-md mt-3" />
          )}
          <ItemTags tags={item.tags} />
          <ItemActions item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
    </div>
  </div>
);

export const MagazineTemplate = ({ items, user, headline, editable, onEdit, onDelete }) => {
  const [featured, ...rest] = items;
  return (
    <div>
      <PortfolioHeader user={user} headline={headline} />
      {featured && (
        <Card className="shadow-lg mb-6 overflow-hidden">
          {featured.images?.[0] && (
            <img src={featured.images[0]} alt={featured.title} className="w-full h-72 object-cover" />
          )}
          <CardContent className="pt-5">
            <h3 className="text-2xl font-bold text-black">{featured.title}</h3>
            {featured.description && <p className="text-gray-700 mt-2">{featured.description}</p>}
            <ItemTags tags={featured.tags} />
            <ItemActions item={featured} editable={editable} onEdit={onEdit} onDelete={onDelete} />
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {rest.map((item) => (
          <Card key={item._id} className="shadow-md overflow-hidden">
            {item.images?.[0] && (
              <img src={item.images[0]} alt={item.title} className="w-full h-40 object-cover" />
            )}
            <CardContent className="pt-4">
              <h3 className="font-bold text-black">{item.title}</h3>
              {item.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>}
              <ItemTags tags={item.tags} />
              <ItemActions item={item} editable={editable} onEdit={onEdit} onDelete={onDelete} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const TEMPLATES = {
  grid: GridTemplate,
  timeline: TimelineTemplate,
  minimal: MinimalTemplate,
  magazine: MagazineTemplate
};
