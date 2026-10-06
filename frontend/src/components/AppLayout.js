import React, { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BeeLoader from './BeeLoader';
import { InLayoutContext } from '../context/LayoutContext';
import { progress } from '../lib/progress';

// Shown in the content area (never over the sidebar or top bar) while a
// page's code is downloading; also drives the top progress bar.
export const ContentLoader = () => {
  useEffect(() => {
    progress.start();
    return () => progress.done();
  }, []);
  return (
    <div className="lg:ml-64 mt-16 flex min-h-[calc(100vh-4rem)] items-center justify-center p-8">
      <BeeLoader size="section" />
    </div>
  );
};

/** The signed-in app frame: sidebar and top bar stay mounted while pages change. */
const AppLayout = () => {
  const location = useLocation();
  // Each new page starts at the top, like a normal site
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  return (
    <>
      <Sidebar layout />
      <TopBar layout />
      <InLayoutContext.Provider value>
        <Suspense fallback={<ContentLoader />}>
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </Suspense>
      </InLayoutContext.Provider>
    </>
  );
};

export default AppLayout;
