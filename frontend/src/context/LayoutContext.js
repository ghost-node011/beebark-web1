import { createContext, useContext } from 'react';

// True inside AppLayout, which draws the sidebar and top bar once for every
// signed-in page. Pages still render <Sidebar /> and <TopBar />; inside the
// layout those render nothing, so the frame isn't rebuilt on every click.
export const InLayoutContext = createContext(false);
export const useInLayout = () => useContext(InLayoutContext);
