import React from 'react';

const Header = ({ activeTab, onTabChange }) => {
  return (
    <header>
      <div className="logo">This Labyrinth Does Not Exist</div>
      <div className="nav-tabs">
        <div 
          className={`nav-tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => onTabChange('generate')}
        >
          Generate
        </div>
        <div 
          className={`nav-tab ${activeTab === 'gallery' ? 'active' : ''}`}
          onClick={() => onTabChange('gallery')}
        >
          Gallery
        </div>
      </div>
    </header>
  );
};

export default Header;

