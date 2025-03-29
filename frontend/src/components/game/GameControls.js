import React, { useEffect } from 'react';

// Mobile-friendly game controls
const GameControls = ({ setControls }) => {
  const handleTouchStart = (control) => {
    setControls(prev => ({ ...prev, [control]: true }));
  };
  
  const handleTouchEnd = (control) => {
    setControls(prev => ({ ...prev, [control]: false }));
  };
  
  // Don't show controls on desktop
  const [isMobile, setIsMobile] = React.useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      // Simple mobile check
      const mobile = window.innerWidth <= 768 || 
                    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  if (!isMobile) return null;
  
  return (
    <div className="game-controls">
      <div className="steering-controls">
        <button 
          className="control-button control-left"
          onTouchStart={() => handleTouchStart('left')}
          onTouchEnd={() => handleTouchEnd('left')}
          onMouseDown={() => handleTouchStart('left')}
          onMouseUp={() => handleTouchEnd('left')}
          onMouseLeave={() => handleTouchEnd('left')}
        >
          ◀
        </button>
        <button 
          className="control-button control-right"
          onTouchStart={() => handleTouchStart('right')}
          onTouchEnd={() => handleTouchEnd('right')}
          onMouseDown={() => handleTouchStart('right')}
          onMouseUp={() => handleTouchEnd('right')}
          onMouseLeave={() => handleTouchEnd('right')}
        >
          ▶
        </button>
      </div>
      
      <div className="acceleration-controls">
        <button 
          className="control-button control-forward"
          onTouchStart={() => handleTouchStart('forward')}
          onTouchEnd={() => handleTouchEnd('forward')}
          onMouseDown={() => handleTouchStart('forward')}
          onMouseUp={() => handleTouchEnd('forward')}
          onMouseLeave={() => handleTouchEnd('forward')}
        >
          ▲
        </button>
        <button 
          className="control-button control-backward"
          onTouchStart={() => handleTouchStart('backward')}
          onTouchEnd={() => handleTouchEnd('backward')}
          onMouseDown={() => handleTouchStart('backward')}
          onMouseUp={() => handleTouchEnd('backward')}
          onMouseLeave={() => handleTouchEnd('backward')}
        >
          ▼
        </button>
      </div>
    </div>
  );
};

export default GameControls;
