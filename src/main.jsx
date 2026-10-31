import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Links from './components/Links.jsx'

// Se o endereço for oceamar.com.br/links, mostra a página de links.
// Em qualquer outro endereço, mostra a loja.
const paginaDeLinks = window.location.pathname === '/links'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {paginaDeLinks ? <Links /> : <App />}
  </StrictMode>,
)
