import Sidebar from './Sidebar'
import SidebarToggle from './SidebarToggle'
import ContentArea from './ContentArea'
import ZoomDock from './ZoomDock'

function AppContent() {
  return (
    <div id="appContent" className="app-content" style={{ display: 'none' }}>
      <Sidebar />
      <SidebarToggle />
      <ContentArea />
      <ZoomDock />
    </div>
  )
}

export default AppContent
