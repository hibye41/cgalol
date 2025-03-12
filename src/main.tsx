import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import GamePage from './pages/GamePage.tsx'

// Create router with routes for the home page and game page
// The root path will render the home page
// The /game path will render the game page
// We also need to handle the redirect from Twitch, which will include a hash fragment
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />
  },
  {
    // This route will handle both the game page and the redirect from Twitch
    path: '*',
    element: <GamePage />
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
