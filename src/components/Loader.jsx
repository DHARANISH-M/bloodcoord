import React from 'react';

const Loader = ({ size, className = '' }) => {
  const scale = size ? size / 100 : 1;
  const dimension = size || 100;

  return (
    <div className={`blood-loader-wrapper flex items-center justify-center p-4 ${className}`}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: dimension, height: dimension }}
      >
        <div
          className="blood-custom-loader"
          style={size ? { transform: `scale(${scale})`, transformOrigin: 'center center' } : {}}
        />
        <div className="blood-custom-loader2" />
      </div>
    </div>
  );
};

export default Loader;
