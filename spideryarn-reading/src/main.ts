import App from './App.svelte'
import './app.css'

const target = document.getElementById('app');
if (!target) {
  console.error('Failed to find mount element #app');
  throw new Error('Missing #app element');
}

const app = new App({ target });

export default app
