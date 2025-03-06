import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import Header from './components/Header.js';
import Generator from './components/Generator.js';
import Gallery from './components/Gallery.js';
import Labyrinth from './components/Labyrinth.js';

const App = () => {
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedLabyrinth, setSelectedLabyrinth] = useState(null);
  const [labyrinths, setLabyrinths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const room = new WebsimSocket();

  useEffect(() => {
    // Get all existing labyrinths when component mounts
    fetchLabyrinths();
    
    // Subscribe to changes in the labyrinths collection
    const unsubscribe = room.collection('labyrinth').subscribe((updatedLabyrinths) => {
      setLabyrinths(updatedLabyrinths);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const fetchLabyrinths = async () => {
    try {
      const allLabyrinths = room.collection('labyrinth').getList();
      setLabyrinths(allLabyrinths);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching labyrinths:', error);
      setIsLoading(false);
    }
  };

  const handleCreateLabyrinth = async (newLabyrinth) => {
    setIsLoading(true);
    try {
      await room.collection('labyrinth').create(newLabyrinth);
      // Collection subscription will update the UI
      setActiveTab('gallery');
    } catch (error) {
      console.error('Error creating labyrinth:', error);
      setIsLoading(false);
    }
  };

  const handleExploreLabyrinth = (labyrinth) => {
    setSelectedLabyrinth(labyrinth);
    setActiveTab('explore');
  };

  const handleExitLabyrinth = () => {
    setSelectedLabyrinth(null);
    setActiveTab('gallery');
  };

  return (
    <div className="app-container">
      {activeTab !== 'explore' && (
        <Header activeTab={activeTab} onTabChange={setActiveTab} />
      )}
      
      <main>
        {activeTab === 'generate' && (
          <Generator onCreateLabyrinth={handleCreateLabyrinth} isLoading={isLoading} />
        )}
        
        {activeTab === 'gallery' && (
          <Gallery 
            labyrinths={labyrinths} 
            onExplore={handleExploreLabyrinth} 
            isLoading={isLoading} 
          />
        )}
        
        {activeTab === 'explore' && selectedLabyrinth && (
          <Labyrinth labyrinth={selectedLabyrinth} onExit={handleExitLabyrinth} />
        )}
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(<App />);

