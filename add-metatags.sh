#!/bin/bash
INDEX="dist/index.html"
[ ! -f "$INDEX" ] && echo "❌ dist/index.html fehlt" && exit 1
cp "$INDEX" "${INDEX}.backup"
EXSCRIPT=$(grep 'script src=' "$INDEX" | head -1)
cat > "$INDEX" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
  <title>nickradar — digital connecting tool for live events</title>
  <meta name="description" content="nickradar — digital connecting tool for live events. guests connect anonymously using nickname stickers. no algorithm, no swiping.">
  <meta name="keywords" content="nickradar, connecting tool, nickname sticker, live events, austria, anonymous, no swiping">
  <meta name="author" content="nickradar">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://app.nickradar.com">
  <meta property="og:type" content="website">
  <meta property="og:title" content="nickradar — digital connecting tool for live events">
  <meta property="og:description" content="digital connecting tool for live events. guests connect anonymously using nickname stickers.">
  <meta property="og:url" content="https://app.nickradar.com">
  <meta property="og:site_name" content="nickradar">
  <meta property="og:image" content="https://app.nickradar.com/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="nickradar - digital connecting tool for live events">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="nickradar — digital connecting tool for live events">
  <meta name="twitter:description" content="digital connecting tool for live events. guests connect anonymously using nickname stickers.">
  <meta name="twitter:image" content="https://app.nickradar.com/og-image.png">
  <meta name="theme-color" content="#000000">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
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
HTMLEOF
echo "  ${EXSCRIPT}" >> "$INDEX"
echo '  <script>if("serviceWorker" in navigator){navigator.serviceWorker.register("/service-worker.js").catch(function(e){console.log("SW failed",e)})}</script>' >> "$INDEX"
echo '  <script defer src="https://analytics.nickradar.com/script.js" data-website-id="80e78d8a-2a7b-42d5-bd4f-a0a60d410cc4"></script>' >> "$INDEX"
echo '</body></html>' >> "$INDEX"
[ -f "web/service-worker.js" ] && cp web/service-worker.js dist/service-worker.js
echo "✅ Metatags + Umami OK"
