
interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter = ({ selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  const categories = ['All', 'Seating', 'Storage', 'Tables', 'Beds'];

  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-4 justify-center">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-300 cursor-pointer border-2"
            style={
              selectedCategory === category
                ? {
                    backgroundColor: 'var(--brand-primary)',
                    borderColor: 'var(--brand-primary)',
                    color: '#FEFAE0',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                  }
                : {
                    backgroundColor: '#FEFAE0',
                    borderColor: 'var(--brand-secondary)',
                    color: 'var(--brand-primary)',
                  }
            }
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
