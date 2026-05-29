import { LeftPanel } from './LeftPanel';
import { MainContent } from './MainContent';

export function MainLayout() {
  return (
    <div className="flex h-full min-w-0 min-h-0 overflow-hidden bg-dark-900">
      <LeftPanel />
      <MainContent />
    </div>
  );
}
