import React, { useState } from 'react';

const CameraCalibration: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'calibrating' | 'success' | 'bumped'>('idle');

  const handleCalibrate = () => {
    setStatus('calibrating');

    // Simulate a calibration process
    setTimeout(() => {
      setStatus('success');
    }, 2000);
  };

  const handleReset = () => {
    setStatus('idle');
  };

  const handleBump = () => {
    setStatus('bumped');
  };

  return (
    <div className={`border rounded p-4 mb-4 ${status === 'bumped' ? 'border-red-400 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
      <h3 className={`font-bold mb-2 ${status === 'bumped' ? 'text-red-800' : 'text-yellow-800'}`}>
        {status === 'bumped' ? 'Calibration Error' : 'Environment Calibration'}
      </h3>
      <p className={`text-sm mb-4 ${status === 'bumped' ? 'text-red-700' : 'text-yellow-700'}`}>
        {status === 'bumped'
          ? 'Camera movement detected! Metrics may be skewed. Please recalibrate.'
          : 'Ensure the gymnast is standing still to establish a ground plane and camera perspective.'}
      </p>

      {status === 'idle' && (
        <button
          onClick={handleCalibrate}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          data-testid="calibrate-floor-btn"
        >
          Calibrate Floor
        </button>
      )}

      {status === 'calibrating' && (
        <div className="flex items-center space-x-2" data-testid="calibrating-status">
          <div className="w-5 h-5 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-yellow-800 font-semibold">Estimating floor plane...</span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2" data-testid="calibration-success">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-green-800 font-semibold">Calibration Successful! Floor plane established.</span>
            </div>
            <button
              onClick={handleBump}
              className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded"
              data-testid="simulate-bump-btn"
            >
              Simulate Camera Bump
            </button>
          </div>
          <div className="text-xs text-blue-600 italic animate-pulse">Monitoring for movement...</div>
          <button
            onClick={handleReset}
            className="text-sm text-yellow-600 underline hover:text-yellow-800 self-start"
            data-testid="reset-calibration-btn"
          >
            Recalibrate
          </button>
        </div>
      )}

      {status === 'bumped' && (
        <div className="flex flex-col space-y-2" data-testid="calibration-bumped">
          <button
            onClick={handleReset}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 self-start font-bold"
            data-testid="recalibrate-alert-btn"
          >
            Recalibrate Now
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraCalibration;
