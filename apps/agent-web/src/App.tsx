import { useState } from 'react'
import { Button } from '@workspace/ui/components/button'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0L2.5 5.5L12 11L21.5 5.5L12 0Z"/>
                <path d="M2.5 8.5L12 14L21.5 8.5"/>
                <path d="M2.5 11.5L12 17L21.5 11.5"/>
              </svg>
            </div>
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg animate-spin" style={{animationDuration: '20s'}}>
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 5.5C14.8 4.1 13.6 3 12.1 3C10.6 3 9.4 4.1 9.2 5.5L3 7V9L9.2 7.5C9.4 8.9 10.6 10 12.1 10C13.6 10 14.8 8.9 15 7.5L21 9ZM12 13C8.7 13 6 15.7 6 19V22H18V19C18 15.7 15.3 13 12 13Z"/>
              </svg>
            </div>
          </div>

          <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Vite + React
          </h1>

          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            Fast, modern development with lightning-speed HMR
          </p>
        </div>

        {/* Counter Section */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xl backdrop-blur-sm">
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {count}
              </div>
              <p className="text-sm text-muted-foreground">
                Click counter
              </p>
            </div>

            <Button
              onClick={() => setCount((count) => count + 1)}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Count is {count}
            </Button>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Edit <code className="bg-muted px-2 py-1 rounded text-foreground font-mono">src/App.tsx</code> and save to test HMR
              </p>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="text-sm">
              Click on the Vite and React logos to learn more
            </span>
          </div>

          <div className="flex items-center justify-center space-x-6 text-xs text-muted-foreground">
            <a href="https://vitejs.dev" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors duration-200">
              Vite Docs
            </a>
            <span>•</span>
            <a href="https://react.dev" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors duration-200">
              React Docs
            </a>
            <span>•</span>
            <a href="https://tailwindcss.com" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors duration-200">
              Tailwind CSS
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App