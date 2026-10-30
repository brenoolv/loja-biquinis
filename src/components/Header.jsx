import './Header.css'

export default function Header() {
    return (
        <header className="topo">
            <a href="#inicio" className="logo">
                OCEAMAR
            </a>
            <nav className="menu">
                <a href="#colecao">Coleção</a>
                <a href="#diferenciais">Diferenciais</a>
                <a href="#contato">Contato</a>
            </nav>
        </header>
    )
}