/**
 * Purpose: Web document head — favicon, PWA icons, theme for home-screen shortcuts.
 * Module: app routing (Expo Router static web)
 */
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const THEME_COLOR = '#34ABA5';

const PWA_BASE_STYLES = `
  html, body, #root {
    height: 100%;
    min-height: 100dvh;
    max-height: 100dvh;
    margin: 0;
    padding: 0;
  }
  body {
    overflow: hidden;
    overscroll-behavior: none;
    background-color: ${THEME_COLOR};
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  input,
  textarea,
  [contenteditable="true"] {
    -webkit-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
  }
  [data-touch-surface="true"] {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    touch-action: none;
    cursor: pointer;
  }
  #root {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    overflow: hidden;
  }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, interactive-widget=resizes-visual"
        />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={THEME_COLOR} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RESPIRA+" />
        <style dangerouslySetInnerHTML={{ __html: PWA_BASE_STYLES }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
