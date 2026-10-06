import axios from 'axios';

// Shared "something is loading" counter behind the top progress bar.
// Requests and lazy pages call start()/done(); background polls pass
// `silent: true` in their axios config so they never flash the bar.
let active = 0;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(active));

export const progress = {
  start() { active += 1; emit(); },
  done() { active = Math.max(0, active - 1); emit(); },
  subscribe(fn) { listeners.add(fn); fn(active); return () => listeners.delete(fn); }
};

let installed = false;
export function installAxiosProgress() {
  if (installed) return;
  installed = true;
  axios.interceptors.request.use((config) => {
    if (!config.silent) {
      config.__progress = true;
      progress.start();
    }
    return config;
  });
  const finish = (config) => { if (config?.__progress) { config.__progress = false; progress.done(); } };
  axios.interceptors.response.use(
    (res) => { finish(res.config); return res; },
    (err) => { finish(err.config); return Promise.reject(err); }
  );
}
