import { Capacitor } from '@capacitor/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { reloadWhenANewVersionIsOut } from './lib/newVersion.ts'

// On an iPhone or iPad the website is drawn under the status bar and the Dynamic Island: tell the page to use the whole screen (so the phone
// reports its safe areas) and leave that space free (see ".ios-app" in index.css). Only there: Android and the browser lay out as before.
if (Capacitor.getPlatform() === 'ios') {
  document.documentElement.classList.add('ios-app')
  // No pinch or automatic zoom: a screen that zooms (iOS does it by itself when a text box is tapped) leaves the app bigger than the phone.
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

reloadWhenANewVersionIsOut()
