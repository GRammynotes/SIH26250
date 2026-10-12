@'
import './app.css';
import './lib/theme/tactical.css';
import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, { target: document.getElementById('app')! });

export default app;
'@ | Out-File -Encoding utf8 src\main.ts