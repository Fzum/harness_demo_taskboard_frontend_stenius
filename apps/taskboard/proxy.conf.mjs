// Dev-server proxy for `npm start` (angular.json: taskboard.architect.serve.options.proxyConfig).
// The app calls the backend on its own origin under /api; the dev server forwards those requests
// to the Taskboard backend. Set TASKBOARD_API_URL to use another backend, for example a stub.
const target = process.env.TASKBOARD_API_URL || 'http://localhost:8080';

export default {
  '/api': {
    target,
    changeOrigin: true,
  },
};
