import React from 'react';
import { useSitePresentation } from '../../presentation/site-presentation-provider';
import { useSnStore } from '../store/sn-store';
import { CachedComponentsByZone } from '../utils/add-component';
import LeisureSimpleLayout from './page-leisure-simple';

// Structure comes from the manifest; geometry and appearance come from CSS.
// Existing React widgets still own their content and behavior.
export default function RepositoryLayout({ name }) {
  const presentation = useSitePresentation();
  const { context, widgets } = useSnStore();
  const layout = presentation?.layouts[name];
  if (!layout) return <LeisureSimpleLayout />;

  return (
    <div className={`sn-site-layout ${layout.className}`.trim()} data-sn-layout={name}>
      {layout.zones.map(zone => (
        <div key={zone.name} className={`sn-site-zone ${zone.className}`.trim()} data-sn-zone={zone.name}>
          <CachedComponentsByZone type="widgets" zone={zone.name} widgets={widgets} context={context} />
        </div>
      ))}
    </div>
  );
}
