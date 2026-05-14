import React, { useState } from 'react';

const CameraCalibration: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'calibrating' | 'success'>('idle');

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

  return (
    <div className="border border-yellow-200 rounded p-4 bg-yellow-50 mb-4">
      <h3 className="font-bold text-yellow-800 mb-2">Environment Calibration</h3>
      <p className="text-sm text-yellow-700 mb-4">
        Ensure the gymnast is standing still to establish a ground plane and camera perspective.
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
          <div className="flex items-center space-x-2" data-testid="calibration-success">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span className="text-green-800 font-semibold">Calibration Successful! Floor plane established.</span>
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-yellow-600 underline hover:text-yellow-800 self-start"
            data-testid="reset-calibration-btn"
          >
            Recalibrate
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraCalibration;
