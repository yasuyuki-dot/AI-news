import React from 'react';
import type { NewsCategory } from '../types';

interface CategoryFilterProps {
  selectedCategory: NewsCategory | 'すべて';
  onCategoryChange: (category: NewsCategory | 'すべて') => void;
}

const categories: Array<NewsCategory | 'すべて'> = [
  'すべて',
  '経済',
  '企業',
  '市場',
  'テクノロジー',
  '政治',
  'その他'
];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange
}) => {
  return (
    <div className="category-filter">
      <div className="category-buttons">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};