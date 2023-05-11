// Get data from url params
const urlParams = new URLSearchParams(window.location.search);

const apiHost = urlParams.get('host') || urlParams.get('apiHost');
const baseHost = apiHost || 'https://api.new.preprod.letu.ru';
const pushSite = urlParams.get('pushSite') || 'apiMobileRU';
const skuId = urlParams.get('skuId') || null;
const preselectPointId = urlParams.get('preselectPointId');
const startedLat = urlParams.get('lat');
const startedLon = urlParams.get('lon');
const defaultZoom = urlParams.get('zoom');
const hasAnimationOnMove = urlParams.get('hasAnimationOnMove');
const orderId = urlParams.get('orderId');
const cityId = urlParams.get('cityId');

let type = urlParams.get('type'); // Type of map - 'store' | 'pointOfIssue' | 'all'

if (type !== 'store' && type !== 'pointOfIssue' && type !== 'all') {
  type = 'all'
}

// Global settings
const globalSettings = {
  scriptSrc: `https://api-maps.yandex.ru/2.1/?apiKey="949cd34d-e616-40f7-aa2b-b8024b7bb4b0"&lang=ru_RU&onload=yandexMapsAPILoad`,
  map: {
    apiUrl: '/s/api/geo/v2/map/locations',
    lat: startedLat || 55.75396,
    lon: startedLon || 37.620393,
    zoom: defaultZoom || 15,
    zoomDurationMs: 250,
  },
};

const isStoreType = type === 'store';

// Is iOS device
const iOSDevice = (/iPad|iPhone|iPod/.test(navigator.userAgent))
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Yandex Map default params
const pointsApiUrl = baseHost + globalSettings.map.apiUrl;

const zoom = globalSettings.map.zoom;
const lat = globalSettings.map.lat;
const lon = globalSettings.map.lon;
const zoomDurationMs = globalSettings.map.zoomDurationMs;
const marginBottomMobileOverlay = iOSDevice ? 200 : 150;

let mapInstance = null;
let objectManager = null;
let ymaps = null;
let userLocationCollection = null;
let selectedId, initialSelectedId = urlParams.get('selectedId');

const minZoom = iOSDevice ? 3 : 10;
const maxZoom = iOSDevice ? 21 : 19;
const isMaxMapZoom = () => mapInstance.getZoom() == maxZoom;
const isMinMapZoom = () => mapInstance.getZoom() == minZoom;
const iconImageCoords = {
  size: {
      big: [54, 62],
      small: [27, 31],
  },
  offset: {
      big: [-36, -76],
      small: [-23, -48],
  }
}

// Store filters
const storeFilters = [
  'storeWithStocksInStore',
  'storeWithStocksInStoreSelected',
  'storeWithStocksFromHub',
  'storeWithStocksFromHubSelected',
  'storeWithoutStocks',
  'storeWithoutStocksSelected',
];

// Map pins
const userPositionPin = 'pin-user-position.svg'
const mapPins = {
  pointPickPoint: {
    normal: 'pick-point.svg',
    selected: 'pick-point.svg',
  },
  pointRussianPost: {
    normal: 'russian-post.svg',
    selected: 'russian-post.svg',
  },
  pointPodrygka: {
    normal: 'podrygka.svg',
    selected: 'podrygka.svg',
  },
  pointFivePost: {
    normal: '5post.svg',
    selected: '5post.svg',
  },
  store: {
    normal: 'marker-shop1.svg',
    selected: 'marker-shop1.svg'
  },
};

// Actions to communicate with the mobile apps
const actions = {
  didTapOnPoint: 'didTapOnPoint',
  didTapOnMap: 'didTapOnMap',
  didTapOnCluster: 'didTapOnCluster',
  zoomIn: 'zoomIn',
  zoomOut: 'zoomOut',
  setZoomDefault: 'setZoomDefault',
  setZoom: 'setZoom',
  addUserPositionPin: 'addUserPositionPin',
  removeUserPositionPin: 'removeUserPositionPin',
  move: 'move',
  applyFilters: 'applyFilters',
  selectPoint: 'selectPoint',
  unselectPoints: 'unselectPoints',
}