import React from 'react';

const MobileControls = () => {
  const handleTouchStart = (direction) => {
    window.setMovement(direction, true);
  };
  
  const handleTouchEnd = (direction) => {
    window.setMovement(direction, false);
  };

  return (
    <div className="controls-overlay">
      <button
        className="control-btn"
        onTouchStart={() => handleTouchStart('forward')}
        onTouchEnd={() => handleTouchEnd('forward')}
      >
        ↑
      </button>
      <button
        className="control-btn"
        onTouchStart={() => handleTouchStart('left')}
        onTouchEnd={() => handleTouchEnd('left')}
      >
        ←
      </button>
      <button
        className="control-btn"
        onTouchStart={() => handleTouchStart('backward')}
        onTouchEnd={() => handleTouchEnd('backward')}
      >
        ↓
      </button>
      <button
        className="control-btn"
        onTouchStart={() => handleTouchStart('right')}
        onTouchEnd={() => handleTouchEnd('right')}
      >
        →
      </button>
    </div>
  );
};

export default MobileControls;

