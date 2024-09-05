
export default {
  async fetch(request) {
    return handleRequest(request);
  }
};

// Access password
const ACCESS_PASSWORD = 'YOUR ACCESS PASSWORD'.toLowerCase();

const BING_DOMAIN = 'https://www.bing.com';
const BING_API_PATH = '/HPImageArchive.aspx';

async function requestBing(indexPast, number, locale) {
  try {
    const params = new URLSearchParams({
      format: 'js',
      idx: indexPast,
      n: number,
      mkt: locale,
    });

    const res = await fetch(`${BING_DOMAIN}${BING_API_PATH}?${params.toString()}`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch Bing data: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching Bing API:", error);
    return null;
  }
}

async function fetchImage(url) {
  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch image: ${res.status}`);
    }

    const imageData = await res.arrayBuffer();
    return imageData;
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // If ACCESS_PASSWORD is not empty,try to match it
  if (ACCESS_PASSWORD) {
    if (!path.toLowerCase().startsWith(`/${ACCESS_PASSWORD}`)) {
      return new Response("Unauthorized access", { status: 401 });
    }
  }

  let locale = 'en-US';
  let indexPast = 0;
  let getImage = false;

  const regex = /\/get_image(?:_(?<locale>[a-zA-Z-]+)?)?(?:_(?<index>\d+))?\.jpeg/;
  const match = path.match(regex);

  if (match && match.groups) {
    locale = match.groups.locale || 'en-US';
    indexPast = match.groups.index ? parseInt(match.groups.index, 10) : 0;
    getImage = true;
  } else {
    const params = new URLSearchParams(url.search);
    locale = params.get('locale') || 'en-US';
    indexPast = parseInt(params.get('index_past'), 10) || 0;
    getImage = params.has('get_image');
  }

  const bingData = await requestBing(indexPast, 1, locale);

  if (!bingData || !bingData.images || !bingData.images[0] || !bingData.images[0].url) {
    return new Response("Failed to retrieve image data from Bing.", { status: 500 });
  }

  const imageUrl = `${BING_DOMAIN}${bingData.images[0].url}`;

  const responseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Method': '*',
  };

  const cacheHeaders = {
    'Cache-Control': 'public, max-age=86400',
    'Expires': new Date(Date.now() + 86400000).toUTCString(),
  };

  if (getImage) {
    const imageBytes = await fetchImage(imageUrl);
    
    if (!imageBytes) {
      return new Response("Failed to fetch image from Bing.", { status: 500 });
    }

    return new Response(imageBytes, {
      status: 200,
      headers: {
        ...responseHeaders,
        ...cacheHeaders,
        'Content-Type': 'image/jpeg',
      },
    });
  } else {
    return new Response(imageUrl, {
      status: 200,
      headers: {
        ...responseHeaders,
        ...cacheHeaders,
        'Content-Type': 'text/plain',
      },
    });
  }
}
