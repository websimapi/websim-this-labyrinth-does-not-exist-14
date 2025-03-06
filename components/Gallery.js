import React from 'react';

const Gallery = ({ labyrinths, onExplore, isLoading }) => {
  // Sort labyrinths by creation date (newest first)
  const sortedLabyrinths = [...labyrinths].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div>
      <h2>Labyrinth Gallery</h2>
      <p>Explore unique labyrinths created by the community</p>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading labyrinths...</div>
        </div>
      ) : sortedLabyrinths.length === 0 ? (
        <div className="empty-gallery">
          <p>No labyrinths have been created yet. Be the first to create one!</p>
        </div>
      ) : (
        <div className="gallery-container">
          {sortedLabyrinths.map((labyrinth) => (
            <div 
              key={labyrinth.id} 
              className="labyrinth-card"
              onClick={() => onExplore(labyrinth)}
            >
              <img 
                src={labyrinth.previewImageUrl || 'https://via.placeholder.com/300x180?text=Labyrinth'} 
                alt={`Preview of ${labyrinth.theme} labyrinth`}
                className="labyrinth-image"
              />
              <div className="labyrinth-info">
                <h3 className="labyrinth-title">{labyrinth.theme}</h3>
                <div className="labyrinth-creator">Created by {labyrinth.username}</div>
                <p className="labyrinth-description">{labyrinth.description.substring(0, 100)}...</p>
                <div className="labyrinth-difficulty">Difficulty: {labyrinth.difficulty.charAt(0).toUpperCase() + labyrinth.difficulty.slice(1)}</div>
                {labyrinth.hasAudio && <div className="labyrinth-audio">♫ Has background music</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;

