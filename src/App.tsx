import React from 'react'

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">MAG_dev: Gymnastics Analysis Assistant</h1>
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to the Desktop-First Environment</h2>
          <p className="text-gray-700 mb-6">
            This is the initial scaffold for the local-first gymnastics video analysis application.
            From here, we will implement the 3-pass processing pipeline and local storage.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-blue-200 rounded p-4 bg-blue-50">
              <h3 className="font-bold text-blue-800">Pass 1: Auto-Clip</h3>
              <p className="text-sm text-blue-600 italic">Immediate motion detection and trimming.</p>
            </div>
            <div className="border border-green-200 rounded p-4 bg-green-50">
              <h3 className="font-bold text-green-800">Pass 2: Pose Analysis</h3>
              <p className="text-sm text-green-600 italic">Background skeletal tracking and COM extraction.</p>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-gray-200 text-gray-600 p-4 text-center text-sm">
        MAG_dev - Local-First Privacy-Compliant Analytics
      </footer>
    </div>
  )
}

export default App
