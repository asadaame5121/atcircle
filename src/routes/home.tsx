import { Hono } from 'hono';
import { html } from 'hono/html';
import { getCookie } from 'hono/cookie';
import { Layout } from '../components/Layout';
import { Bindings } from '../types/bindings';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', (c) => {
  const token = getCookie(c, 'session');
  if (token) {
      return c.redirect('/dashboard');
  }
  return c.html(Layout({
    title: 'Webring Home',
    children: html`
      <div class="hero min-h-[50vh] bg-base-100 rounded-box shadow-xl">
        <div class="hero-content text-center">
          <div class="max-w-md">
            <h1 class="text-5xl font-bold text-primary">Welcome to the Webring</h1>
            <p class="py-6">Join the ring to discover amazing sites and connect with the community.</p>
            <a href="/login" class="btn btn-primary">Login with Bluesky</a>
          </div>
        </div>
      </div>
    `
  }));
});

export default app;
