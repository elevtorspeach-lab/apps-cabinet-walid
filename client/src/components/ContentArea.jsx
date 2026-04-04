import DashboardSection from './sections/DashboardSection'
import AudienceSection from './sections/AudienceSection'
import DiligenceSection from './sections/DiligenceSection'
import SalleSection from './sections/SalleSection'
import EquipeSection from './sections/EquipeSection'
import ClientSection from './sections/ClientSection'
import CreationSection from './sections/CreationSection'
import SuiviSection from './sections/SuiviSection'
import RecycleSection from './sections/RecycleSection'

function ContentArea() {
  return (
    <div id="contentArea" className="content">
      <div id="contentZoomViewport" className="content-zoom-viewport">
        <DashboardSection />
        <AudienceSection />
        <DiligenceSection />
        <SalleSection />
        <EquipeSection />
        <ClientSection />
        <CreationSection />
        <SuiviSection />
        <RecycleSection />
      </div>
    </div>
  )
}

export default ContentArea
