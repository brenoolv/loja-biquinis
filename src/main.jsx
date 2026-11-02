import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Links from './components/Links.jsx'
import Admin from './components/Admin.jsx'
import Privacidade from './components/Privacidade.jsx'
import Trocas from './components/Trocas.jsx'

// Cada endereço mostra uma tela. Qualquer outro endereço mostra a loja.
//   /links       -> página da bio do Instagram
//   /admin       -> painel da dona
//   /privacidade -> política de privacidade
//   /trocas      -> trocas e devoluções
const paginas = {
  '/links': <Links />,
  '/admin': <Admin />,
  '/privacidade': <Privacidade />,
  '/trocas': <Trocas />,
}

const pagina = paginas[window.location.pathname] ?? <App />

createRoot(document.getElementById('root')).render(
  <StrictMode>{pagina}</StrictMode>,
)
