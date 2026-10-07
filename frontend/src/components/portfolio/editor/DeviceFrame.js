import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Copies the page's stylesheets into the frame and keeps them in step
// (the dev server swaps <style> tags as code changes).
const syncStyles = (doc) => {
  doc.head.querySelectorAll('[data-copied-style]').forEach((n) => n.remove());
  document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    const copy = node.cloneNode(true);
    copy.setAttribute('data-copied-style', '');
    doc.head.appendChild(copy);
  });
};

/**
 * A ~390px phone screen. The template renders inside an iframe so its
 * responsive (sm:/lg:) styles respond to the phone width, not the window.
 */
const DeviceFrame = ({ children, width = 390, height = 780 }) => {
  const frameRef = useRef(null);
  const [mountNode, setMountNode] = useState(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    let observer;
    const setup = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      const existing = doc.getElementById('device-root');
      if (existing) { setMountNode(existing); return; }
      const base = doc.createElement('base');
      base.href = document.baseURI;
      const meta = doc.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1';
      doc.head.append(base, meta);
      syncStyles(doc);
      doc.body.style.margin = '0';
      const root = doc.createElement('div');
      root.id = 'device-root';
      doc.body.appendChild(root);
      observer?.disconnect();
      observer = new MutationObserver(() => syncStyles(doc));
      observer.observe(document.head, { childList: true });
      setMountNode(root);
    };
    // about:blank is usually ready at once; some browsers swap the document on load, so set up again then
    if (frame.contentDocument?.readyState === 'complete') setup();
    frame.addEventListener('load', setup);
    return () => { observer?.disconnect(); frame.removeEventListener('load', setup); };
  }, []);

  return (
    <div className="flex justify-center py-2" data-testid="pf-device-frame">
      <div className="rounded-[2.5rem] border border-gray-300 bg-black p-3 shadow-xl" style={{ width: width + 24, maxWidth: '100%' }}>
        <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-gray-700" aria-hidden="true" />
        <iframe
          ref={frameRef}
          title="Phone preview"
          className="block w-full rounded-[1.75rem] bg-white"
          style={{ height, maxHeight: '75vh', border: 0 }}
        />
        {mountNode && createPortal(children, mountNode)}
      </div>
    </div>
  );
};

export default DeviceFrame;
