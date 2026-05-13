import React, { useState } from 'react';

const CaptureGuidelines: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mb-4 ml-4"
        data-testid="capture-guidelines-btn"
      >
        View Capture Guidelines
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2">Optimal Capture Guidelines</h2>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="bg-blue-100 p-3 rounded-full h-12 w-12 flex items-center justify-center text-xl">📷</div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Tripod Use is Essential</h3>
                  <p className="text-gray-600">Always use a tripod or stable mount. Stable footage is critical for accurate side-by-side comparisons and trajectory tracing.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-blue-100 p-3 rounded-full h-12 w-12 flex items-center justify-center text-xl">📐</div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Side-Angle Capture</h3>
                  <p className="text-gray-600">Position the camera perfectly perpendicular to the motion. This is especially critical for landing analysis and profile views of rotation.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-blue-100 p-3 rounded-full h-12 w-12 flex items-center justify-center text-xl">💡</div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Proper Lighting</h3>
                  <p className="text-gray-600">Ensure the gymnast is well-lit and clearly separated from the background. Avoid capturing with strong backlighting (like pointing the camera directly at a window).</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-blue-100 p-3 rounded-full h-12 w-12 flex items-center justify-center text-xl">⚙️</div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Camera Settings</h3>
                  <p className="text-gray-600">Use slow-motion recording modes (60fps or higher) when available to reduce motion blur. Ensure minimum resolution is at least 1080p.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-gray-900"
                data-testid="close-guidelines-btn"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CaptureGuidelines;
