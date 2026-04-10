import { Search } from 'lucide-react';
import './SearchBar.css';

const SearchBar = ({ onSearch }) => {
  return (
    <div className="search-container glass-panel">
      <Search size={18} className="search-icon" />
      <input 
        type="text" 
        className="search-input" 
        placeholder="Search IP, User, Hash, or Threat Type..." 
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;
