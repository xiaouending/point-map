// Get data from url params
const urlParams = new URLSearchParams(window.location.search);

const apiHost = urlParams.get('host') || urlParams.get('apiHost');
const baseHost = apiHost || 'https://api.new.preprod.letu.ru';
const pushSite = urlParams.get('pushSite') || 'apiMobileRU';
const skuId = urlParams.get('skuId') || null;
const defaultZoom = urlParams.get('zoom');
const hasAnimationOnMove = urlParams.get('hasAnimationOnMove');
const orderId = urlParams.get('orderId');
const cityId = urlParams.get('cityId');
const animationDurationMs = urlParams.get('animationDurationMs');
const userLat = urlParams.get('userLat');
const userLon = urlParams.get('userLon');

let selectedId = urlParams.get('selectedId');
let mapStartLat = urlParams.get('mapStartLat');
let mapStartLon = urlParams.get('mapStartLon');

let type = urlParams.get('type'); // Type of map - 'store' | 'pointOfIssue' | 'all'

if (type !== 'store' && type !== 'pointOfIssue' && type !== 'all') {
  type = 'store'
}

// Global settings
const globalSettings = {
  scriptSrc: `https://api-maps.yandex.ru/2.1.79/?apiKey="949cd34d-e616-40f7-aa2b-b8024b7bb4b0"&lang=ru_RU&onload=yandexMapsAPILoad`,
  map: {
    apiUrl: '/s/api/geo/v2/map/locations',
    mapStartLat: mapStartLat || 55.75396,
    mapStartLon: mapStartLon || 37.620393,
    zoom: defaultZoom || 15,
    animationDurationMs: animationDurationMs || 300,
    defaultMargin: 70,
  },
};

const isStoreType = type === 'store';

// Is iOS device
const iOSDevice = (/iPad|iPhone|iPod/.test(navigator.userAgent))
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Yandex Map default params
const pointsApiUrl = baseHost + globalSettings.map.apiUrl;

const zoom = globalSettings.map.zoom;
const animationDuration = globalSettings.map.animationDurationMs;

let mapInstance = null;
let objectManager = null;
let ymaps = null;
let userLocationCollection = null;

const minZoom = 12;
const maxZoom = 19;
const isMaxMapZoom = () => mapInstance.getZoom() == maxZoom;
const isMinMapZoom = () => mapInstance.getZoom() == minZoom;

mapStartLat = globalSettings.map.mapStartLat;
mapStartLon = globalSettings.map.mapStartLon;

const MAP_BOUNDSCHANGE_THROTTLE_MS = 1500;
let activeCityId = cityId;

// Map pins
const userPositionPin = 'pin-user-position.svg';

// Actions to communicate with the mobile apps
const actions = {
  didTapOnPoint: 'didTapOnPoint',
  didTapOnMap: 'didTapOnMap',
  didTapOnCluster: 'didTapOnCluster',
  didChangeCityOnMap: 'didChangeCityOnMap',
}

const placemarks = {
  templates: {
    cluster:
      '<div class="map-cluster-icon">{{ number }}</div>',
    pointOfIssue: `<div
                      class="map-point-icon
                      map-point-icon--point-of-issue-type
                      map-point-icon--[isSelected]"
                  >
                    <img class="map-point-icon-image" src='[imagePath]' />
                  </div>`,
    store: `<div
                class="map-point-icon
                map-point-icon--store-type
                map-point-icon--[isSelected]"
                data-availability-type='$[pointInfo.deliveryInfo.availabilityType]'"
            />`,
  },
  iconShapes: {
    pointOfIssue: {
      type: 'Circle',
      coordinates: [19, 19],
      radius: 19,
    },
    store: {
      type: 'Circle',
      coordinates: [14, 14],
      radius: 14,
    },
    pointSelected: {
      type: 'Circle',
      coordinates: [25, 25],
      radius: 25,
    },
    cluster: {
      type: 'Circle',
      coordinates: [20, 20],
      radius: 20,
    },
  },
  pointOfIssuePresets: [
    'pointPickPoint',
    'pointRussianPost',
    'pointPodrygka',
    'pointFivePost',
  ],
  storePresets: [
    'store',
    'storeWithStocksInStore',
    'storeWithStocksFromHub',
    'storeWithoutStocks',
  ],
};