import React, { useState } from 'react';

const Generator = ({ onCreateLabyrinth, isLoading }) => {
  const [theme, setTheme] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileName, setAudioFileName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!theme.trim()) {
      alert('Please enter a theme for your labyrinth');
      return;
    }
    
    // Generate description based on theme using the LLM
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a creative labyrinth designer creating immersive 3D maze experiences.
          Generate a rich, detailed description of a labyrinth based on the theme "${theme}".
          Include 3-5 distinct biomes or areas within the labyrinth, each with unique characteristics.
          For each biome, describe the wall textures, lighting, and atmosphere.
          Keep the overall description under 300 words. 
          Format with a main description paragraph followed by bullet points for each biome.`
        }
      ]
    });
    
    const description = completion.content;
    
    // Generate preview image based on the theme
    let previewImageUrl = '';
    try {
      const result = await websim.imageGen({
        prompt: `A dramatic, atmospheric labyrinth based on the theme: ${theme}. Top-down perspective, intricate paths, atmospheric lighting.`,
        aspect_ratio: "1:1",
      });
      previewImageUrl = result.url;
    } catch (error) {
      console.error('Error generating preview image:', error);
      previewImageUrl = '';
    }
    
    // Upload audio file if provided
    let audioUrl = '';
    if (audioFile) {
      try {
        audioUrl = await websim.upload(audioFile);
      } catch (error) {
        console.error('Error uploading audio:', error);
      }
    }
    
    // Create labyrinth data
    const labyrinthData = {
      theme,
      difficulty,
      description,
      previewImageUrl,
      audioUrl,
      hasAudio: !!audioUrl,
      createdAt: new Date().toISOString(),
      biomes: extractBiomes(description),
      // Generate maze structure based on difficulty
      mazeStructure: generateMazeStructure(difficulty)
    };
    
    onCreateLabyrinth(labyrinthData);
  };
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/midi'];
      if (!validTypes.includes(file.type)) {
        alert('Please upload an MP3, WAV, or MIDI file');
        e.target.value = '';
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
        e.target.value = '';
        return;
      }
      
      setAudioFile(file);
      setAudioFileName(file.name);
    }
  };
  
  // Extract biomes from the description
  const extractBiomes = (description) => {
    // Simple extraction based on bullet points
    const biomeLines = description.split('\n').filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'));
    
    return biomeLines.map((line, index) => {
      // Remove bullet point and extract biome name (assumes format "• BiomeName: description")
      const cleanLine = line.replace(/^[•-]\s*/, '');
      const biomeName = cleanLine.split(':')[0] || `Biome ${index + 1}`;
      
      return {
        name: biomeName.trim(),
        description: cleanLine,
        index
      };
    });
  };
  
  // Generate maze structure based on difficulty
  const generateMazeStructure = (difficulty) => {
    let size;
    switch (difficulty) {
      case 'easy':
        size = { width: 10, height: 10 };
        break;
      case 'medium':
        size = { width: 15, height: 15 };
        break;
      case 'hard':
        size = { width: 20, height: 20 };
        break;
      case 'nightmare':
        size = { width: 25, height: 25 };
        break;
      default:
        size = { width: 15, height: 15 };
    }
    
    // Generate a simple maze structure
    return generateSimpleMaze(size.width, size.height);
  };
  
  // Simple maze generation algorithm (using recursive backtracking)
  const generateSimpleMaze = (width, height) => {
    // Initialize the grid with walls
    const grid = Array(height).fill().map(() => Array(width).fill(1));
    
    const startX = 1;
    const startY = 1;
    
    // Set the start position as a path
    grid[startY][startX] = 0;
    
    // Define directions: [x, y]
    const directions = [
      [0, -2], // up
      [2, 0],  // right
      [0, 2],  // down
      [-2, 0]  // left
    ];
    
    const carve = (x, y) => {
      // Randomize directions
      const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);
      
      // Try each direction
      for (const [dx, dy] of shuffledDirections) {
        const nx = x + dx;
        const ny = y + dy;
        
        // Check if we can carve in this direction
        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && grid[ny][nx] === 1) {
          // Carve the connecting wall
          grid[y + dy/2][x + dx/2] = 0;
          // Carve the destination cell
          grid[ny][nx] = 0;
          // Continue carving from the new position
          carve(nx, ny);
        }
      }
    };
    
    // Start carving
    carve(startX, startY);
    
    // Ensure exit at the far corner
    const exitX = width - 2;
    const exitY = height - 2;
    grid[exitY][exitX] = 0;
    
    // Ensure there's a path to the exit
    let current = [exitX, exitY];
    let attempts = 0;
    const maxAttempts = 100;
    
    while (grid[current[1]][current[0]] === 0 && attempts < maxAttempts) {
      attempts++;
      const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);
      
      for (const [dx, dy] of shuffledDirections) {
        const nx = current[0] + dx/2;
        const ny = current[1] + dy/2;
        
        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1) {
          grid[ny][nx] = 0;
          current = [current[0] + dx, current[1] + dy];
          break;
        }
      }
    }
    
    return {
      grid,
      width,
      height,
      start: { x: startX, y: startY },
      end: { x: exitX, y: exitY }
    };
  };

  return (
    <div className="generator-form">
      <h2>Create a New Labyrinth</h2>
      <p>Enter a theme and customize your labyrinth settings</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="theme">Theme</label>
          <input
            type="text"
            id="theme"
            placeholder="e.g., Ancient Ruins, Cosmic Horror, Enchanted Forest"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Difficulty</label>
          <div className="difficulty-options">
            <div 
              className={`difficulty-option ${difficulty === 'easy' ? 'selected' : ''}`}
              onClick={() => setDifficulty('easy')}
            >
              Easy
            </div>
            <div 
              className={`difficulty-option ${difficulty === 'medium' ? 'selected' : ''}`}
              onClick={() => setDifficulty('medium')}
            >
              Medium
            </div>
            <div 
              className={`difficulty-option ${difficulty === 'hard' ? 'selected' : ''}`}
              onClick={() => setDifficulty('hard')}
            >
              Hard
            </div>
            <div 
              className={`difficulty-option ${difficulty === 'nightmare' ? 'selected' : ''}`}
              onClick={() => setDifficulty('nightmare')}
            >
              Nightmare
            </div>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="audio">Background Music (optional)</label>
          <div className="file-upload">
            <input
              type="file"
              id="audio"
              accept="audio/mpeg,audio/wav,audio/midi"
              onChange={handleFileChange}
            />
            <div className="file-upload-info">
              {audioFileName ? audioFileName : 'Upload MP3, WAV, or MIDI (max 10MB)'}
            </div>
          </div>
        </div>
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Labyrinth'}
        </button>
      </form>
      
      {isLoading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Creating your labyrinth...</div>
        </div>
      )}
    </div>
  );
};

export default Generator;

