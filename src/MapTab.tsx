import './MapTab.css'
import logo from '/osmtree.svg' // also favicon

const MapTab = ({switchToAttributes}) => {
    return (
        <div className="map">
            <a className="title">
                <img src={logo} className="logo" alt="osmtree" />
                osmtree
            </a>
            <button onClick={switchToAttributes}>Attributs</button>
        </div>
    )
}

export default MapTab
