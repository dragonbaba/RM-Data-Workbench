import { LeftPanel } from './LeftPanel';
import { MainContent } from './MainContent';

export function MainLayout() {
  return (
    <div className="flex h-full bg-dark-900">
      <LeftPanel />
      <MainContent />
    </div>
  );
}
