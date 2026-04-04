function ZoomDock() {
  return (
    <div id="zoomDock" className="zoom-dock" aria-label="Zoom interface">
      <button id="zoomOutBtn" className="zoom-dock-btn" type="button" aria-label="Réduire le zoom">
        <span className="zoom-dock-symbol" aria-hidden="true">-</span>
      </button>
      <input
        id="zoomRange"
        className="zoom-dock-range"
        type="range"
        min="60"
        max="140"
        step="5"
        defaultValue="100"
        aria-label="Niveau de zoom"
      />
      <button id="zoomInBtn" className="zoom-dock-btn" type="button" aria-label="Augmenter le zoom">
        <i className="fa-solid fa-plus"></i>
      </button>
      <button id="zoomResetBtn" className="zoom-dock-percent" type="button" aria-label="Réinitialiser le zoom à 100%">
        <span id="zoomPercent">100 %</span>
      </button>
    </div>
  )
}

export default ZoomDock
