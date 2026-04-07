#!/bin/bash
INDEX="dist/index.html"
[ ! -f "$INDEX" ] && echo "❌ dist/index.html fehlt" && exit 1
cp "$INDEX" "${INDEX}.backup"
SCRIPT=$(grep '<script src="/_expo' "$INDEX")
cat > "$INDEX" << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
  
  <title>nickradar — real world contacting</title>
  
  <meta name="description" content="nickradar — contact people you see in real life. you see a nickname, you type it, you try. no algorithm, no swiping. real encounters first, digital second.">
  
  <meta name="keywords" content="nickradar, contacting app, nickname, real life, real world connections, austria">
  
  <meta name="author" content="nickradar">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://app.nickradar.com">
  
  <meta property="og:type" content="website">
  <meta property="og:title" content="nickradar — real world contacting">
  <meta property="og:description" content="you see someone. you see their nickname. you try. no algorithm, no swiping. only the moment counts.">
  <meta property="og:url" content="https://app.nickradar.com">
  <meta property="og:site_name" content="nickradar">
  <meta property="og:locale" content="en">
  <meta property="og:image" content="https://app.nickradar.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="nickradar - real world contacting">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="nickradar — real world contacting">
  <meta name="twitter:description" content="you see someone. you see their nickname. you try. real life first, digital second.">
  <meta name="twitter:image" content="https://app.nickradar.com/og-image.png">
  <meta name="twitter:image:alt" content="nickradar - real world contacting">
  
  <meta name="theme-color" content="#000000">
  <link rel="manifest" href="/manifest.json">
  
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  
  <style>
    @font-face {
      font-family: 'ShareTechMono';
      src: url('/ShareTechMono.woff2') format('woff2');
      font-weight: normal;
      font-style: normal;
    }
  </style>
  <style id="expo-reset">html,body{height:100%}body{overflow:hidden}#root{display:flex;height:100%;flex:1}</style>
</head>
<body>
  <noscript>You need to enable JavaScript to run this app.</noscript>
  <div id="root"></div>
HTML
echo "  $SCRIPT" >> "$INDEX"
echo "  <script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/service-worker.js').catch(e=>console.log('SW failed',e))}</script>" >> "$INDEX"
echo "  <script defer src=\"https://analytics.nickradar.com/script.js\" data-website-id=\"80e78d8a-2a7b-42d5-bd4f-a0a60d410cc4\"></script>" >> "$INDEX"
echo "</body></html>" >> "$INDEX"
echo "✅ Metatags + OG Image + Apple Icons + Service Worker OK"
cp web/service-worker.js dist/service-worker.js
